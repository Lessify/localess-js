import { type Readable, readable } from 'svelte/store';

import { localessSyncOn } from '../client';
import type { EventToAppOf, EventToAppType } from '../models';

export function localessSync<T extends EventToAppType>(event: T | T[]): Readable<EventToAppOf<T> | undefined> {
  return readable<EventToAppOf<T> | undefined>(undefined, set => {
    localessSyncOn(event, e => set(e));
    return () => {};
  });
}
