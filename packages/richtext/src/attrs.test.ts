import { describe, expect, it } from 'vitest';

import { processAttrs } from './attrs';

describe('processAttrs', () => {
  it('returns {} for undefined attrs and for heading (level is consumed by the tag)', () => {
    expect(processAttrs('paragraph', undefined)).toEqual({});
    expect(processAttrs('heading', { level: 2 })).toEqual({});
  });
  it('omits orderedList start when 1 or absent, emits otherwise', () => {
    expect(processAttrs('orderedList', { start: 1 })).toEqual({});
    expect(processAttrs('orderedList', {})).toEqual({});
    expect(processAttrs('orderedList', { start: 3 })).toEqual({ start: 3 });
  });
  it('maps codeBlock language to a language- class and omits null language', () => {
    expect(processAttrs('codeBlock', { language: 'js' })).toEqual({ class: 'language-js' });
    expect(processAttrs('codeBlock', { language: null })).toEqual({});
  });
  it('emits link attrs in target, rel, href, class order (TipTap parity) and drops null values', () => {
    const out = processAttrs('link', {
      href: 'https://x.com',
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
      class: null,
    });
    expect(Object.keys(out)).toEqual(['target', 'rel', 'href']);
    expect(out.href).toBe('https://x.com');
  });
  it('sanitizes link href, keeping the attribute as empty string when stripped', () => {
    expect(processAttrs('link', { href: 'javascript:alert(1)' })).toEqual({ href: '' });
  });
  it('applies the attrMap renames', () => {
    expect(processAttrs('codeBlock', { language: 'ts' }, { attrMap: { class: 'className' } })).toEqual({
      className: 'language-ts',
    });
  });
});
