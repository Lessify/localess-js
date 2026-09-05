import { normalizeComponentKey } from '../models';

/**
 * Normalizes a name to camelCase.
 *
 * @deprecated Component matching is now controlled by the integration's
 * `componentNaming` option, which defaults to `'exact'`. This is retained
 * because it is part of the public API; prefer `componentNaming: 'camelCase'`
 * to restore the previous case-insensitive matching.
 */
export function toCamelCase(str: string): string {
  return normalizeComponentKey(str, 'camelCase');
}
