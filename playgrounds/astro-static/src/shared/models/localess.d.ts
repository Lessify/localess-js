import type { ContentData } from '@localess/astro';

export type Page = ContentData & {
  title?: string;
};
