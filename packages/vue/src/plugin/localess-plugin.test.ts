import { describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, inject } from 'vue';

import { getLocalessClient } from '../core/state';
import { Localess } from './localess-plugin';
import { LOCALESS_INJECTION_KEY } from './localess-symbol';

describe('Localess plugin', () => {
  it('provides the client via app.use and registers it in core state', () => {
    let injected: unknown;
    const Root = defineComponent({
      setup() {
        injected = inject(LOCALESS_INJECTION_KEY);
        return () => h('div');
      },
    });

    const app = createApp(Root);
    app.use(Localess, { origin: 'https://example.com', spaceId: 'space-1', token: 'public-token' });
    const el = document.createElement('div');
    app.mount(el);

    expect(injected).toBeDefined();
    expect(injected).toBe(getLocalessClient());
  });
});
