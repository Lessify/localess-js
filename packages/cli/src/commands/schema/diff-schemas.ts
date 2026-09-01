import type { SchemaExport } from '../../models';

export type SchemaDiffStatus = 'create' | 'update' | 'unchanged' | 'stale';

export interface SchemaDiffEntry {
  id: string;
  status: SchemaDiffStatus;
}

/**
 * Deterministic JSON with recursively sorted object keys (array order preserved) —
 * matches the server's change detection so `unchanged` here means no-op there.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      out[key] = sortKeysDeep(record[key]);
    }
    return out;
  }
  return value;
}

/**
 * Classify each schema: create (local only), update (both, different), unchanged (both, equal),
 * stale (remote only). Local entries keep their order; stale entries follow.
 */
export function diffSchemas(local: SchemaExport[], remote: SchemaExport[]): SchemaDiffEntry[] {
  const remoteById = new Map(remote.map(schema => [schema.id, schema]));
  const localIds = new Set(local.map(schema => schema.id));
  const entries: SchemaDiffEntry[] = local.map(schema => {
    const other = remoteById.get(schema.id);
    if (!other) return { id: schema.id, status: 'create' };
    return { id: schema.id, status: stableStringify(schema) === stableStringify(other) ? 'unchanged' : 'update' };
  });
  for (const schema of remote) {
    if (!localIds.has(schema.id)) entries.push({ id: schema.id, status: 'stale' });
  }
  return entries;
}
