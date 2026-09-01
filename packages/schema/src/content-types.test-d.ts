import type { ContentAsset, ContentLink, ContentReference, ContentRichText } from '@localess/client';
import { describe, expectTypeOf, it } from 'vitest';

import type { SchemaContentAsset, SchemaContentLink, SchemaContentReference, SchemaContentRichText } from './content-types';

describe('structural parity with @localess/client content types', () => {
  it('asset', () => {
    expectTypeOf<ContentAsset>().toMatchTypeOf<SchemaContentAsset>();
    expectTypeOf<SchemaContentAsset>().toMatchTypeOf<ContentAsset>();
  });
  it('link', () => {
    expectTypeOf<ContentLink>().toMatchTypeOf<SchemaContentLink>();
    expectTypeOf<SchemaContentLink>().toMatchTypeOf<ContentLink>();
  });
  it('reference', () => {
    expectTypeOf<ContentReference>().toMatchTypeOf<SchemaContentReference>();
    expectTypeOf<SchemaContentReference>().toMatchTypeOf<ContentReference>();
  });
  it('rich text', () => {
    expectTypeOf<ContentRichText>().toMatchTypeOf<SchemaContentRichText>();
    expectTypeOf<SchemaContentRichText>().toMatchTypeOf<ContentRichText>();
  });
});
