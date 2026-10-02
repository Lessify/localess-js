/** Every event the Localess Visual Editor can send to the previewed app. */
export type EventToAppType = 'save' | 'publish' | 'unpublish' | 'pong' | 'input' | 'change' | 'enterSchema' | 'hoverSchema' | 'leaveSchema';

/**
 * Events that belong to one document carry its `documentId` (the `Content.id` returned by
 * the API). A page rendering several documents applies them only to the matching one.
 */
export type EventToApp =
  | { type: 'save'; documentId: string }
  | { type: 'publish'; documentId: string }
  | { type: 'unpublish'; documentId: string }
  | { type: 'pong' }
  | { type: 'leaveSchema' }
  | { type: 'input'; documentId: string; data: any }
  | { type: 'change'; documentId: string; data: any }
  /**
   * The editor opened a schema block in its form. `root` is `true` when it went back to the
   * document root, which the sync script treats as clearing the selection.
   */
  | { type: 'enterSchema'; id: string; schema: string; field?: string; root?: boolean }
  | { type: 'hoverSchema'; id: string; schema: string; field?: string };

export type EventCallback = (event: EventToApp) => void;

/**
 * Narrows {@link EventToApp} down to the variant(s) matching event type `T`.
 * Subscribing to `'input' | 'change'` narrows the callback's `event` to the
 * variants carrying `data`.
 */
export type EventToAppOf<T extends EventToAppType> = Extract<EventToApp, { type: T }>;

/** Removes a subscription. Safe to call more than once. */
export type Unsubscribe = () => void;

/** The bridge object the sync script installs on `window`. */
export interface LocalessSync {
  /** Subscribes to `input` and `change`. */
  onChange: (callback: (event: EventToAppOf<'change' | 'input'>) => void) => Unsubscribe;
  /** Subscribes to one or more editor events. */
  on: <T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void) => Unsubscribe;
  /** Removes a callback added with `on` or `onChange`. */
  off: <T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void) => void;
}

declare global {
  interface Window {
    localess?: LocalessSync;
  }
}
