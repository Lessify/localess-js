import type { LocalessClient } from '@localess/vue';
import { localessClient } from '@localess/vue';

import { useRuntimeConfig } from '#imports';

import type { PrivateModuleOptions, PublicModuleOptions } from '../../types';

let client: LocalessClient | undefined = undefined;

/**
 * Returns a Localess client authenticated with the **secret** `serverToken`.
 *
 * Only callable from server code — Nitro routes, server-side `useAsyncData`,
 * and `server/` utilities. The token lives in `runtimeConfig.localess`, which
 * Nuxt never exposes to the client, so this is the only way to read draft or
 * unpublished content in a Nuxt app.
 *
 * The client is memoised for the lifetime of the server process, so its
 * in-memory cache is shared across requests. That is safe because every caller
 * uses the same token and therefore has identical permissions.
 *
 * @throws If called in the browser, or if `serverToken` is not configured.
 */
export function useLocalessServerClient(): LocalessClient {
  if (typeof window !== 'undefined') {
    throw new Error(
      '[@localess/nuxt] useLocalessServerClient() was called in the browser. It reads the secret `serverToken`, so it must only run on the server — move this call into a Nitro route, a `server/` utility, or a server-only branch. For client-side reads use useLocaless().'
    );
  }

  if (client) return client;

  const config = useRuntimeConfig();
  const { serverToken, cacheTTL } = (config.localess ?? {}) as PrivateModuleOptions;
  const { origin, spaceId, debug } = (config.public.localess ?? {}) as PublicModuleOptions;

  if (!serverToken) {
    throw new Error(
      '[@localess/nuxt] No `serverToken` configured. Set `localess.serverToken` in nuxt.config.ts (typically from process.env.LOCALESS_TOKEN) to use useLocalessServerClient().'
    );
  }

  // Nuxt replaces `undefined` in runtimeConfig with `''` so the value stays
  // overridable by an env var, so an unset cacheTTL arrives as an empty string.
  const ttl = typeof cacheTTL === 'number' || cacheTTL === false ? cacheTTL : undefined;

  client = localessClient({ origin, spaceId, token: serverToken, debug, cacheTTL: ttl });
  return client;
}

/** @internal test-only helper to reset the memoised client between test cases. */
export function resetServerClientForTest(): void {
  client = undefined;
}
