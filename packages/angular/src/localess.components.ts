import { InjectionToken, Provider, Type } from '@angular/core';

import { SchemaComponent } from './components/schema.component';

/**
 * A concrete component class extending {@link SchemaComponent} for *some* schema-specific
 * `ContentData` subtype — which one varies per registry entry, so it can't be named here.
 *
 * Uses `any` for that subtype, not to opt out of the `T extends ContentData` bound, but because
 * TypeScript has no way to express "a subtype of `ContentData`, just not statically which one"
 * (an existential type) other than `any`. The bound itself is still enforced — at the point each
 * concrete class is declared (e.g. `class PageComponent extends SchemaComponent<Page>`), because
 * {@link SchemaComponent}'s own declaration is `SchemaComponent<T extends ContentData = ContentData>`.
 * A class extending `SchemaComponent<SomethingElse>` where `SomethingElse` doesn't satisfy
 * `ContentData` fails to compile right there, regardless of how this registry types its map.
 */
export type AnySchemaComponent = Type<SchemaComponent<any>>;

/**
 * Lazy component loader. Returns a promise resolving to the component type.
 *
 * @example
 * ```ts
 * const loader: LocalessComponentLoader = () => import('./teaser.component').then(m => m.TeaserComponent);
 * ```
 */
export type LocalessComponentLoader = () => Promise<AnySchemaComponent>;

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
export type LocalessComponentsMap = Record<string, AnySchemaComponent | LocalessComponentLoader>;

/**
 * Injection token for the Localess component registry, set via {@link withLocalessComponents}.
 * Consumed internally by `LocalessComponentResolver`.
 */
export const LOCALESS_COMPONENTS = new InjectionToken<LocalessComponentsMap>('LOCALESS_COMPONENTS');

/**
 * Injection token for the fallback component rendered when a `_schema` key has no registry match.
 * Set via {@link withLocalessComponents}.
 */
export const LOCALESS_FALLBACK_COMPONENT = new InjectionToken<AnySchemaComponent>('LOCALESS_FALLBACK_COMPONENT');

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
export function withLocalessComponents(components: LocalessComponentsMap, fallback?: AnySchemaComponent): LocalessFeature {
  const providers: Provider[] = [{ provide: LOCALESS_COMPONENTS, useValue: components }];
  if (fallback) {
    providers.push({ provide: LOCALESS_FALLBACK_COMPONENT, useValue: fallback });
  }
  return { ɵkind: 'components', ɵproviders: providers };
}

/**
 * Type guard distinguishing a {@link LocalessComponentLoader} from a direct component reference.
 */
export function isComponentLoader(entry: AnySchemaComponent | LocalessComponentLoader): entry is LocalessComponentLoader {
  return typeof entry === 'function' && entry.length === 0 && !entry.prototype;
}
