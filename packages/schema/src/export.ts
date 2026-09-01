import type { LocalessSchemaConfig } from './define';
import type { SchemaExport } from './models';

/**
 * Convert a schema config into the Localess wire format (SchemaExport[]) accepted by
 * the push endpoint and produced by the pull endpoint. Pure data transformation.
 */
export function toSchemaExport(config: LocalessSchemaConfig): SchemaExport[] {
  return config.schemas.map(schema => stripUndefined({ ...schema }) as SchemaExport);
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key as keyof T] === undefined) {
      delete value[key as keyof T];
    } else if (Array.isArray(value[key as keyof T])) {
      value[key as keyof T] = (value[key as keyof T] as unknown[]).map(item =>
        item !== null && typeof item === 'object' ? stripUndefined({ ...(item as Record<string, unknown>) }) : item
      ) as T[keyof T];
    }
  }
  return value;
}
