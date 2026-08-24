import { getContext, setContext } from 'svelte';

import { localessInit as coreLocalessInit, type LocalessSvelteInitOptions } from './core/state';
import type { LocalessClient } from './models';

const LOCALESS_CONTEXT_KEY = Symbol('localess');

/**
 * Initializes the Localess client and registers it in Svelte context.
 *
 * Must be called synchronously during a component's initialization — typically
 * the top of a root `+layout.svelte`'s `<script>` block — since Svelte's
 * `setContext` only works during that phase.
 */
export function localessInit(options: LocalessSvelteInitOptions): LocalessClient {
  const client = coreLocalessInit(options);
  setContext(LOCALESS_CONTEXT_KEY, client);
  return client;
}

export function getLocaless(): LocalessClient {
  const client = getContext<LocalessClient | undefined>(LOCALESS_CONTEXT_KEY);
  if (!client) {
    throw new Error('[Localess] getLocaless() called outside a component tree where localessInit() ran.');
  }
  return client;
}
