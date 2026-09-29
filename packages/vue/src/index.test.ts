import { describe, expect, it } from 'vitest';

import * as pkg from './index';

describe('@localess/vue public API', () => {
  it('exports the expected surface', () => {
    expect(pkg.Localess).toBeDefined();
    expect(pkg.LocalessComponent).toBeDefined();
    expect(pkg.localessEditable).toBeDefined();
    expect(pkg.localessEditableField).toBeDefined();
    expect(pkg.useLocaless).toBeDefined();
    expect(pkg.useLocalessSync).toBeDefined();
    expect(pkg.useLocalessRichText).toBeDefined();
    expect(pkg.LocalessApiError).toBeDefined();
    expect(pkg.sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(pkg.escapeAttr('"')).toBe('&quot;');
    expect(pkg.escapeHtml('<')).toBe('&lt;');
  });
});
