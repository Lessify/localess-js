import { Bold } from '@tiptap/extension-bold';
import { BulletList } from '@tiptap/extension-bullet-list';
import { Code } from '@tiptap/extension-code';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Document } from '@tiptap/extension-document';
import { Heading } from '@tiptap/extension-heading';
import { History } from '@tiptap/extension-history';
import { Italic } from '@tiptap/extension-italic';
import { Link } from '@tiptap/extension-link';
import { ListItem } from '@tiptap/extension-list-item';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Strike } from '@tiptap/extension-strike';
import { Text } from '@tiptap/extension-text';
import { Underline } from '@tiptap/extension-underline';
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string';

import type { ContentRichText } from './models';

/**
 * Renders a Localess rich text field (TipTap ProseMirror document JSON) to an HTML string.
 *
 * Uses the same fixed TipTap extension set as `@localess/react`'s `renderRichTextToReact`
 * (Document, Text, Paragraph, Heading levels 1–6, Bold, Italic, Strike, Underline, History,
 * ListItem, OrderedList, BulletList, Code, CodeBlockLowlight, Link) via
 * `@tiptap/static-renderer`'s framework-agnostic HTML-string renderer — no React dependency,
 * per ADR 006.
 *
 * @example
 * ```astro
 * <LocalessRichText content={data.body} />
 * ```
 */
export function renderLocalessRichTextToHtml(content: ContentRichText): string {
  return renderToHTMLString({
    content: content as any,
    extensions: [
      Document,
      Text,
      Paragraph,
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      Bold,
      Italic,
      Strike,
      Underline,
      History,
      ListItem,
      OrderedList,
      BulletList,
      Code,
      CodeBlockLowlight,
      Link,
    ],
  });
}
