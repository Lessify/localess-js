'use client';

import { loadLocalessSync } from '@localess/client';
import { useEffect } from 'react';

import { Content, ContentData } from '../core/models';
import { isBrowser, isIframe } from '../core/utils';

/**
 * Props for {@link LocalessSync}.
 *
 * @template T - The content data shape. Defaults to the base {@link ContentData} type.
 */
export type LocalessSyncProps<T extends ContentData = ContentData> = {
  /**
   * The content object whose `data` field is updated in place when a Visual Editor
   * `input`/`change` event arrives. Mutated directly — this component renders nothing
   * itself and does not trigger a re-render of its parent.
   */
  document: Content<T>;
  /**
   * The Localess origin to load the Visual Editor sync script from.
   * Pass {@link getOrigin}`()`, read server-side where `localessInit()` set it.
   */
  origin: string;
  /**
   * Whether sync was configured via `localessInit({ enableSync: true })`.
   * Pass {@link isSyncConfigured}`()`, read server-side — `isBrowser()` / `isIframe()`
   * are checked here instead, since they're only meaningful once running in the browser.
   */
  enableSync: boolean;
};

/**
 * Client-only island that subscribes to Visual Editor sync events on behalf of a
 * Server Component {@link LocalessDocument}.
 *
 * Kept separate from content rendering so the component registry lookup (in
 * {@link LocalessComponent}) stays in the Server Component module graph, where
 * `localessInit()`'s registration is actually visible. Renders nothing.
 *
 * **Requires `'use client'`** — this file declares it; render it directly without
 * wrapping in another Client Component.
 */
export function LocalessSync<T extends ContentData = ContentData>({ document, origin, enableSync }: LocalessSyncProps<T>) {
  useEffect(() => {
    async function init() {
      if (!(enableSync && isBrowser() && isIframe())) return;
      // Subscribes directly via `window.localess` instead of `localessSyncOnChange` — that
      // helper re-checks `isSyncEnabled()` against module state set by `localessInit()`, which
      // isn't visible here (this file is bundled into a separate Client Component module graph).
      // `enableSync` above is that same check, done server-side where the state was actually set.
      await loadLocalessSync(origin);
      window.localess?.onChange(event => {
        document.data = event.data;
      });
    }
    void init();
  }, []);

  return null;
}
