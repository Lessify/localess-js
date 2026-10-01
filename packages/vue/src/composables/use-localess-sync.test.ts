import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import * as state from '../client';
import { useLocalessSync } from './use-localess-sync';

describe('useLocalessSync', () => {
  it('subscribes via localessSyncOn on mount', () => {
    const spy = vi.spyOn(state, 'localessSyncOn');
    const Comp = defineComponent({
      setup() {
        const event = useLocalessSync('input');
        return () => h('div', String(event.value));
      },
    });
    mount(Comp);
    expect(spy).toHaveBeenCalledWith('input', expect.any(Function));
  });

  it('removes the subscription when the component unmounts', () => {
    const unsubscribe = vi.fn();
    vi.spyOn(state, 'localessSyncOn').mockReturnValue(unsubscribe);
    const Comp = defineComponent({
      setup() {
        useLocalessSync('save');
        return () => h('div');
      },
    });

    mount(Comp).unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
