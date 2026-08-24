'use client';

import { useEffect } from 'react';

import { loadLocalessSync } from '../core/models';
import { isBrowser, isIframe } from '../core/utils';

export type LiveEditListenerProps = {
  /** The content's top-level `id` (`Content.id`), forwarded to the Server Action as the cache key. */
  id: string;
  origin: string;
  enableSync: boolean;
};

/**
 * Client-only island rendered alongside `/rsc`'s `LocalessDocument`. Subscribes to
 * Visual Editor sync events and calls {@link localessLiveEditAction} (a Server Action)
 * on each one, instead of holding any client-side state or component registry.
 * Renders nothing.
 */
export function LiveEditListener({ id, origin, enableSync }: LiveEditListenerProps) {
  useEffect(() => {
    if (!(enableSync && isBrowser() && isIframe())) return;
    let cancelled = false;

    loadLocalessSync(origin).then(() => {
      if (cancelled) return;
      window.localess?.on(['input', 'change', 'save', 'publish', 'unpublish'], async event => {
        try {
          const { localessLiveEditAction } = await import('./live-edit-action');
          await localessLiveEditAction({
            id,
            path: window.location.pathname,
            type: event.type,
            data: 'data' in event ? event.data : undefined,
          });
        } catch (error) {
          console.error('[Localess] LiveEditListener: failed to run live edit action', error);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [id, origin, enableSync]);

  return null;
}
