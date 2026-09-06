/** Every event the Localess Visual Editor can send to the previewed app. */
export type EventToAppType = 'save' | 'publish' | 'unpublish' | 'pong' | 'input' | 'change' | 'enterSchema' | 'hoverSchema' | 'leaveSchema';

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

export type EventCallback = (event: EventToApp) => void;

/**
 * Narrows {@link EventToApp} down to the variant(s) matching event type `T`.
 * Subscribing to `'input' | 'change'` narrows the callback's `event` to the
 * variants carrying `data`.
 */
export type EventToAppOf<T extends EventToAppType> = Extract<EventToApp, { type: T }>;

/** The bridge object the sync script installs on `window`. */
export interface LocalessSync {
  onChange: (callback: (event: EventToAppOf<'change' | 'input'>) => void) => void;
  on: <T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void) => void;
}

declare global {
  interface Window {
    localess?: LocalessSync;
  }
}
