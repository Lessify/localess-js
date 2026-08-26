import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import { getComponent, getFallbackComponent, isSyncEnabled, localessInit, localessSyncOn } from './client';

const HelloComponent = defineComponent({ render: () => h('div', 'hello') });

describe('state', () => {
  it('localessInit registers components and returns a client', () => {
    const client = localessInit({
      origin: 'https://example.com',
      spaceId: 'space-1',
      token: 'public-token',
      components: { hero: HelloComponent },
    });
    expect(client).toBeDefined();
    expect(getComponent('hero')).toBe(HelloComponent);
    expect(getComponent('missing')).toBeUndefined();
  });

  it('localessInit registers a fallback component', () => {
    localessInit({
      origin: 'https://example.com',
      spaceId: 'space-1',
      token: 'public-token',
      fallbackComponent: HelloComponent,
    });
    expect(getFallbackComponent()).toBe(HelloComponent);
  });

  it('isSyncEnabled is false when enableSync was not passed', () => {
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token' });
    expect(isSyncEnabled()).toBe(false);
  });

  it('localessSyncOn is a no-op when sync is disabled', () => {
    localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token' });
    const callback = vi.fn();
    localessSyncOn('input', callback);
    expect(callback).not.toHaveBeenCalled();
  });
});
