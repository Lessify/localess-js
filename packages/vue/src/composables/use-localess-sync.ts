import type { EventToAppOf, EventToAppType } from '@localess/client';
import { onMounted, ref, type Ref } from 'vue';

import { localessSyncOn } from '../core/state';

export function useLocalessSync<T extends EventToAppType>(event: T | T[]): Ref<EventToAppOf<T> | undefined> {
  const latest = ref<EventToAppOf<T>>();
  onMounted(() => {
    localessSyncOn(event, e => {
      latest.value = e;
    });
  });
  return latest as Ref<EventToAppOf<T> | undefined>;
}
