import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { LocalessSchemaConfig } from './schema-lib';

const SCHEMA_TYPES = ['ROOT', 'NODE', 'ENUM'];

/**
 * Structural check for a defineConfig() result — recognizes definitions by shape,
 * not identity, so any @localess/schema version works.
 */
export function isSchemaConfig(value: unknown): value is LocalessSchemaConfig {
  if (value === null || typeof value !== 'object') return false;
  const schemas = (value as { schemas?: unknown }).schemas;
  if (!Array.isArray(schemas)) return false;
  return schemas.every(
    schema =>
      schema !== null &&
      typeof schema === 'object' &&
      typeof (schema as { id?: unknown }).id === 'string' &&
      SCHEMA_TYPES.includes((schema as { type?: unknown }).type as string)
  );
}

/**
 * Load a TypeScript/JavaScript entry file via jiti and find the exported schema config.
 * Checks the default export first, then every named export.
 */
export async function loadSchemaConfig(entryPath: string): Promise<LocalessSchemaConfig> {
  const { createJiti } = await import('jiti');
  const jiti = createJiti(import.meta.url);
  const moduleExports = (await jiti.import(pathToFileURL(resolve(entryPath)).href)) as Record<string, unknown>;
  const candidates = [moduleExports.default, ...Object.values(moduleExports)];
  for (const candidate of candidates) {
    if (isSchemaConfig(candidate)) return candidate;
  }
  throw new Error(`No Localess schema config found in ${entryPath}. Export the result of defineConfig() from @localess/schema.`);
}
