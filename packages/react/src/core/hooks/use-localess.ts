import {useEffect, useState} from "react";
import {getLocalessClient, isSyncEnabled} from "../state";
import {ContentData, ContentFetchParams, isBrowser} from "@localess/client";
import {Content} from "../models";

/**
 * Options for {@link useLocaless}.
 * Extends {@link ContentFetchParams} with any future hook-specific settings.
 */
export type UseLocalessOptions = ContentFetchParams & {
}

/**
 * React hook for fetching Localess content by slug inside a Client Component.
 *
 * Fetches content on mount using `getLocalessClient().getContentBySlug`, stores it in local state,
 * and — when `enableSync` is active and the page is running inside the Visual Editor iframe —
 * automatically subscribes to `input` and `change` events so content updates live without a reload.
 *
 * **Requires `'use client'`** — must be called inside a Client Component.
 *
 * **Recommended pattern:** fetch data server-side and pass it as `initialContent`, then use the
 * hook result with `?? initialContent` to avoid a loading flash:
 * ```tsx
 * const content = useLocaless('home', { locale }) ?? initialContent;
 * ```
 *
 * @template T - The content data shape. Defaults to {@link ContentData}.
 *
 * @param slug - Content slug string, or an array of path segments that will be joined with `/`.
 * @param options - Optional fetch parameters (locale, version, resolveReference, resolveLink).
 * @returns The fetched {@link Content}<T> object, or `undefined` while the initial fetch is in flight.
 *
 * @example Basic usage
 * ```tsx
 * 'use client';
 * import { useLocaless } from '@localess/react/rsc';
 *
 * export function PageClient({ initialContent, locale }) {
 *   const content = useLocaless('home', { locale }) ?? initialContent;
 *   return <LocalessComponent data={content.data} links={content.links} />;
 * }
 * ```
 *
 * @example Array slug (joined as 'blog/my-post')
 * ```tsx
 * const content = useLocaless(['blog', 'my-post'], { locale: 'en' });
 * ```
 */
export const useLocaless = <T extends ContentData = ContentData>(slug: string | string[], options: UseLocalessOptions = {}): Content<T> | undefined => {
  const [document, setDocument] = useState<Content<T>>();
  const client = getLocalessClient();
  let normalizedSlug: string;
  if (Array.isArray(slug)) {
    normalizedSlug = slug.join('/');
  } else {
    normalizedSlug = slug;
  }

  useEffect(() => {
    async function loadDocument() {
      const document = await client.getContentBySlug<T>(normalizedSlug, options)
      setDocument(document);
      if(isSyncEnabled() && isBrowser()) {
        window.localess?.on(['input', 'change'], (event) => {
          if (event.type === 'change' || event.type === 'input') {
            setDocument({...document, data: event.data})
          }
        })
      }
    }
    loadDocument();
  }, [slug, options, client]);

  return document;
}
