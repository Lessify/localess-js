import { forwardRef } from 'react';

import { FONT_BOLD, FONT_NORMAL } from '../console';
import { LocalessComponent } from '../core/components/localess-component';
import { Content, ContentData } from '../core/models';
import { getOrigin, isSyncConfigured } from '../core/state';
import { LocalessSync } from './localess-sync';

/**
 * Props for {@link LocalessDocument}.
 *
 * @template T - The content data shape. Defaults to the base {@link ContentData} type.
 */
export type LocalessDocumentProps<T extends ContentData = ContentData> = {
  /**
   * The full content response object as returned by `getContentBySlug` or `getContentById`.
   * Must contain a `data` field with a valid `_schema` key.
   */
  document: Content<T>;
};

/**
 * Server Component document renderer with Visual Editor live sync.
 *
 * Renders {@link LocalessComponent} directly — in the same module graph where
 * `localessInit()` registered the component map — and mounts {@link LocalessSync} alongside
 * it as an isolated Client Component island that only handles the sync subscription.
 *
 * This split exists because Next.js App Router bundles Server and Client Components into
 * separate module graphs: a `LocalessDocument` that was itself a Client Component wrapping
 * the content renderer would move the registry lookup into the client graph, where
 * `localessInit()`'s registration (run in a Server Component) is never visible — the lookup
 * would always miss. Keeping the renderer server-side and the sync subscription in a small
 * client-only child avoids that.
 *
 * **No `'use client'` directive** — safe to render directly in a Server Component.
 *
 * @template T - The content data shape. Defaults to {@link ContentData}.
 *
 * @example
 * ```tsx
 * import { getLocalessClient, LocalessDocument } from '@localess/react/rsc';
 *
 * // Server Component
 * const content = await getLocalessClient().getContentBySlug<Page>('home', { locale });
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

  return (
    <>
      <LocalessComponent ref={ref} data={document.data} assets={document.assets} links={document.links} references={document.references} />
      <LocalessSync document={document} origin={getOrigin()} enableSync={isSyncConfigured()} />
    </>
  );
});
