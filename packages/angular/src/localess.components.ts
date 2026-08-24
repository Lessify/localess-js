import { InjectionToken, Provider, Type } from '@angular/core';

import { SchemaComponent } from './components/schema.component';

/**
 * Lazy component loader. Returns a promise resolving to the component type.
 *
 * @example
 * ```ts
 * const loader: LocalessComponentLoader = () => import('./teaser.component').then(m => m.TeaserComponent);
 * ```
 */
export type LocalessComponentLoader = () => Promise<Type<SchemaComponent>>;

/**
 * Registry mapping content `_schema` keys to Angular components.
 * Supports both eager (direct reference) and lazy (dynamic import) entries.
 *
 * Every entry must resolve to a class extending {@link SchemaComponent} — that's what gives it
 * the `data`/`links`/`references`/`assets` inputs `LocalessComponentDirective` sets.
 *
 * @example
 * ```ts
 * const components: LocalessComponentsMap = {
 *   hero: HeroComponent,                                          // eager
 *   teaser: () => import('./teaser.component').then(m => m.TeaserComponent), // lazy
 * };
 * ```
 */
export type LocalessComponentsMap = Record<string, Type<SchemaComponent> | LocalessComponentLoader>;

/**
 * Injection token for the Localess component registry, set via {@link withLocalessComponents}.
 * Consumed internally by `LocalessComponentResolver`.
 */
export const LOCALESS_COMPONENTS = new InjectionToken<LocalessComponentsMap>('LOCALESS_COMPONENTS');

/**
 * Injection token for the fallback component rendered when a `_schema` key has no registry match.
 * Set via {@link withLocalessComponents}.
 */
export const LOCALESS_FALLBACK_COMPONENT = new InjectionToken<Type<SchemaComponent>>('LOCALESS_FALLBACK_COMPONENT');

/**
 * A feature to pass as one of `provideLocaless()`'s trailing arguments.
 * @internal
 */
export type LocalessFeature = { ɵkind: 'components'; ɵproviders: Provider[] };

/**
 * Registers the component registry used to dynamically render content by `_schema` key.
 *
 * The fallback component must also extend {@link SchemaComponent}, same as every other
 * registered component — it commonly renders a generic "unknown block" placeholder using just
 * `data()._schema`, ignoring `links`/`references`/`assets`.
 *
 * @param components - Map of schema keys to eager components or lazy loaders.
 * @param fallback - Optional component rendered when a schema key has no match.
 *
 * @example
 * ```ts
 * provideLocaless(
 *   { origin: '...', spaceId: '...', token: '...' },
 *   withLocalessComponents({
 *     hero: HeroComponent,
 *     teaser: () => import('./teaser.component').then(m => m.TeaserComponent),
 *   }, UnknownBlockComponent)
 * )
 * ```
 */
export function withLocalessComponents(components: LocalessComponentsMap, fallback?: Type<SchemaComponent>): LocalessFeature {
  const providers: Provider[] = [{ provide: LOCALESS_COMPONENTS, useValue: components }];
  if (fallback) {
    providers.push({ provide: LOCALESS_FALLBACK_COMPONENT, useValue: fallback });
  }
  return { ɵkind: 'components', ɵproviders: providers };
}

/**
 * Type guard distinguishing a {@link LocalessComponentLoader} from a direct component reference.
 */
export function isComponentLoader(entry: Type<SchemaComponent> | LocalessComponentLoader): entry is LocalessComponentLoader {
  return typeof entry === 'function' && entry.length === 0 && !entry.prototype;
}
