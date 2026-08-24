import type { LocalessClient } from '@localess/client';
import { inject } from 'vue';

import { LOCALESS_INJECTION_KEY } from '../plugin/localess-symbol';

export function useLocaless(): LocalessClient {
  const client = inject(LOCALESS_INJECTION_KEY);
  if (!client) {
    throw new Error('[Localess] useLocaless() called outside a component tree with the Localess plugin installed.');
  }
  return client;
}
