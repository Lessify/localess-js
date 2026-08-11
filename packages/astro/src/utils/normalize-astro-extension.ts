/**
 * Ensures the given path ends with `.astro`, appending it if missing.
 */
export function normalizeAstroExtension(path: string): string {
  return path.endsWith('.astro') ? path : `${path}.astro`;
}
