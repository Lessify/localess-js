import type { EventToAppOf, EventToAppType } from '@localess/client';
import { readable, type Readable } from 'svelte/store';

import { localessSyncOn } from '../core/state';

export function localessSync<T extends EventToAppType>(event: T | T[]): Readable<EventToAppOf<T> | undefined> {
  return readable<EventToAppOf<T> | undefined>(undefined, set => {
    localessSyncOn(event, e => set(e));
    return () => {};
  });
}
