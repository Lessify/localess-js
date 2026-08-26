import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import { setComponentsForTest } from '../client';
import LocalessComponent from './localess-component.vue';

const Hero = defineComponent({
  props: ['data'],
  render() {
    return h('div', { class: 'hero' }, this.data._schema);
  },
});

const PropsProbe = defineComponent({
  props: ['data', 'assets', 'links', 'references'],
  render() {
    return h('div', { class: 'probe' }, [
      h('span', { class: 'assets-keys' }, Object.keys(this.assets ?? {}).join(',')),
      h('span', { class: 'links-keys' }, Object.keys(this.links ?? {}).join(',')),
      h('span', { class: 'references-keys' }, Object.keys(this.references ?? {}).join(',')),
    ]);
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

  it('forwards assets, links, and references to the registered component', () => {
    setComponentsForTest({ probe: PropsProbe });
    const wrapper = mount(LocalessComponent, {
      props: {
        data: { _id: 'abc', _schema: 'probe' },
        assets: { a1: { uri: 'x' } as any },
        links: { l1: { name: 'Home' } as any },
        references: { r1: { _id: 'r1', _schema: 'page', data: { _schema: 'page' } } as any },
      },
    });
    expect(wrapper.find('.assets-keys').text()).toBe('a1');
    expect(wrapper.find('.links-keys').text()).toBe('l1');
    expect(wrapper.find('.references-keys').text()).toBe('r1');
  });

  it('renders nothing and warns when the schema is unregistered and there is no fallback', () => {
    setComponentsForTest({});
    const wrapper = mount(LocalessComponent, {
      props: { data: { _id: 'abc', _schema: 'missing' } },
    });
    expect(wrapper.html()).toContain('could not find');
  });
});
