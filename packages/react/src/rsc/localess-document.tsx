import { forwardRef } from 'react';

import { FONT_BOLD, FONT_NORMAL } from '../console';
import { getOrigin, isSyncConfigured } from '../core/client';
import { LocalessComponent } from '../core/components';
import { Content, ContentData } from '../core/models';
import { consumeLiveEdit } from './live-edit-cache';
import { LiveEditListener } from './live-edit-listener';

export type LocalessDocumentProps<T extends ContentData = ContentData> = {
  document: Content<T>;
};

/**
 * Primary `/rsc` `LocalessDocument` — a Server Component (no `'use client'`). Renders
 * `LocalessComponent` server-side using the server's own component registry, overlaying
 * any pending Visual Editor edit found in the live-edit cache. Live sync is driven by a
 * Server Action (see {@link LiveEditListener}), not client-side re-render — no
 * client-side component registry is ever needed for this path.
 *
 * Requires a live server at request time to run its Server Action against — **not**
 * usable under Next.js `output: 'export'`. Use the root entry point's client-side
 * `LocalessDocument` (`import { LocalessDocument } from '@localess/react'`) instead there.
 *
 * @example
 * ```tsx
 * import { getLocalessClient, LocalessDocument } from '@localess/react/rsc';
 *
 * const content = await getLocalessClient().getContentBySlug('home', { locale });
 * return <LocalessDocument document={content} />;
 * ```
 */
export const LocalessDocument = forwardRef<HTMLElement, LocalessDocumentProps>(({ document }, ref) => {
  if (!document.data) {
    console.error('LocalessDocument property %cdocument.data%c is not provided.', FONT_BOLD, FONT_NORMAL);
    return (
      <div>
        LocalessDocument property <b>document.data</b> is not provided.
      </div>
    );
  }

  const liveData = consumeLiveEdit(document.id) as ContentData | undefined;
  const data = liveData ?? document.data;

  return (
    <>
      <LocalessComponent ref={ref} data={data} assets={document.assets} links={document.links} references={document.references} />
      <LiveEditListener id={document.id} origin={getOrigin()} enableSync={isSyncConfigured()} />
    </>
  );
});
