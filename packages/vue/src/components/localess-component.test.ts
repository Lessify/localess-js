import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

import { setComponentsForTest } from '../core/state';
import { LocalessComponent } from './localess-component';

const Hero = defineComponent({
  props: ['data'],
  render() {
    return h('div', { class: 'hero' }, this.data._schema);
  },
});

describe('LocalessComponent', () => {
  it('renders the registered component for a schema and applies editable attrs', () => {
    setComponentsForTest({ hero: Hero });
    const wrapper = mount(LocalessComponent, {
      props: { data: { _id: 'abc', _schema: 'hero' } },
    });
    expect(wrapper.find('.hero').exists()).toBe(true);
    expect(wrapper.find('.hero').attributes('data-ll-id')).toBe('abc');
    expect(wrapper.find('.hero').attributes('data-ll-schema')).toBe('hero');
  });

  it('renders nothing and warns when the schema is unregistered and there is no fallback', () => {
    setComponentsForTest({});
    const wrapper = mount(LocalessComponent, {
      props: { data: { _id: 'abc', _schema: 'missing' } },
    });
    expect(wrapper.html()).toContain('could not find');
  });
});
