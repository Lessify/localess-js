import type { InferContent, InferContentData } from '@localess/schema';

import { Button, config, Page } from './schemas';

/**
 * `InferContentData` unions the content type of every ROOT schema in the config — this is what
 * you'd type a page-fetching function's return value as.
 */
export type ContentData = InferContentData<typeof config>;

/** `InferContent` resolves a single schema's content type, `SCHEMAS`/`SCHEMA` refs included. */
export type PageContent = InferContent<typeof Page, typeof config>;
export type ButtonContent = InferContent<typeof Button, typeof config>;

// No backend call, no `localess push` needed — the shape below is checked by `tsc` alone.
const examplePage: PageContent = {
  _id: 'abc123',
  _schema: 'Page',
  title: 'Home',
  actions: [{ _id: 'btn1', _schema: 'Button', label: 'Learn more', status: 'published' }],
};

console.log(JSON.stringify(examplePage, null, 2));
