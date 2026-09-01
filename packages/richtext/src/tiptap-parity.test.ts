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
import { generateHTML } from '@tiptap/html';
import { describe, expect, it } from 'vitest';

import { renderRichTextToHtml } from './render-html';
import { richTextFixtures } from './test-utils';

/** Mirrors the Localess Studio editor's extension list exactly. */
const CMS_EXTENSIONS = [
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
];

describe('byte parity with TipTap generateHTML', () => {
  for (const fixture of richTextFixtures.filter(f => f.parity)) {
    it(fixture.title, () => {
      expect(renderRichTextToHtml(fixture.input)).toBe(generateHTML(fixture.input as any, CMS_EXTENSIONS));
    });
  }
});
