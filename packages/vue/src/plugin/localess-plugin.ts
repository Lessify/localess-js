import type { App, Plugin } from 'vue';

import { localessInit, type LocalessVueInitOptions } from '../core/state';
import { LOCALESS_INJECTION_KEY } from './localess-symbol';

export const Localess: Plugin<LocalessVueInitOptions> = {
  install(app: App, options: LocalessVueInitOptions) {
    const client = localessInit(options);
    app.provide(LOCALESS_INJECTION_KEY, client);
  },
};
