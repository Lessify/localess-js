export * from './models';
export * from './client';
export * from './editable';
export * from './sync';
export {isBrowser, isServer, isIframe} from './utils';

export type EventToAppType = 'save' | 'publish' | 'pong' | 'input' | 'change' | 'enterSchema' | 'hoverSchema';
export type EventCallback = (event: EventToApp) => void;
export type EventToApp =
  | { type: 'save' | 'publish' | 'pong' }
  | { type: 'input' | 'change'; data: any }
  | { type: 'enterSchema' | 'hoverSchema'; id: string; schema: string; field?: string };

export interface LocalessSync {
  onChange: (callback: EventCallback) => void;
  on: (event: EventToAppType | EventToAppType[], callback: EventCallback) => void;
}

declare global {
  interface Window {
    localess?: LocalessSync;
  }
}
