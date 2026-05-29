import {Pipe, PipeTransform} from "@angular/core";
import {JSONContent} from "@tiptap/core";
import {generateHTML} from '@tiptap/html'
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Underline from '@tiptap/extension-underline';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Paragraph from '@tiptap/extension-paragraph';
import History from '@tiptap/extension-history';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import BulletList from '@tiptap/extension-bullet-list';
import Code from '@tiptap/extension-code';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import Heading from '@tiptap/extension-heading';
import type {ContentRichText} from "../models";

@Pipe({
  name: "llRtToHtml",
  standalone: true,
})
export class RichTextToHtmlPipe implements PipeTransform {
  transform(value: JSONContent | ContentRichText | string | any | undefined | null): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    return generateHTML(value, [
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
    ]);
  }
}
