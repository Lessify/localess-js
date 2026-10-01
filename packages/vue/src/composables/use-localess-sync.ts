import { onMounted, onScopeDispose, type Ref, ref } from 'vue';

import { localessSyncOn } from '../client';
import type { EventToAppOf, EventToAppType } from '../models';

export function useLocalessSync<T extends EventToAppType>(event: T | T[]): Ref<EventToAppOf<T> | undefined> {
  const latest = ref<EventToAppOf<T>>();
  let unsubscribe: (() => void) | undefined;
  onMounted(() => {
    unsubscribe = localessSyncOn(event, e => {
      latest.value = e;
    });
  });
  // Removed with the component (or effect scope) that called this composable.
  onScopeDispose(() => unsubscribe?.());
  return latest as Ref<EventToAppOf<T> | undefined>;
}
