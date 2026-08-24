import { inject, Injectable, Type } from '@angular/core';

import type { SchemaComponent } from '../components/schema.component';
import { isComponentLoader, LOCALESS_COMPONENTS, LOCALESS_FALLBACK_COMPONENT } from '../localess.components';

/**
 * Resolves content `_schema` keys to Angular components using the registry configured via
 * `withLocalessComponents()`.
 *
 * Resolved components are cached, so a lazy loader is only invoked once per schema key.
 * Used internally by `LocalessComponentDirective`.
 */
@Injectable()
export class LocalessComponentResolver {
  private readonly components = inject(LOCALESS_COMPONENTS, { optional: true });
  private readonly fallback = inject(LOCALESS_FALLBACK_COMPONENT, { optional: true });
  private readonly cache = new Map<string, Type<SchemaComponent>>();

  /**
   * Returns `true` when the given schema key has a registered component.
   * Does not account for the fallback component.
   */
  has(key: string): boolean {
    return this.components?.[key] != null;
  }

  /**
   * Resolves the component registered for the given schema key, awaiting its loader if lazy.
   *
   * Falls back to the registered fallback component when the key has no match, logging a
   * console error either way. Returns `null` when there is no match and no fallback.
   */
  async resolve(key: string): Promise<Type<SchemaComponent> | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const entry = this.components?.[key];
    if (entry) {
      const component = isComponentLoader(entry) ? await entry() : entry;
      this.cache.set(key, component);
      return component;
    }

    console.error(`[Localess] component ${key} can't be found.`);
    return this.fallback ?? null;
  }
}
