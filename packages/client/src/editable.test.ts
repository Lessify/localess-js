import { describe, expect, it } from 'vitest';

import { localessEditable, localessEditableField } from './editable';
import { ContentDataSchema } from './models';

describe('localessEditable', () => {
  it('extracts the id and schema attributes from content', () => {
    const content: ContentDataSchema = { _id: 'content-1', _schema: 'page' };

    expect(localessEditable(content)).toEqual({
      'data-ll-id': 'content-1',
      'data-ll-schema': 'page',
    });
  });
});

describe('localessEditableField', () => {
  it('returns the field attribute for a given field name', () => {
    expect(localessEditableField('title')).toEqual({ 'data-ll-field': 'title' });
  });
});
