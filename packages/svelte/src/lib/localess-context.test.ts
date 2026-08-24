import { describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';

import Harness from './__fixtures__/context-harness.svelte';

describe('localess-context', () => {
  it('sets and retrieves the client via context', () => {
    let capturedClient: unknown;
    const target = document.createElement('div');
    const instance = mount(Harness, {
      target,
      props: {
        onReady: (client: unknown) => {
          capturedClient = client;
        },
      },
    });
    flushSync();
    expect(capturedClient).toBeDefined();
    unmount(instance);
  });
});
