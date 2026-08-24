import type { InjectionKey } from 'vue';

import type { LocalessClient } from '../core/models';

export const LOCALESS_INJECTION_KEY: InjectionKey<LocalessClient> = Symbol('localess');
