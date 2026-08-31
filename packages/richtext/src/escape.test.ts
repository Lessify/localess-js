import { describe, expect, it } from 'vitest';

import { escapeAttr, escapeHtml, sanitizeUrl } from './escape';

describe('escapeHtml', () => {
  it('escapes &, <, > in text', () => {
    expect(escapeHtml('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });
  it('leaves plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('escapeAttr', () => {
  it('escapes &, ", <, > in attribute values', () => {
    expect(escapeAttr('a"b&c<d>e')).toBe('a&quot;b&amp;c&lt;d&gt;e');
  });
});

describe('sanitizeUrl', () => {
  it('allows http, https, mailto, tel', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    expect(sanitizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(sanitizeUrl('tel:+123')).toBe('tel:+123');
  });
  it('allows scheme-less URLs (relative, protocol-relative, fragment, query)', () => {
    expect(sanitizeUrl('/path/page')).toBe('/path/page');
    expect(sanitizeUrl('//cdn.example.com/x')).toBe('//cdn.example.com/x');
    expect(sanitizeUrl('#section')).toBe('#section');
    expect(sanitizeUrl('?q=1')).toBe('?q=1');
  });
  it('strips dangerous schemes to empty string', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>')).toBe('');
    expect(sanitizeUrl('vbscript:x')).toBe('');
    expect(sanitizeUrl('  javascript:alert(1)')).toBe('');
  });
  it('returns empty string for empty input', () => {
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeUrl('   ')).toBe('');
  });
});
