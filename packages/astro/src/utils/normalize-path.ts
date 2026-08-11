/**
 * Normalizes a path string: a single leading slash, no trailing slash
 * (except root `/`), and no duplicate internal slashes.
 */
export function normalizePath(p: string): string {
  return `/${p
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/')}`;
}
