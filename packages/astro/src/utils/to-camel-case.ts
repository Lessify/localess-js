import camelCase from 'camelcase';

/**
 * Normalizes a schema key or filename-derived key to camelCase, so
 * `_schema: 'hero-section'` and a file named `HeroSection.astro` match.
 */
export function toCamelCase(str: string): string {
  return camelCase(str);
}
