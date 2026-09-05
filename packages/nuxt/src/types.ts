import type { ComponentNamingStrategy } from '@localess/vue';

/**
 * Options for the `@localess/nuxt` module, set under the `localess` key in
 * `nuxt.config.ts`.
 *
 * The token is deliberately split across two options rather than one. Nuxt
 * feeds a single config object to both runtimes, so a single `token` would
 * have to be placed by guessing the rendering mode — and guessing wrong ships
 * a secret to the browser. See `docs/decisions/011-nuxt-module-depends-on-vue.md`.
 */
export interface ModuleOptions {
  /** Origin of the Localess instance, e.g. `https://my.localess.app`. */
  origin: string;
  /** Identifier of the space to read from. */
  spaceId: string;
  /**
   * **Public** token. Published content and translations only.
   *
   * Placed in `runtimeConfig.public.localess`, so it **is** part of the client
   * bundle and visible in the browser. Only ever put a token marked public in
   * Localess here. Omit it to disable client-side fetching entirely.
   */
  token?: string;
  /**
   * **Secret** token. Read by `useLocalessServerClient()` only.
   *
   * Placed in `runtimeConfig.localess`, which Nuxt never exposes to the client.
   * Required for draft/preview content, which a public token cannot read.
   */
  serverToken?: string;
  /**
   * Directory scanned for components rendered by `LocalessComponent`, relative
   * to the Nuxt app directory.
   *
   * Each file is registered under its filename verbatim (`Page.vue` -> `Page`)
   * and a kebab-cased alias (`page`). Lookup is by `data._schema`.
   *
   * @default '~/components/localess'
   */
  componentsDir?: string;
  /**
   * How a content `_schema` key is matched to a registered component. Applied to both the
   * registry keys (discovered filenames and `components` keys) and the incoming `_schema`,
   * so a schema named `hero-banner` can resolve `HeroBanner.vue`.
   *
   * Applied when the component registry is generated at build time, so nothing is added to
   * the Vue plugin's runtime options. Strategy names only, not a custom function.
   *
   * @default 'exact'
   */
  componentNaming?: ComponentNamingStrategy;
  /**
   * Explicit schema-key to component-path overrides, relative to
   * `componentsDir`. Suffix a path with `#ExportName` for a named export.
   * These win over auto-discovered entries on key collision.
   */
  components?: Record<string, string>;
  /**
   * Loads the Visual Editor sync script so edits in Localess Studio update the
   * running app. Only has an effect inside the Studio iframe.
   *
   * @default false
   */
  enableSync?: boolean;
  /**
   * Logs client requests and responses to the console.
   *
   * @default false
   */
  debug?: boolean;
  /**
   * Cache TTL in seconds for the server client, or `false` to disable caching.
   * Applies to `useLocalessServerClient()` only.
   */
  cacheTTL?: number | false;
}

/** The subset of {@link ModuleOptions} written to `runtimeConfig.public.localess`. */
export interface PublicModuleOptions {
  origin: string;
  spaceId: string;
  token?: string;
  enableSync: boolean;
  debug: boolean;
}

/** The subset of {@link ModuleOptions} written to `runtimeConfig.localess`. */
export interface PrivateModuleOptions {
  serverToken?: string;
  cacheTTL?: number | false;
}
