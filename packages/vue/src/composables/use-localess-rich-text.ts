import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import Code from '@tiptap/extension-code';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Document from '@tiptap/extension-document';
import Heading from '@tiptap/extension-heading';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import Paragraph from '@tiptap/extension-paragraph';
import Strike from '@tiptap/extension-strike';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import type { JSONContent } from '@tiptap/core';
import { generateHTML } from '@tiptap/html';
import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';

const EXTENSIONS = [
  Document,
  Paragraph,
  Text,
  Bold,
  Italic,
  Underline,
  Strike,
  Code,
  CodeBlockLowlight,
  Heading,
  BulletList,
  OrderedList,
  ListItem,
  Link,
];

export function useLocalessRichText(doc: MaybeRefOrGetter<JSONContent | undefined>): ComputedRef<string> {
  return computed(() => {
    const value = toValue(doc);
    if (!value) return '';
    return generateHTML(value, EXTENSIONS);
  });
}
