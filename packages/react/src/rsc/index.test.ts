import { describe, expect, it } from 'vitest';

import { LocalessDocument as CoreLocalessDocument } from '../core/components/localess-document';
import { useLocaless as CoreUseLocaless } from '../core/hooks';
import { LocalessDocument as RscLocalessDocument, useLocaless as RscUseLocaless } from './index';

describe('@localess/react/rsc index', () => {
  it('re-exports the same LocalessDocument implementation as core/components (no duplicate implementation)', () => {
    expect(RscLocalessDocument).toBe(CoreLocalessDocument);
  });

  it('re-exports the same useLocaless implementation as core/hooks (no duplicate implementation)', () => {
    expect(RscUseLocaless).toBe(CoreUseLocaless);
  });
});
