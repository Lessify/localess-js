import { flushSync, mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';

import Harness from './__fixtures__/context-harness.svelte';
import GetLocalessOutsideContextHarness from './__fixtures__/get-localess-outside-context-harness.svelte';

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

  it('getLocaless() throws when called outside a component tree where localessInit() ran', () => {
    let capturedError: unknown;
    const target = document.createElement('div');
    const instance = mount(GetLocalessOutsideContextHarness, {
      target,
      props: {
        onError: (error: unknown) => {
          capturedError = error;
        },
      },
    });
    flushSync();
    expect(capturedError).toBeInstanceOf(Error);
    expect((capturedError as Error).message).toContain('getLocaless() called outside a component tree');
    unmount(instance);
  });
});
