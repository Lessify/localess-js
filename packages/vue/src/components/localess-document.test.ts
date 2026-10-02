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
      props: { document: { id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any },
    });

    expect(wrapper.text()).toContain('Hello');
  });

  it('re-renders with the new content when the document prop changes (e.g. client-side navigation to a new slug)', async () => {
    setComponentsForTest({ page: TitleProbe });

    const wrapper = mount(LocalessDocument, {
      props: { document: { id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Home' } } as any },
    });
    expect(wrapper.text()).toContain('Home');

    await wrapper.setProps({ document: { id: 'c2', _schema: 'page', data: { _schema: 'page', title: 'About' } } as any });

    expect(wrapper.text()).toContain('About');
  });

  it('re-renders with the edits of its own document', async () => {
    setComponentsForTest({ page: TitleProbe });
    const spy = vi.spyOn(client, 'localessSyncOnDocument');

    const wrapper = mount(LocalessDocument, {
      props: { document: { id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any },
    });
    expect(wrapper.text()).toContain('Hello');

    // Subscribed to its own document only; filtering by id is covered by the sync controller's tests.
    const [documentId, callback] = spy.mock.calls[0];
    expect(documentId).toBe('c1');
    callback({ _schema: 'page', title: 'Updated' } as any, {} as any);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Updated');
  });

  it('subscribes again when the document prop changes', async () => {
    setComponentsForTest({ page: TitleProbe });
    const unsubscribe = vi.fn();
    const spy = vi.spyOn(client, 'localessSyncOnDocument').mockReturnValue(unsubscribe);

    const wrapper = mount(LocalessDocument, {
      props: { document: { id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Home' } } as any },
    });
    await wrapper.setProps({ document: { id: 'c2', _schema: 'page', data: { _schema: 'page', title: 'About' } } as any });

    expect(spy.mock.calls.map(([id]) => id)).toEqual(['c1', 'c2']);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('removes its sync subscription on unmount', () => {
    setComponentsForTest({ page: TitleProbe });
    const unsubscribe = vi.fn();
    vi.spyOn(client, 'localessSyncOnDocument').mockReturnValue(unsubscribe);

    const wrapper = mount(LocalessDocument, {
      props: { document: { id: 'c1', _schema: 'page', data: { _schema: 'page', title: 'Hello' } } as any },
    });
    wrapper.unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('renders an inline error when document.data is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const wrapper = mount(LocalessDocument, {
      props: { document: { id: 'c1', _schema: 'page' } as any },
    });

    expect(wrapper.text()).toContain('document.data');
  });
});
