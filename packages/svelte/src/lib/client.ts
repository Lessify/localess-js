import { localessClient } from '@localess/client';
import type { Component } from 'svelte';

import { type EventToAppOf, type EventToAppType, type LocalessClient, type LocalessSvelteInitOptions } from './models';
import { isBrowser, isIframe, loadLocalessSync } from './utils';

let _client: LocalessClient | undefined = undefined;
let _components: Record<string, Component<any>> = {};
let _fallbackComponent: Component<any> | undefined = undefined;
let _enableSync = false;
let _syncPromise: Promise<void> | undefined = undefined;

export function localessInit(options: LocalessSvelteInitOptions): LocalessClient {
  const { components, fallbackComponent, enableSync, ...restOptions } = options;
  _client = localessClient(restOptions);
  _components = components || {};
  _fallbackComponent = fallbackComponent;
  if (enableSync) {
    _enableSync = true;
    _syncPromise = loadLocalessSync(restOptions.origin).catch(error => {
      console.error('[Localess] Failed to load sync script.', error);
    });
  }
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
  return _enableSync && isBrowser() && isIframe();
}

function localessSyncReady(): Promise<void> {
  return _syncPromise ?? Promise.resolve();
}

export function localessSyncOn<T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void): void {
  if (!isSyncEnabled()) return;
  localessSyncReady().then(() => {
    window.localess?.on(event, callback);
  });
}

export function localessSyncOnChange(callback: (event: EventToAppOf<'change' | 'input'>) => void): void {
  if (!isSyncEnabled()) return;
  localessSyncReady().then(() => {
    window.localess?.onChange(callback);
  });
}
