import { describe, expect, it } from 'vitest';

import { isBrowser, isIframe, localess, LocalessApiError, localessEditable, localessIntegration, toCamelCase } from './index';

describe('index barrel', () => {
  it('re-exports the localess integration factory under both names', () => {
    expect(typeof localess).toBe('function');
    expect(typeof localessIntegration).toBe('function');
    expect(localess).toBe(localessIntegration);
  });

  it('re-exports isBrowser/isIframe/localessEditable/toCamelCase as callable functions, not erased as type-only exports', () => {
    expect(typeof isBrowser).toBe('function');
    expect(typeof isIframe).toBe('function');
    expect(typeof localessEditable).toBe('function');
    expect(typeof toCamelCase).toBe('function');
  });

  it('re-exports LocalessApiError as a constructible class, not erased as a type-only export', () => {
    expect(typeof LocalessApiError).toBe('function');
    expect(new LocalessApiError(404, 'Not Found', 'https://example.com', undefined, 'hint')).toBeInstanceOf(Error);
  });

  it('no longer exports the removed plain-library API', async () => {
    const barrel = await import('./index');
    expect((barrel as any).localessInit).toBeUndefined();
    expect((barrel as any).registerComponent).toBeUndefined();
    expect((barrel as any).setComponents).toBeUndefined();
    expect((barrel as any).setFallbackComponent).toBeUndefined();
  });
});
