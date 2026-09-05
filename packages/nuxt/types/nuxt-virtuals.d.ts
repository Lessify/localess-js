/**
 * Typecheck-only shims for the Nuxt virtual modules that `src/runtime/**`
 * imports. They resolve inside a real Nuxt app but not to a standalone `tsc`,
 * which would otherwise report the runtime files as unresolvable.
 *
 * Deliberately outside `src/` so `@nuxt/module-builder` never sees them and
 * they cannot reach `dist/` and shadow Nuxt's own types in a consumer app.
 * `#build/localess-components.mjs` is *not* shimmed — it is generated per app
 * at build time, so its import carries a `@ts-expect-error` instead.
 */
declare module '#app' {
  export function defineNuxtPlugin<T>(plugin: T): T;
  export function useRuntimeConfig(): { public: Record<string, unknown> } & Record<string, unknown>;
}

declare module '#imports' {
  export function useRuntimeConfig(): { public: Record<string, unknown> } & Record<string, unknown>;
}
