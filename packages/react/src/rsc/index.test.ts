import { describe, expect, it } from 'vitest';

import { LocalessComponent as CoreLocalessComponent } from '../core/components/localess-component';
import { LocalessDocument as CoreLocalessDocument } from '../core/components/localess-document';
import { useLocaless as CoreUseLocaless } from '../core/hooks';
import { LocalessComponent as RscLocalessComponent, LocalessDocument as RscLocalessDocument, useLocaless as RscUseLocaless } from './index';
import { LocalessDocument as RscOwnLocalessDocument } from './localess-document';

describe('@localess/react/rsc index', () => {
  it('re-exports the same LocalessComponent implementation as core/components (no duplicate implementation)', () => {
    expect(RscLocalessComponent).toBe(CoreLocalessComponent);
  });

  it('re-exports the same useLocaless implementation as core/hooks (no duplicate implementation)', () => {
    expect(RscUseLocaless).toBe(CoreUseLocaless);
  });

  it('exports its own server-safe LocalessDocument, distinct from the client-only core/components one', () => {
    expect(RscLocalessDocument).toBe(RscOwnLocalessDocument);
    expect(RscLocalessDocument).not.toBe(CoreLocalessDocument);
  });
});
