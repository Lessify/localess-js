import type { LocalessClient } from '@localess/client';
import type { InjectionKey } from 'vue';

export const LOCALESS_INJECTION_KEY: InjectionKey<LocalessClient> = Symbol('localess');
