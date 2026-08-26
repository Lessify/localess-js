import { localessClient } from '@localess/client';
import type { Component } from 'vue';

import { type EventToAppOf, type EventToAppType, type LocalessClient, type LocalessClientOptions } from './models';
import { isBrowser, isIframe, loadLocalessSync } from './utils';

export type LocalessVueInitOptions = LocalessClientOptions & {
  components?: Record<string, Component>;
  fallbackComponent?: Component;
  enableSync?: boolean;
};

let _client: LocalessClient | undefined = undefined;
let _components: Record<string, Component> = {};
let _fallbackComponent: Component | undefined = undefined;
let _enableSync = false;
let _syncPromise: Promise<void> | undefined = undefined;

export function localessInit(options: LocalessVueInitOptions): LocalessClient {
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
    throw new Error('[Localess] No client found. Please check if the Localess is initialized. Use the Localess plugin or localessInit.');
  }
  return _client;
}

export function getComponent(key: string): Component | undefined {
  return Object.hasOwn(_components, key) ? _components[key] : undefined;
}

export function getFallbackComponent(): Component | undefined {
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

/** @internal test-only helper to reset the component registry between test cases. */
export function setComponentsForTest(components: Record<string, Component>): void {
  _components = components;
}
