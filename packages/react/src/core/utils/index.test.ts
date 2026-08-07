import { describe, expect, it } from 'vitest';

import { findLink } from './index';

describe('core/utils re-exports', () => {
  it('findLink is exported as a callable function, not erased as a type-only export', () => {
    expect(typeof findLink).toBe('function');
  });
});
