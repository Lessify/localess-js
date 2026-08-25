import { forwardRef, useEffect, useState } from 'react';

import { FONT_BOLD, FONT_NORMAL } from '../../console';
import { localessSyncOnChange } from '../client';
import { LocalessComponent } from '../components';
import { Content, ContentData } from '../models';

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
 * Client Component that renders content and automatically subscribes to Visual Editor sync events.
 *
 * Wraps {@link LocalessComponent} with local state so that live `input` and `change` events
 * from the Localess Visual Editor update the rendered content without a full page reload.
 *
 * **Recommended pattern for Next.js App Router:** fetch data in a Server Component and pass it
 * as props. The page renders immediately with server data; once the client hydrates, live editing
 * activates on top — no loading state needed.
 *
 * Sync only activates when {@link isSyncEnabled} returns `true` — `enableSync: true` was passed
 * to `localessInit`, the code is running in the browser, and the page is inside the Visual Editor
 * iframe.
 *
 * **Requires `'use client'`** — must be used inside a Client Component boundary in Next.js
 * App Router. Available from `@localess/react` (SPA) and `@localess/react/rsc` (RSC).
 * Not available from `@localess/react/ssr`.
 *
 * @template T - The content data shape. Defaults to {@link ContentData}.
 *
 * @example Server Component passes data; Client Component renders with live sync
 * ```tsx
 * // app/[locale]/page.tsx  (Server Component)
 * import { getLocalessClient } from '@localess/react/rsc';
 * import PageClient from './page-client';
 *
 * export default async function Page({ params }) {
 *   const content = await getLocalessClient().getContentBySlug('home', { locale: params.locale });
 *   return <PageClient content={content} />;
 * }
 *
 * // app/[locale]/page-client.tsx  (Client Component)
 * 'use client';
 * import { LocalessDocument } from '@localess/react/rsc';
 *
 * export default function PageClient({ content }) {
 *   return <LocalessDocument document={content} />;
 * }
 * ```
 */
export const LocalessDocument = forwardRef<HTMLElement, LocalessDocumentProps>(({ document }, ref) => {
  const [contentData, setContentData] = useState(document.data);
  useEffect(() => {
    localessSyncOnChange(event => {
      setContentData(event.data);
    });
  }, []);

  if (!contentData) {
    console.error('LocalessDocument property %cdocument.data%c is not provided.', FONT_BOLD, FONT_NORMAL);
    return (
      <div>
        LocalessDocument property <b>document.data</b> is not provided.
      </div>
    );
  }

  return (
    <LocalessComponent ref={ref} data={contentData} assets={document.assets} links={document.links} references={document.references} />
  );
});
