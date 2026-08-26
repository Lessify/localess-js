import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import * as client from '../client';
import { setComponentsForTest } from '../client';
import LocalessDocument from './localess-document.vue';

const TitleProbe = defineComponent({
  props: ['data'],
  render() {
    return h('h1', this.data.title);
  },
});

describe('LocalessDocument', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the registered component using document.data', () => {
    setComponentsForTest({ page: TitleProbe });

    const wrapper = mount(LocalessDocument, {
      props: { document: { _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any },
    });

    expect(wrapper.text()).toContain('Hello');
  });

  it('re-renders with the new content when the document prop changes (e.g. client-side navigation to a new slug)', async () => {
    setComponentsForTest({ page: TitleProbe });

    const wrapper = mount(LocalessDocument, {
      props: { document: { _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Home' } } as any },
    });
    expect(wrapper.text()).toContain('Home');

    await wrapper.setProps({ document: { _id: 'c2', _schema: 'page', data: { _schema: 'page', title: 'About' } } as any });

    expect(wrapper.text()).toContain('About');
  });

  it('re-renders with updated content when the sync subscription fires an input/change event', async () => {
    setComponentsForTest({ page: TitleProbe });
    const spy = vi.spyOn(client, 'localessSyncOnChange');

    const wrapper = mount(LocalessDocument, {
      props: { document: { _id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any },
    });
    expect(wrapper.text()).toContain('Hello');

    const [callback] = spy.mock.calls[0];
    callback({ type: 'change', data: { _schema: 'page', title: 'Updated' } } as any);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Updated');
  });

  it('renders an inline error when document.data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const wrapper = mount(LocalessDocument, {
      props: { document: { _id: 'c1', _schema: 'page' } as any },
    });

    expect(wrapper.text()).toContain('document.data');
  });
});
