import { describe, expect, it } from 'vitest';

import * as pkg from './index';

describe('@localess/svelte public API', () => {
  it('exports the expected surface', () => {
    expect(pkg.localessInit).toBeDefined();
    expect(pkg.getLocaless).toBeDefined();
    expect(pkg.LocalessComponent).toBeDefined();
    expect(pkg.LocalessDocument).toBeDefined();
    expect(pkg.localessEditable).toBeDefined();
    expect(pkg.localessSync).toBeDefined();
    expect(pkg.LocalessRichText).toBeDefined();
    expect(pkg.LocalessApiError).toBeDefined();
    expect(pkg.sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(pkg.escapeAttr('"')).toBe('&quot;');
    expect(pkg.escapeHtml('<')).toBe('&lt;');
  });
});
