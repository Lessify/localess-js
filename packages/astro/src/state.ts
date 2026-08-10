import { type LocalessClient, localessClient } from '@localess/client';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

import { FONT_BOLD, FONT_NORMAL } from './console';
import type { LocalessOptions } from './models';

let _origin: string | undefined = undefined;
let _client: LocalessClient | undefined = undefined;
let _components: Record<string, AstroComponentFactory> = {};
let _fallbackComponent: AstroComponentFactory | undefined = undefined;
let _enableSync: boolean = false;

/**
 * Initialize the Localess SDK.
 *
 * Must be called **once** per request/build, in `.astro` frontmatter, before any other SDK
 * function is used. Calling it again overwrites the existing client and state.
 *
 * @param options - Initialization options.
 * @returns The initialized {@link LocalessClient} instance.
 */
export function localessInit(options: LocalessOptions): LocalessClient {
  const { components, fallbackComponent, enableSync, ...restOptions } = options;
  _client = localessClient(restOptions);
  _origin = restOptions.origin;
  _components = components || {};
  _fallbackComponent = fallbackComponent;
  _enableSync = !!enableSync;
  return _client;
}

/**
 * Returns the initialized {@link LocalessClient} instance.
 *
 * @throws {Error} If `localessInit` has not been called yet.
 */
export function getLocalessClient(): LocalessClient {
  if (!_client) {
    console.error('[Localess] No client found. Please check if the Localess is initialized. Use localessInit function.');
    throw new Error('[Localess] No client found.');
  }
  return _client;
}

/**
 * Returns the `origin` passed to {@link localessInit}.
 *
 * @throws {Error} If `localessInit` has not been called yet.
 */
export function getOrigin(): string {
  if (!_origin) {
    console.error('[Localess] No origin found. Please check if the Localess is initialized. Use localessInit function.');
    throw new Error('[Localess] No origin found.');
  }
  return _origin;
}

/**
 * Adds a single component to the registry under the given schema key.
 * Overwrites any previously registered component for the same key.
 */
export function registerComponent(key: string, component: AstroComponentFactory): void {
  _components[key] = component;
}

/**
 * Removes a component from the registry by schema key. No-op if the key does not exist.
 */
export function unregisterComponent(key: string): void {
  delete _components[key];
}

/**
 * Replaces the entire component registry with the supplied map.
 */
export function setComponents(components: Record<string, AstroComponentFactory>): void {
  _components = components;
}

/**
 * Looks up an Astro component factory by its schema key.
 * Returns `undefined` and logs a console error when the key is not found.
 */
export function getComponent(key: string): AstroComponentFactory | undefined {
  if (Object.hasOwn(_components, key)) {
    return _components[key];
  }
  console.error(`[Localess] component %c${key}%c can't be found.`, FONT_BOLD, FONT_NORMAL);
  return undefined;
}

/**
 * Sets the fallback component rendered when no registry match is found for a schema key.
 */
export function setFallbackComponent(component: AstroComponentFactory): void {
  _fallbackComponent = component;
}

/**
 * Returns the currently registered fallback component, or `undefined` if none is set.
 */
export function getFallbackComponent(): AstroComponentFactory | undefined {
  return _fallbackComponent;
}

/**
 * Returns the raw `enableSync` flag passed to {@link localessInit}.
 */
export function isSyncConfigured(): boolean {
  return _enableSync;
}
