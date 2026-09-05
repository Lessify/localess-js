import type { AstroIntegration } from 'astro';

import { localessLogo } from '../dev-toolbar/localess-logo';
import type { LocalessClientOptions } from '../models';
import type { LocalessOptions } from '../models';
import { vitePluginImportLocalessComponents } from '../vite-plugins/vite-plugin-import-localess-components';
import { vitePluginLocalessInit } from '../vite-plugins/vite-plugin-localess-init';
import { vitePluginLocalessOptions } from '../vite-plugins/vite-plugin-localess-options';

const RELOAD_DEBOUNCE_MS = 500;

/**
 * The `localess()` Astro integration. Add it to `astro.config.mjs`'s `integrations` array
 * to configure `@localess/astro` — replaces the old `localessInit()` frontmatter call.
 *
 * @example
 * ```js
 * // astro.config.mjs
 * import { defineConfig } from 'astro/config';
 * import { localess } from '@localess/astro';
 *
 * export default defineConfig({
 *   integrations: [localess({
 *     origin: process.env.LOCALESS_ORIGIN,
 *     spaceId: process.env.LOCALESS_SPACE_ID,
 *     token: process.env.LOCALESS_TOKEN,
 *     enableSync: true,
 *   })],
 * });
 * ```
 */
export function localessIntegration(options: LocalessOptions): AstroIntegration {
  const resolvedOptions: Required<
    Pick<LocalessOptions, 'componentsDir' | 'componentNaming' | 'enableFallbackComponent' | 'enableSync' | 'livePreview'>
  > &
    LocalessOptions = {
    componentsDir: 'src',
    componentNaming: 'exact',
    enableFallbackComponent: false,
    enableSync: false,
    livePreview: false,
    ...options,
  };

  const {
    origin,
    spaceId,
    token,
    version,
    debug,
    cacheTTL,
    timeoutMs,
    retry,
    fetchInit,
    componentsDir,
    components,
    enableFallbackComponent,
    customFallbackComponent,
    componentNaming,
    enableSync,
    livePreview,
  } = resolvedOptions;

  // Serialized into the generated `virtual:localess-init` module, so every field here must survive
  // `JSON.stringify`. That is why `fetch` is not forwarded — see `LocalessOptions`.
  const clientOptions: LocalessClientOptions = { origin, spaceId, token, version, debug, cacheTTL, timeoutMs, retry, fetchInit };

  return {
    name: '@localess/astro',
    hooks: {
      'astro:config:setup': ({ updateConfig, injectScript, addDevToolbarApp, addMiddleware, config }) => {
        updateConfig({
          vite: {
            plugins: [
              vitePluginLocalessInit(clientOptions),
              // Narrow object, not the full resolvedOptions, so `token` never ends up inside
              // virtual:localess-options. componentsDir is read by LocalessComponent.astro's
              // error message; spaceId (not a secret) is read by the live-preview middleware,
              // which can't use import.meta.env — that gets inlined at this package's own
              // build time, not the consumer's, since @localess/astro ships pre-built code.
              vitePluginLocalessOptions({ componentsDir, spaceId, componentNaming }),
              vitePluginImportLocalessComponents(
                components || {},
                componentsDir,
                enableFallbackComponent,
                customFallbackComponent,
                componentNaming
              ),
            ],
          },
        });

        if (livePreview && config?.output !== 'server') {
          throw new Error(
            'To use @localess/astro\'s livePreview feature, Astro must be configured with `output: "server"`. Disable livePreview or switch to SSR mode.'
          );
        }

        injectScript(
          'page-ssr',
          `
            import { localessClientInstance } from "virtual:localess-init";
            globalThis.localessClientInstance = localessClientInstance;
          `
        );

        if (livePreview) {
          injectScript(
            'page',
            `
              import { loadLocalessSync, handleLocalessMessage } from "@localess/astro";
              window.__localessSpaceId = ${JSON.stringify(spaceId)};
              loadLocalessSync(${JSON.stringify(origin)}).then(() => {
                window.localess?.on(['save', 'publish', 'unpublish', 'input', 'change'], handleLocalessMessage);
              });
            `
          );
          addMiddleware({ entrypoint: '@localess/astro/middleware', order: 'pre' });
        } else if (enableSync) {
          injectScript(
            'page',
            `
              import { loadLocalessSync } from "@localess/astro";
              let reloadTimeout;
              loadLocalessSync(${JSON.stringify(origin)}).then(() => {
                window.localess?.onChange(() => {
                  clearTimeout(reloadTimeout);
                  reloadTimeout = setTimeout(() => window.location.reload(), ${RELOAD_DEBOUNCE_MS});
                });
              });
            `
          );
        }

        addDevToolbarApp({
          id: 'localess',
          name: 'Localess',
          icon: localessLogo,
          entrypoint: '@localess/astro/toolbarApp',
        });
      },
    },
  };
}

export { localessIntegration as localess };
