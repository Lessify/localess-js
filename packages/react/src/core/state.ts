import type React from 'react';
import {loadLocalessSync, type LocalessClient, localessClient} from "@localess/client";
import {FONT_BOLD, FONT_NORMAL} from "../console";
import {type LocalessOptions, type ContentAsset} from "./models";

let _client: LocalessClient | undefined = undefined
let _components: Record<string, React.ElementType> = {};
let _fallbackComponent: React.ElementType | undefined = undefined;
let _enableSync: boolean = false;
let _assetPathPrefix = '';

/**
 * Initialize Localess Client
 * @param options
 * @returns LocalessClient
 */
export function localessInit(options: LocalessOptions): LocalessClient {
  console.log("localessInit", options);
  const {components, fallbackComponent, enableSync, ...restOptions} = options;
  _client = localessClient(restOptions);

  _assetPathPrefix = `${options.origin}/api/v1/spaces/${options.spaceId}/assets/`;

  _components = components || {};
  _fallbackComponent = fallbackComponent;
  if (enableSync) {
    _enableSync = true;
    loadLocalessSync(restOptions.origin)
  }
  return _client;
}

/**
 * Get Localess Client
 * @returns LocalessClient
 */
export function getLocalessClient(): LocalessClient {
  if (!_client) {
    console.error('[Localess] No client found. Please check if the Localess is initialized.');
    throw new Error('[Localess] No client found.');
  }
  return _client;
}

/**
 * Register Component
 * @param key - component key
 * @param component - React Component
 */
export function registerComponent(key: string, component: React.ElementType): void {
  _components[key] = component;
}

/**
 * Unregister Component
 * @param key - component key
 */
export function unregisterComponent(key: string): void {
  delete _components[key];
}

/**
 * Set Components
 * @param components - Record of components
 */
export function setComponents(components: Record<string, React.ElementType>): void {
  _components = components;
}

/**
 * Get Component
 * @param key - component key
 * @returns React Component
 */
export function getComponent(key: string): React.ElementType | undefined {
  if (Object.hasOwn(_components, key)) {
    return _components[key];
  }
  console.error(`[Localess] component %c${key}%c can't be found.`, FONT_BOLD, FONT_NORMAL)
  return undefined;
}

/**
 * Set Fallback Component
 * @param fallbackComponent
 */
export function setFallbackComponent(fallbackComponent: React.ElementType): void {
  _fallbackComponent = fallbackComponent;
}

/**
 * Get Fallback Component
 * @returns React Component
 */
export function getFallbackComponent(): React.ElementType | undefined {
  return _fallbackComponent;
}

/**
 * Check if Sync is enabled
 */
export function isSyncEnabled(): boolean {
  return _enableSync;
}

/**
 * Resolve Asset URL
 * @param asset - ContentAsset
 * @returns Asset URL
 */
export function resolveAsset(asset: ContentAsset) {
  return `${_assetPathPrefix}${asset.uri}`;
}
