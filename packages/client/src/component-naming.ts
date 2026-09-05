/**
 * Built-in strategies for matching a content `_schema` key to a registered
 * component.
 *
 * Localess lets a schema be named freely, while every framework has its own
 * file-naming convention — React and Svelte favour `HeroBanner.tsx`, Angular
 * favours `hero-banner`. A strategy normalizes **both** the registry key and
 * the incoming `_schema` before they are compared, so the two conventions meet
 * in the middle instead of one having to give.
 *
 * - `exact` — no transformation. `HeroBanner` matches only `HeroBanner`.
 * - `camelCase` — `hero-banner`, `hero_banner`, `HeroBanner` -> `heroBanner`.
 * - `PascalCase` — the same, as `HeroBanner`.
 * - `kebab-case` — the same, as `hero-banner`.
 * - `snake_case` — the same, as `hero_banner`.
 * - `lowercase` — separators dropped entirely: `herobanner`. The most
 *   permissive, and the most collision-prone.
 *
 * Every strategy except `exact` is case- and separator-insensitive, so they
 * differ only in the shape of the key they produce, not in what they match.
 */
export type ComponentNamingStrategy = 'exact' | 'camelCase' | 'PascalCase' | 'kebab-case' | 'snake_case' | 'lowercase';

/** A built-in {@link ComponentNamingStrategy}, or a custom normalizer. */
export type ComponentNaming = ComponentNamingStrategy | ((name: string) => string);

/** Strategy applied when none is configured. */
export const DEFAULT_COMPONENT_NAMING: ComponentNamingStrategy = 'exact';

/**
 * Splits a name into words on separators (`-`, `_`, whitespace, `.`) and on
 * case boundaries, so every strategy works from the same word list.
 *
 * `HTMLBlock` splits as `['HTML', 'Block']` rather than `['H','T','M','L','Block']`
 * — a run of capitals followed by a capitalised word is treated as an acronym.
 */
export function splitComponentWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[-_.\s]+/)
    .filter(Boolean);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Applies a naming strategy to a single key.
 *
 * Used on both sides of a component lookup: on each registry key when the index
 * is built, and on `data._schema` when a component is resolved.
 */
export function normalizeComponentKey(name: string, naming: ComponentNaming = DEFAULT_COMPONENT_NAMING): string {
  if (typeof naming === 'function') {
    return naming(name);
  }
  if (naming === 'exact') {
    return name;
  }

  const words = splitComponentWords(name);
  if (words.length === 0) {
    return name;
  }

  switch (naming) {
    case 'camelCase':
      return words.map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word))).join('');
    case 'PascalCase':
      return words.map(capitalize).join('');
    case 'kebab-case':
      return words.map(word => word.toLowerCase()).join('-');
    case 'snake_case':
      return words.map(word => word.toLowerCase()).join('_');
    case 'lowercase':
      return words.join('').toLowerCase();
    default:
      return name;
  }
}

/** Two registry keys that normalized to the same value under a strategy. */
export interface ComponentKeyCollision {
  /** The shared normalized key. */
  normalized: string;
  /** The original registry keys that collapsed onto it, in registration order. */
  keys: string[];
}

/** Result of {@link createComponentIndex}. */
export interface ComponentIndex<T> {
  /** Normalized key -> component. First registration wins on collision. */
  index: Map<string, T>;
  /** Keys that collapsed onto the same normalized value. Empty under `exact`. */
  collisions: ComponentKeyCollision[];
}

/**
 * Builds the normalized lookup index for a component registry.
 *
 * Collisions are reported rather than thrown, so each package can decide
 * whether to fail the build or warn — but they are always a configuration
 * mistake: two components cannot both answer to one schema.
 */
export function createComponentIndex<T>(
  components: Record<string, T>,
  naming: ComponentNaming = DEFAULT_COMPONENT_NAMING
): ComponentIndex<T> {
  const index = new Map<string, T>();
  const seen = new Map<string, string[]>();

  for (const [key, component] of Object.entries(components)) {
    const normalized = normalizeComponentKey(key, naming);
    const existing = seen.get(normalized);
    if (existing) {
      existing.push(key);
      continue;
    }
    seen.set(normalized, [key]);
    index.set(normalized, component);
  }

  const collisions: ComponentKeyCollision[] = [];
  for (const [normalized, keys] of seen) {
    if (keys.length > 1) {
      collisions.push({ normalized, keys });
    }
  }

  return { index, collisions };
}

/** Human-readable collision report, for a build error or console warning. */
export function formatComponentKeyCollisions(collisions: ComponentKeyCollision[], naming: ComponentNaming): string {
  const strategy = typeof naming === 'function' ? 'a custom naming function' : `naming strategy "${naming}"`;
  const lines = collisions.map(collision => `  ${collision.keys.join(', ')} -> "${collision.normalized}"`);
  return [
    `Component naming collision: these registry keys resolve to the same component key under ${strategy}.`,
    ...lines,
    'Rename one of the components, or use a stricter strategy such as "exact".',
  ].join('\n');
}
