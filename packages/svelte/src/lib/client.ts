import { localessClient } from '@localess/client';
import type { Component } from 'svelte';

export { localessClient };

import { type ContentData, type EventToAppOf, type EventToAppType, type LocalessClient, type LocalessSvelteInitOptions } from './models';
import { createSyncController } from './utils';

let _client: LocalessClient | undefined = undefined;
let _components: Record<string, Component<any>> = {};
let _fallbackComponent: Component<any> | undefined = undefined;
const _sync = createSyncController('@localess/svelte');

export function localessInit(options: LocalessSvelteInitOptions): LocalessClient {
  const { components, fallbackComponent, enableSync, ...restOptions } = options;
  _client = localessClient(restOptions);
  _components = components || {};
  _fallbackComponent = fallbackComponent;
  _sync.init(restOptions.origin, enableSync, restOptions.debug);
  return _client;
}

export function getLocalessClient(): LocalessClient {
  if (!_client) {
    throw new Error('[Localess] No client found. Please check if the Localess is initialized. Use localessInit.');
  }
  return _client;
}

export function getComponent(key: string): Component<any> | undefined {
  return Object.hasOwn(_components, key) ? _components[key] : undefined;
}

export function getFallbackComponent(): Component<any> | undefined {
  return _fallbackComponent;
}

export function isSyncEnabled(): boolean {
  return _sync.isEnabled();
}

/** Subscribes to Visual Editor sync event(s). Returns a function that removes the subscription. */
export function localessSyncOn<T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void): () => void {
  return _sync.on(event, callback);
}

/** Subscribes to `input` and `change`. Returns a function that removes the subscription. */
export function localessSyncOnChange(callback: (event: EventToAppOf<'change' | 'input'>) => void): () => void {
  return _sync.onChange(callback);
}

/**
 * Subscribes to the live edits (`input` and `change`) of one document, matched by its `Content.id`,
 * and calls `callback` with the edited content. Edits to other documents on the page are ignored.
 * Returns a function that removes the subscription.
 */
export function localessSyncOnDocument<T extends ContentData = ContentData>(
  documentId: string,
  callback: (data: T, event: EventToAppOf<'change' | 'input'>) => void
): () => void {
  return _sync.onDocument(documentId, callback);
}
