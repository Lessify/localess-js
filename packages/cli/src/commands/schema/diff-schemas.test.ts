import { describe, expect, it } from 'vitest';

import type { SchemaExport } from '../../models';
import { diffSchemas, stableStringify } from './diff-schemas';

describe('stableStringify', () => {
  it('sorts keys recursively, preserves array order', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
    expect(stableStringify([{ b: 1, a: 2 }])).toBe('[{"a":2,"b":1}]');
  });

  it('handles primitives and null', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(5)).toBe('5');
  });
});

describe('diffSchemas', () => {
  const remote: SchemaExport[] = [
    { id: 'Same', type: 'NODE', fields: [{ name: 'label', kind: 'TEXT' }] },
    { id: 'Changed', type: 'NODE', fields: [] },
    { id: 'Stale', type: 'ENUM', values: [] },
  ];
  const local: SchemaExport[] = [
    // identical to remote.Same but different key order — must be 'unchanged'
    { type: 'NODE', id: 'Same', fields: [{ kind: 'TEXT', name: 'label' }] } as SchemaExport,
    { id: 'Changed', type: 'NODE', fields: [{ name: 'extra', kind: 'TEXT' }] },
    { id: 'Fresh', type: 'ROOT' },
  ];

  it('classifies create/update/unchanged/stale', () => {
    const result = Object.fromEntries(diffSchemas(local, remote).map(e => [e.id, e.status]));
    expect(result).toEqual({ Same: 'unchanged', Changed: 'update', Fresh: 'create', Stale: 'stale' });
  });

  it('orders entries: local order first, then stale', () => {
    expect(diffSchemas(local, remote).map(e => e.id)).toEqual(['Same', 'Changed', 'Fresh', 'Stale']);
  });

  it('reports everything unchanged when local and remote are identical', () => {
    expect(diffSchemas(remote, remote).map(e => e.status)).toEqual(['unchanged', 'unchanged', 'unchanged']);
  });

  it('reports empty diff for two empty arrays', () => {
    expect(diffSchemas([], [])).toEqual([]);
  });
});
