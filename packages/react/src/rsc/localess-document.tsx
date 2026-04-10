'use client';

import {forwardRef, useEffect, useState} from "react";
import {ContentData, Links, References} from "../core/models";
import {isBrowser, isIframe} from "../core/utils";
import {LocalessComponent} from "../core/components";
import {isSyncEnabled} from "../core/state";

/**
 * Props for {@link LocalessDocument}.
 *
 * @template T - The content data shape. Defaults to the base {@link ContentData} type.
 */
export type LocalessDocumentProps<T extends ContentData = ContentData> = {
  /**
   * The content data object to render — typically `content.data` from `getContentBySlug`.
   * Should be fetched server-side and passed as a prop so the page renders immediately
   * without a loading flash.
   */
  data: T;
  /**
   * Optional map of content links keyed by link ID.
   * Passed through to child components for resolving {@link ContentLink} values with `findLink`.
   */
  links?: Links;
  /**
   * Optional map of resolved content references keyed by reference ID.
   * Passed through to child components that consume referenced content.
   */
  references?: References;
}

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
 * Sync only activates when `enableSync: true` was passed to `localessInit` **and** the page
 * is running inside the Visual Editor iframe (`isIframe()` is true).
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
 *   return <PageClient data={content.data} links={content.links} references={content.references} />;
 * }
 *
 * // app/[locale]/page-client.tsx  (Client Component)
 * 'use client';
 * import { LocalessDocument } from '@localess/react/rsc';
 *
 * export default function PageClient({ data, links, references }) {
 *   return <LocalessDocument data={data} links={links} references={references} />;
 * }
 * ```
 */
export const LocalessDocument = forwardRef<HTMLElement, LocalessDocumentProps>(({
                                                                                  data,
                                                                                  links,
                                                                                  references,
                                                                                  ...restProps
                                                                                }, ref) => {
  const [contentData, setContentData] = useState(data);
  useEffect(() => {
    console.log('LocalessDocument isSyncEnabled:', isSyncEnabled())
    console.log('LocalessDocument isBrowser:', isBrowser())
    console.log('LocalessDocument isBrowser:', isBrowser())
    if (isSyncEnabled() && isBrowser() && isIframe()) {
      window.localess?.on(['input', 'change'], (event) => {
        console.log('Localess:event', event)
        if (event.type === 'change' || event.type === 'input') {
          setContentData(event.data)
        }
      })
    }
  }, [])

  return (
    <LocalessComponent ref={ref} data={contentData} links={links} references={references} {...restProps}/>
  );
});
