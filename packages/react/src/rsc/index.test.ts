import { describe, expect, it } from 'vitest';

import { LocalessDocument as CoreLocalessDocument } from '../core/components/localess-document';
import { LocalessDocument as RscLocalessDocument, localessInit } from './index';
import { LocalessDocument as RscOwnLocalessDocument } from './localess-document';

describe('@localess/react/rsc index', () => {
  it('exports its own Server-Action-driven LocalessDocument as the primary export', () => {
    expect(RscLocalessDocument).toBe(RscOwnLocalessDocument);
  });

  it('the primary LocalessDocument is a different implementation than the client-side core one', () => {
    expect(RscLocalessDocument).not.toBe(CoreLocalessDocument);
  });

  it('exports localessInit, required by the LocalessClientDocument fallback path (called again client-side with a public token to re-populate the registry)', () => {
    expect(typeof localessInit).toBe('function');
  });
});
