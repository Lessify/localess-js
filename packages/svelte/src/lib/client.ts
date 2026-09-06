import { localessClient } from '@localess/client';
import type { Component } from 'svelte';

export { localessClient };

import { type EventToAppOf, type EventToAppType, type LocalessClient, type LocalessSvelteInitOptions } from './models';
import { createSyncController } from './utils';

let _client: LocalessClient | undefined = undefined;
let _components: Record<string, Component<any>> = {};
let _fallbackComponent: Component<any> | undefined = undefined;
const _sync = createSyncController();

export function localessInit(options: LocalessSvelteInitOptions): LocalessClient {
  const { components, fallbackComponent, enableSync, ...restOptions } = options;
  _client = localessClient(restOptions);
  _components = components || {};
  _fallbackComponent = fallbackComponent;
  _sync.init(restOptions.origin, enableSync);
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

export function localessSyncOn<T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void): void {
  _sync.on(event, callback);
}

export function localessSyncOnChange(callback: (event: EventToAppOf<'change' | 'input'>) => void): void {
  _sync.onChange(callback);
}
