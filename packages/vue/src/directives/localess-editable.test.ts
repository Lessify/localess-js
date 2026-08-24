import { describe, expect, it } from 'vitest';

import { vLocalessEditable } from './localess-editable';

describe('vLocalessEditable', () => {
  it('applies data-ll-id and data-ll-schema attributes on mount', () => {
    const el = document.createElement('div');
    vLocalessEditable.mounted!(el, { value: { _id: 'abc', _schema: 'hero' } } as any, {} as any, null as any);
    expect(el.getAttribute('data-ll-id')).toBe('abc');
    expect(el.getAttribute('data-ll-schema')).toBe('hero');
  });

  it('updates attributes on update', () => {
    const el = document.createElement('div');
    vLocalessEditable.mounted!(el, { value: { _id: 'abc', _schema: 'hero' } } as any, {} as any, null as any);
    vLocalessEditable.updated!(el, { value: { _id: 'xyz', _schema: 'button' } } as any, {} as any, null as any);
    expect(el.getAttribute('data-ll-id')).toBe('xyz');
    expect(el.getAttribute('data-ll-schema')).toBe('button');
  });
});
