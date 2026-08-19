import { describe, expect, it } from 'vitest';

import { LocalessDocument as CoreLocalessDocument } from '../core/components/localess-document';
import { LocalessDocument as RscLocalessDocument, localessInit, setComponents, setFallbackComponent } from './index';
import { LocalessDocument as RscOwnLocalessDocument } from './localess-document';

describe('@localess/react/rsc index', () => {
  it('exports its own Server-Action-driven LocalessDocument as the primary export', () => {
    expect(RscLocalessDocument).toBe(RscOwnLocalessDocument);
  });

  it('the primary LocalessDocument is a different implementation than the client-side core one', () => {
    expect(RscLocalessDocument).not.toBe(CoreLocalessDocument);
  });

  it('exports setComponents, setFallbackComponent, and localessInit, required by the LocalessClientDocument fallback path (localessInit called again client-side with a public token)', () => {
    expect(typeof setComponents).toBe('function');
    expect(typeof setFallbackComponent).toBe('function');
    expect(typeof localessInit).toBe('function');
  });
});
