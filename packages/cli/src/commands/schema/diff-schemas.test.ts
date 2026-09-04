import { describe, expect, it, vi } from 'vitest';

import type { SchemaExport, SchemaPushResponse } from '../../models';
import { diffSchemas, printSchemaDiffMismatches, reconcileSchemaDiff, stableStringify, type SchemaDiffEntry } from './diff-schemas';

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

describe('reconcileSchemaDiff', () => {
  const response = (ids: Partial<SchemaPushResponse['ids']> = {}): SchemaPushResponse => ({
    message: 'ok',
    counts: { created: 0, updated: 0, deleted: 0, unchanged: 0 },
    ids: { created: [], updated: [], deleted: [], ...ids },
  });

  it('reports no mismatches when the server result matches the prediction', () => {
    const diff: SchemaDiffEntry[] = [
      { id: 'New', status: 'create' },
      { id: 'Changed', status: 'update' },
      { id: 'Same', status: 'unchanged' },
      { id: 'Old', status: 'stale' },
    ];
    const res = response({ created: ['New'], updated: ['Changed'], deleted: ['Old'] });
    expect(reconcileSchemaDiff(diff, 'sync', res)).toEqual([]);
  });

  it('flags an id whose actual bucket differs from the prediction', () => {
    const diff: SchemaDiffEntry[] = [{ id: 'New', status: 'create' }];
    expect(reconcileSchemaDiff(diff, 'upsert', response())).toEqual([
      { id: 'New', predicted: 'create', actual: 'unchanged' },
    ]);
  });

  it('skips stale entries under upsert, since they are never sent to the server', () => {
    const diff: SchemaDiffEntry[] = [{ id: 'Old', status: 'stale' }];
    expect(reconcileSchemaDiff(diff, 'upsert', response())).toEqual([]);
  });

  it('expects stale entries to be deleted under sync', () => {
    const diff: SchemaDiffEntry[] = [{ id: 'Old', status: 'stale' }];
    expect(reconcileSchemaDiff(diff, 'sync', response())).toEqual([
      { id: 'Old', predicted: 'stale', actual: 'unchanged' },
    ]);
  });
});

describe('printSchemaDiffMismatches', () => {
  it('prints nothing when there are no mismatches', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    printSchemaDiffMismatches([]);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('prints a warning line per mismatch', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    printSchemaDiffMismatches([{ id: 'New', predicted: 'create', actual: 'unchanged' }]);
    const logs = log.mock.calls.map(call => call.join(' '));
    expect(logs.some(line => line.includes('Prediction mismatch'))).toBe(true);
    expect(logs.some(line => line.includes('New: predicted "create", server reported "unchanged"'))).toBe(true);
    log.mockRestore();
  });
});
