import { describe, expect, it } from 'vitest';

import { FONT_BOLD, FONT_NORMAL } from './console';

describe('console', () => {
  it('exports FONT_BOLD and FONT_NORMAL as CSS font-weight strings', () => {
    expect(FONT_BOLD).toBe('font-weight: bold');
    expect(FONT_NORMAL).toBe('font-weight: normal');
  });
});
