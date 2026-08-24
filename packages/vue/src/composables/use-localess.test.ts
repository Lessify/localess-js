import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import { Localess } from '../plugin/localess-plugin';
import { useLocaless } from './use-localess';

describe('useLocaless', () => {
  it('returns the injected client', () => {
    let client: unknown;
    const Comp = defineComponent({
      setup() {
        client = useLocaless();
        return () => h('div');
      },
    });
    mount(Comp, {
      global: {
        plugins: [[Localess, { origin: 'https://example.com', spaceId: 'space-1', token: 'public-token' }]],
      },
    });
    expect(client).toBeDefined();
  });

  it('throws when used outside a Localess-installed app', () => {
    const Comp = defineComponent({
      setup() {
        useLocaless();
        return () => h('div');
      },
    });
    expect(() => mount(Comp)).toThrow('[Localess]');
  });
});
