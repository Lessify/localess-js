import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import type { ComponentNamingStrategy } from '@localess/vue';
import {
  addComponent,
  addDevServerHandler,
  addImports,
  addPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
  updateTemplates,
} from '@nuxt/kit';
import { defineEventHandler } from 'h3';

import { buildDevtoolsPayload, renderDevtoolsPage } from './devtools';
import type { ModuleOptions, PrivateModuleOptions, PublicModuleOptions } from './types';

export type { ModuleOptions, PrivateModuleOptions, PublicModuleOptions } from './types';

const COMPONENTS_TEMPLATE = 'localess-components.mjs';
const DEVTOOLS_ROUTE = '/__localess';

/** Composables re-exported from `@localess/vue` so Nuxt auto-imports them. */
const AUTO_IMPORTED_COMPOSABLES = [
  'useLocaless',
  'useLocalessSync',
  'useLocalessRichText',
  'useLocalessRichTextHtml',
  'renderRichText',
  'renderRichTextToHtml',
  'localessEditable',
  'localessEditableField',
];

/** Components re-exported from `@localess/vue` so Nuxt auto-registers them. */
const AUTO_REGISTERED_COMPONENTS = ['LocalessDocument', 'LocalessComponent', 'LocalessRichText'];

/**
 * Expands a leading `~/` to Nuxt's app directory.
 *
 * The `~` alias may or may not carry a trailing separator depending on Nuxt
 * version, so it is trimmed before joining — otherwise the resolved path picks
 * up a double slash, which still reads from disk but shows up in error messages
 * and the DevTools panel.
 */
export function resolveComponentsDir(componentsDir: string | undefined, appAlias: string | undefined): string {
  const dir = componentsDir ?? '~/components/localess';
  if (!appAlias || !dir.startsWith('~/')) return dir;
  return `${appAlias.replace(/[/\\]+$/, '')}/${dir.slice(2)}`;
}

async function findVueFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => []);
  return entries.filter(entry => entry.isFile() && entry.name.endsWith('.vue')).map(entry => join(entry.parentPath ?? dir, entry.name));
}

/**
 * Builds the registry module source: one static import per discovered component,
 * keyed by its filename verbatim, then explicit overrides last so they win on
 * collision. Matching that key to `data._schema` is `componentNaming`'s job at
 * lookup time, not this function's.
 *
 * Static imports rather than `import.meta.glob` because the glob pattern the
 * `@localess/vue/vite` plugin emits is resolved relative to the Vite root, which
 * differs between Nuxt's client and Nitro builds and cannot express a Windows
 * absolute path.
 */
