import { describe, expect, it } from 'vitest';

import { LocalessDocument as CoreLocalessDocument } from '../core/components/localess-document';
import { LocalessDocument as RscLocalessDocument } from './index';

describe('@localess/react/rsc index', () => {
  it('re-exports the same LocalessDocument implementation as core/components (no duplicate implementation)', () => {
    expect(RscLocalessDocument).toBe(CoreLocalessDocument);
  });
});
