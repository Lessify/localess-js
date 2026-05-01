import { forwardRef } from 'react';

import { FONT_BOLD, FONT_NORMAL } from '../console';
import { Content, ContentData } from '../core/models';
import { LocalessServerComponent } from './localess-component';

/**
 * Props for {@link LocalessServerDocument}.
 *
 * @template T - The content data shape. Defaults to the base {@link ContentData} type.
 */
export type LocalessServerDocumentProps<T extends ContentData = ContentData> = {
  /**
   * The full content response object as returned by `getContentBySlug` or `getContentById`.
   * Must contain a `data` field with a valid `_schema` key.
   */
  document: Content<T>;
};

/**
 * Server-safe document renderer for SSR and static-export environments.
 *
 * Accepts the full {@link Content} wrapper (as returned by `getContentBySlug` /
 * `getContentById`) and delegates to {@link LocalessServerComponent}, automatically
 * passing `data`, `links`, and `references` through.
 *
 * This is a convenience wrapper — use it when you want to render a fetched
 * `Content<T>` object without manually destructuring it.
 *
 * **No live editing** — does not subscribe to Visual Editor sync events.
 * For live Visual Editor editing use {@link LocalessDocument} from `@localess/react/rsc`.
 *
 * **No `'use client'` directive** — safe to render in React Server Components
 * and Next.js static export pages.
 *
 * @template T - The content data shape. Defaults to {@link ContentData}.
 *
 * @example
 * ```tsx
 * import { LocalessServerDocument } from '@localess/react/ssr';
 *
 * // Server Component or getServerSideProps
 * const content = await getLocalessClient().getContentBySlug<MyPage>('home', { locale: 'en' });
 *
 * return <LocalessServerDocument document={content} />;
 * ```
 */
export const LocalessServerDocument = forwardRef<HTMLElement, LocalessServerDocumentProps>(({ document }, ref) => {
  if (!document.data) {
    console.error('LocalessServerDocument property %cdocument.data%c is not provided.', FONT_BOLD, FONT_NORMAL);
    return (
      <div>
        LocalessServerDocument property <b>document.data</b> is not provided.
      </div>
    );
  }

  return <LocalessServerComponent ref={ref} data={document.data} links={document.links} references={document.references} />;
});
