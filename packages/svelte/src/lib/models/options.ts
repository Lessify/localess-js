import type { LocalessClientOptions } from '@localess/client';
import type { Component } from 'svelte';

export type LocalessSvelteInitOptions = LocalessClientOptions & {
  components?: Record<string, Component<any>>;
  fallbackComponent?: Component<any>;
  enableSync?: boolean;
};
