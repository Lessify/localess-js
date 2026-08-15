import { describe, expect, it } from 'vitest';

import { setComponents, setFallbackComponent } from './index';

describe('@localess/react/ssr index', () => {
  it('exports setComponents and setFallbackComponent (registry-only, no sync dependency)', () => {
    expect(typeof setComponents).toBe('function');
    expect(typeof setFallbackComponent).toBe('function');
  });
});
