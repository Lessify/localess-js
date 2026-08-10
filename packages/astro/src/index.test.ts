import { describe, expect, it } from 'vitest';

import { isBrowser, isIframe, localessEditable, localessInit } from './index';

describe('index barrel', () => {
  it('re-exports localessInit as a callable function', () => {
    expect(typeof localessInit).toBe('function');
  });

  it('re-exports isBrowser/isIframe/localessEditable as callable functions, not erased as type-only exports', () => {
    expect(typeof isBrowser).toBe('function');
    expect(typeof isIframe).toBe('function');
    expect(typeof localessEditable).toBe('function');
  });
});
