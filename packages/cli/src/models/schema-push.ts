import type { SchemaExport } from './schema';

/** Push mode: upsert never deletes; sync additionally deletes schemas absent from the payload. */
export type SchemaPushType = 'upsert' | 'sync';

export interface SchemaPushRequest {
  dryRun?: boolean;
  type: SchemaPushType;
  schemas: SchemaExport[];
}

export interface SchemaPushCounts {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

export interface SchemaPushIds {
  created: string[];
  updated: string[];
  deleted: string[];
}

export interface SchemaPushResponse {
  message: string;
  counts: SchemaPushCounts;
  ids: SchemaPushIds;
  dryRun?: boolean;
}
