import type { Content } from '@localess/model';
import type { LocalessRichTextDocument } from '@localess/richtext';
import type { InferContent, InferContentData } from '@localess/schema';

import { Button } from './schemas/button';
import { Page } from './schemas/page';
import { config } from './schemas';

/**
 * `InferContentData` unions the content type of every ROOT schema in the config — this is what
 * you'd type a page-fetching function's return value as.
 */
export type ContentData = InferContentData<typeof config>;

/** `InferContent` resolves a single schema's content type, `SCHEMAS`/`SCHEMA` refs included. */
export type PageContent = InferContent<typeof Page, typeof config>;
export type ButtonContent = InferContent<typeof Button, typeof config>;

/**
 * `Page.content`'s real shape, precisely typed against `@localess/richtext`'s node/mark union —
 * not `@localess/model`'s `ContentRichText`, which is intentionally a loose placeholder (see
 * docs/richtext.md). Every node and mark below is exactly what the Localess Studio TipTap editor
 * produces, and is a real response body from `GET /content/{slug}`.
 */
const richContent: LocalessRichTextDocument = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H1' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H2' }] },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3' }] },
    { type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'H4' }] },
    { type: 'heading', attrs: { level: 5 }, content: [{ type: 'text', text: 'H5' }] },
    { type: 'heading', attrs: { level: 6 }, content: [{ type: 'text', text: 'H6' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'paragraph' }] },
    { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Bold' }] },
    { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: 'Italic' }] },
    { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'strike' }], text: 'Strike' }] },
    { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'underline' }], text: 'Underline' }] },
    { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'code' }], text: 'Code is Here' }] },
    { type: 'paragraph' },
    { type: 'paragraph', content: [{ type: 'text', text: 'Ordered List' }] },
    {
      type: 'orderedList',
      attrs: { start: 1 },
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }] },
      ],
    },
    { type: 'paragraph', content: [{ type: 'text', text: 'Bullet List' }] },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }] },
      ],
    },
    { type: 'codeBlock', content: [{ type: 'text', text: 'This is Code Block' }] },
  ],
};

/**
 * A real response from `GET /content/{slug}`. Two things the live API includes that aren't
 * modeled yet: a top-level `locale`, and a legacy `schema` alongside every block's `_schema`.
 * Left in verbatim rather than silently dropped — this constant has no explicit type annotation,
 * so they don't need to fit any declared shape, and `typedResponse` below proves the rest of the
 * payload really does match this package's inferred types.
 */
const exampleApiResponse: Content<PageContent> = {
  id: 'Sud2GFSZFjGhwAeje25H',
  name: 'Home',
  locale: 'en',
  kind: 'DOCUMENT',
  slug: 'home',
  fullSlug: 'home',
  parentSlug: '',
  createdAt: '2025-04-17T07:58:46.492Z',
  updatedAt: '2026-08-31T15:39:32.553Z',
  publishedAt: '2026-08-31T15:39:39.469Z',
  data: {
    _id: '9cf406ab-939b-4855-a700-eba3dd77ccd6',
    _schema: 'Page',
    title: 'Hello World',
    description:
      'This Hello World application demonstrates a basic integration with the Localess API, showcasing how to connect to the service, send a request, and process a simple response.\n\nIn this example, the application sends a request to the Localess API to fetch a localized version of the "Hello, World!" message. The response is then displayed in the application, illustrating how dynamic, locale-based content can be retrieved and rendered.\n\nThis simple app is ideal for developers who are new to Localess and want a quick, functional example of how to start working with the platform.',
    buttons: [
      {
        _id: 'e188a55d-8f78-47af-b412-40f2460bd33c',
        _schema: 'Button',
        label: 'Primary',
        type: 'primary'
      },
      {
        _id: 'a1635a22-e214-49e4-8349-cf41d239c770',
        _schema: 'Button',
        label: 'Secondary',
        type: 'secondary',
      },
    ],
    content: richContent,
  },
};

console.log(JSON.stringify(exampleApiResponse, null, 2));
