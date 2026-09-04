import chalk from 'chalk';

import type { SchemaExport, SchemaPushIds, SchemaPushResponse, SchemaPushType } from '../../models';

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

export type SchemaActualStatus = 'created' | 'updated' | 'deleted' | 'unchanged';

export interface SchemaDiffMismatch {
  id: string;
  predicted: SchemaDiffStatus;
  actual: SchemaActualStatus;
}

function actualStatus(id: string, ids: SchemaPushIds): SchemaActualStatus {
  if (ids.created.includes(id)) return 'created';
  if (ids.updated.includes(id)) return 'updated';
  if (ids.deleted.includes(id)) return 'deleted';
  return 'unchanged';
}

/**
 * Compares the pre-push diff against the server's push response, flagging any id whose
 * predicted status doesn't match what the server actually did (e.g. a concurrent change
 * between preview and push). `stale` entries are only checked under `sync` pushes, since
 * `upsert` never sends them to the server.
 */
export function reconcileSchemaDiff(diff: SchemaDiffEntry[], pushType: SchemaPushType, response: SchemaPushResponse): SchemaDiffMismatch[] {
  const mismatches: SchemaDiffMismatch[] = [];
  for (const entry of diff) {
    if (entry.status === 'stale' && pushType !== 'sync') continue;
    const expected: SchemaActualStatus =
      entry.status === 'create' ? 'created' : entry.status === 'update' ? 'updated' : entry.status === 'stale' ? 'deleted' : 'unchanged';
    const actual = actualStatus(entry.id, response.ids);
    if (actual !== expected) mismatches.push({ id: entry.id, predicted: entry.status, actual });
  }
  return mismatches;
}

/** Prints a warning block for each prediction mismatch; prints nothing when the list is empty. */
export function printSchemaDiffMismatches(mismatches: SchemaDiffMismatch[]): void {
  if (mismatches.length === 0) return;
  console.log(chalk.yellow.bold('\n⚠ Prediction mismatch (local preview vs server result):'));
  for (const { id, predicted, actual } of mismatches) {
    console.log(chalk.yellow(`  ${id}: predicted "${predicted}", server reported "${actual}"`));
  }
}
