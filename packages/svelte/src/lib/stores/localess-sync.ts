import { type Readable, readable } from 'svelte/store';

import { localessSyncOn } from '../client';
import type { EventToAppOf, EventToAppType } from '../models';

export function localessSync<T extends EventToAppType>(event: T | T[]): Readable<EventToAppOf<T> | undefined> {
  // The start function runs on the first subscriber and its return value on the last unsubscribe,
  // so the sync subscription lives exactly as long as someone reads the store.
  return readable<EventToAppOf<T> | undefined>(undefined, set => localessSyncOn(event, e => set(e)));
}