export function generateComponentsTemplate(
  files: string[],
  overrides: Array<{ key: string; importPath: string; exportName?: string }>,
  componentNaming: ComponentNamingStrategy = 'exact'
): string {
  const lines: string[] = [];
  const assignments: string[] = [];

  files.forEach((file, index) => {
    const baseName = file
      .split(/[\\/]/)
      .pop()!
      .replace(/\.vue$/, '');
    const specifier = file.split(sep).join('/');
    lines.push(`import __component_${index}__ from ${JSON.stringify(specifier)};`);
    assignments.push(
      `if (!Object.hasOwn(__localessRegistry__, ${JSON.stringify(baseName)})) __localessRegistry__[${JSON.stringify(baseName)}] = __component_${index}__;`
    );
  });

  overrides.forEach((override, index) => {
    const specifier = override.importPath.split(sep).join('/');
    lines.push(
      override.exportName
        ? `import { ${override.exportName} as __override_${index}__ } from ${JSON.stringify(specifier)};`
        : `import __override_${index}__ from ${JSON.stringify(specifier)};`
    );
    assignments.push(`__localessRegistry__[${JSON.stringify(override.key)}] = __override_${index}__;`);
  });

  if (componentNaming !== 'exact') {
    lines.unshift(`import { normalizeComponentKey } from '@localess/vue';`);
  }

  const resolver =
    componentNaming === 'exact'
      ? ['const localessComponents = __localessRegistry__;']
      : [
          `const __naming__ = ${JSON.stringify(componentNaming)};`,
          'const __index__ = new Map(',
          '  Object.entries(__localessRegistry__).map(([key, component]) => [normalizeComponentKey(key, __naming__), component])',
          ');',
          'const localessComponents = new Proxy(__localessRegistry__, {',
          '  get: (target, key) => (typeof key === "string" ? __index__.get(normalizeComponentKey(key, __naming__)) : target[key]),',
          '  has: (target, key) => (typeof key === "string" ? __index__.has(normalizeComponentKey(key, __naming__)) : key in target),',
          '  ownKeys: () => Array.from(__index__.keys()),',
          // Key-aware because `Object.hasOwn` — how the registry is probed — consults this trap.
          '  getOwnPropertyDescriptor: (target, key) => {',
          '    if (typeof key !== "string") return Object.getOwnPropertyDescriptor(target, key);',
          '    const normalized = normalizeComponentKey(key, __naming__);',
          '    return __index__.has(normalized) ? { value: __index__.get(normalized), enumerable: true, configurable: true, writable: true } : undefined;',
          '  },',
          '});',
        ];

  return [...lines, '', 'const __localessRegistry__ = {};', ...assignments, '', ...resolver, '', 'export { localessComponents };', ''].join(
    '\n'
  );
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@localess/nuxt',
    configKey: 'localess',
    compatibility: { nuxt: '>=4.0.0' },
  },
  defaults: {
    origin: '',
    spaceId: '',
    componentsDir: '~/components/localess',
    componentNaming: 'exact',
    components: {},
    enableSync: false,
    debug: false,
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    if (!options.origin || !options.spaceId) {
      throw new Error('[@localess/nuxt] `origin` and `spaceId` are required. Set them under the `localess` key in nuxt.config.ts.');
    }
    if (!options.token && !options.serverToken) {
      throw new Error('[@localess/nuxt] Set at least one of `token` (public, client-side) or `serverToken` (secret, server-side).');
    }
    if (!options.token) {
      console.warn(
        '[@localess/nuxt] No `token` set, so client-side fetching is disabled — `useLocaless()` will throw in the browser. Content must be fetched server-side with `useLocalessServerClient()`.'
      );
    }

    const publicOptions: PublicModuleOptions = {
      origin: options.origin,
      spaceId: options.spaceId,
      token: options.token,
      enableSync: options.enableSync ?? false,
      debug: options.debug ?? false,
    };
    const privateOptions: PrivateModuleOptions = {
      serverToken: options.serverToken,
      cacheTTL: options.cacheTTL,
    };

    nuxt.options.runtimeConfig.public.localess = publicOptions;
    nuxt.options.runtimeConfig.localess = privateOptions;

    nuxt.options.build.transpile.push(resolver.resolve('./runtime'), '@localess/vue');
    nuxt.options.vite.optimizeDeps ||= {};
    nuxt.options.vite.optimizeDeps.include ||= [];
    nuxt.options.vite.optimizeDeps.include.push('@localess/vue');

    const componentsDir = resolveComponentsDir(options.componentsDir, nuxt.options.alias['~']);

    addTemplate({
      filename: COMPONENTS_TEMPLATE,
      write: true,
      getContents: async () => {
        const files = (await findVueFiles(componentsDir)).sort();
        const overrides = Object.entries(options.components ?? {}).map(([key, rawPath]) => {
          const [relativePath, exportName] = rawPath.split('#');
          return { key, importPath: join(componentsDir, relativePath), exportName };
        });
        return generateComponentsTemplate(files, overrides, options.componentNaming ?? 'exact');
      },
    });

    nuxt.hook('builder:watch', async (_event, path) => {
      if (!path.endsWith('.vue')) return;
      const absolute = join(nuxt.options.rootDir, path);
      if (relative(componentsDir, absolute).startsWith('..')) return;
      await updateTemplates({ filter: template => template.filename === COMPONENTS_TEMPLATE });
    });

    addPlugin(resolver.resolve('./runtime/plugin'));

    for (const name of AUTO_IMPORTED_COMPOSABLES) {
      addImports({ name, as: name, from: '@localess/vue' });
    }
    for (const name of AUTO_REGISTERED_COMPONENTS) {
      addComponent({ name, export: name, filePath: '@localess/vue' });
    }

    // The alias has to be registered in both graphs: `nuxt.options.alias` covers
    // the app build, the `nitro:config` hook covers the server build. Nitro's
    // hooks are not in `NuxtHooks` unless nitropack's augmentation is loaded,
    // hence the narrowed cast rather than a bare `any`.
    const serverPath = resolver.resolve('./runtime/server/index');
    // Neither `nitro:config` nor `devtools:customTabs` is in `NuxtHooks` unless
    // nitropack's / devtools' augmentation is loaded, hence the narrowed casts.
    const nitroHook = nuxt.hook as (name: string, callback: (config: { alias?: Record<string, string> }) => void) => void;
    const devtoolsHook = nuxt.hook as (name: string, callback: (tabs: unknown[]) => void) => void;

    nuxt.options.alias['#localess/server'] = serverPath;
    nitroHook('nitro:config', nitroConfig => {
      nitroConfig.alias ||= {};
      nitroConfig.alias['#localess/server'] = serverPath;
    });

    if (nuxt.options.dev && options.devtools !== false) {
      // Re-scanned per request rather than captured once, so the panel reflects
      // components added or removed while the dev server is running.
      addDevServerHandler({
        route: DEVTOOLS_ROUTE,
        handler: defineEventHandler(async () =>
          renderDevtoolsPage(
            buildDevtoolsPayload({
              origin: options.origin,
              spaceId: options.spaceId,
              token: options.token,
              serverToken: options.serverToken,
              componentNaming: options.componentNaming ?? 'exact',
              componentsDir,
              files: (await findVueFiles(componentsDir)).sort(),
              overrides: options.components ?? {},
            })
          )
        ),
      });

      devtoolsHook('devtools:customTabs', (tabs: unknown[]) => {
        tabs.push({
          name: 'localess',
          title: 'Localess',
          icon: 'carbon:document-multiple-01',
          view: { type: 'iframe', src: DEVTOOLS_ROUTE },
        });
      });
    }
  },
});
