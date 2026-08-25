import type { ActionReturn } from 'svelte/action';
import { describe, expect, it } from 'vitest';

import type { ContentDataSchema } from '../models';
import { localessEditable } from './localess-editable';

describe('localessEditable action', () => {
  it('applies data-ll-id and data-ll-schema on mount', () => {
    const el = document.createElement('div');
    localessEditable(el, { _id: 'abc', _schema: 'hero' });
    expect(el.getAttribute('data-ll-id')).toBe('abc');
    expect(el.getAttribute('data-ll-schema')).toBe('hero');
  });

  it('updates attributes when the action.update is called with new content', () => {
    const el = document.createElement('div');
    const action = localessEditable(el, { _id: 'abc', _schema: 'hero' }) as ActionReturn<ContentDataSchema>;
    action.update?.({ _id: 'xyz', _schema: 'button' });
    expect(el.getAttribute('data-ll-id')).toBe('xyz');
    expect(el.getAttribute('data-ll-schema')).toBe('button');
  });
});
