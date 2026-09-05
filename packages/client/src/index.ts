export * from './cache';
export * from './cache-tags';
export * from './client';
export * from './editable';
export * from './models';
export * from './sync';
export * from './utils';

export type EventToAppType = 'save' | 'publish' | 'unpublish' | 'pong' | 'input' | 'change' | 'enterSchema' | 'hoverSchema' | 'leaveSchema';
export type EventCallback = (event: EventToApp) => void;
export type EventToApp =
  | { type: 'save' }
  | { type: 'publish' }
  | { type: 'unpublish' }
  | { type: 'pong' }
  | { type: 'leaveSchema' }
  | { type: 'input'; data: any }
  | { type: 'change'; data: any }
  | { type: 'enterSchema'; id: string; schema: string; field?: string }
  | { type: 'hoverSchema'; id: string; schema: string; field?: string };
/**
 * Narrows {@link EventToApp} down to the variant(s) matching event type `T`.
 * Used to type {@link LocalessSync.on}'s callback based on the subscribed event(s),
 * e.g. subscribing to `'input' | 'change'` narrows the callback's `event` to the variant with `data`.
 */
export type EventToAppOf<T extends EventToAppType> = Extract<EventToApp, { type: T }>;

export interface LocalessSync {
  onChange: (callback: (event: EventToAppOf<'change' | 'input'>) => void) => void;
  on: <T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void) => void;
}

declare global {
  interface Window {
    localess?: LocalessSync;
  }
}
