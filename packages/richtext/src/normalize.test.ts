import { describe, expect, it } from 'vitest';

import type { LocalessRichTextNode } from './model';
import { normalizeInput } from './normalize';

const para: LocalessRichTextNode = { type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] };

describe('normalizeInput', () => {
  it('returns [] for null, undefined, and shapeless objects', () => {
    expect(normalizeInput(null)).toEqual([]);
    expect(normalizeInput(undefined)).toEqual([]);
    expect(normalizeInput({} as any)).toEqual([]);
  });
  it('unwraps a doc to its content', () => {
    expect(normalizeInput({ type: 'doc', content: [para] })).toEqual([para]);
  });
  it('returns [] for a doc without content', () => {
    expect(normalizeInput({ type: 'doc' })).toEqual([]);
  });
  it('wraps a single node in an array', () => {
    expect(normalizeInput(para)).toEqual([para]);
  });
  it('passes an array through', () => {
    expect(normalizeInput([para, para])).toEqual([para, para]);
  });
  it('injects recursive per-type counter keys when withKeys is true', () => {
    const nodes = normalizeInput({ type: 'doc', content: [para, para] }, { withKeys: true }) as any[];
    expect(nodes[0]._key).toBe('paragraph-1');
    expect(nodes[1]._key).toBe('paragraph-2');
    expect(nodes[0].content[0]._key).toBe('text-1');
    expect(nodes[1].content[0]._key).toBe('text-2');
  });
  it('does not mutate the input when injecting keys', () => {
    const doc = { type: 'doc', content: [structuredClone(para)] } as any;
    normalizeInput(doc, { withKeys: true });
    expect(doc.content[0]._key).toBeUndefined();
  });
});
