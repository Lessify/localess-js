import { ContentRichText } from '@localess/client';
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
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import React from 'react';

/**
 * Renders a Localess rich text field to a React node tree.
 *
 * Converts a {@link ContentRichText} value (TipTap ProseMirror document JSON) into
 * `React.ReactNode` using TipTap's static renderer. No browser APIs are required —
 * safe to call in React Server Components and SSR.
 *
 * Supported TipTap extensions: Document, Text, Paragraph, Heading (h1–h6), Bold,
 * Italic, Strike, Underline, History, ListItem, OrderedList, BulletList, Code,
 * CodeBlockLowlight, Link.
 *
 * @param content - The rich text value from a Localess content field (type `ContentRichText`).
 * @returns A `React.ReactNode` ready to render inside JSX.
 *
 * @example
 * ```tsx
 * import { renderRichTextToReact } from '@localess/react';
 *
 * export function Article({ data }: { data: MyContent }) {
 *   return <article>{renderRichTextToReact(data.body)}</article>;
 * }
 * ```
 */
export function renderRichTextToReact(content: ContentRichText): React.ReactNode {
  return renderToReactElement({
    content,
    extensions: [
      Document,
      Text,
      Paragraph,
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
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
