import { Pipe, PipeTransform } from '@angular/core';
import type { JSONContent } from '@tiptap/core';
import type { ContentRichText } from '@localess/client';

let extensionsPromise: ReturnType<typeof loadExtensions> | undefined;

function loadExtensions() {
  return Promise.all([
      import('@tiptap/html'),
      import('@tiptap/extension-document'),
      import('@tiptap/extension-text'),
      import('@tiptap/extension-paragraph'),
      import('@tiptap/extension-heading'),
      import('@tiptap/extension-bold'),
      import('@tiptap/extension-italic'),
      import('@tiptap/extension-strike'),
      import('@tiptap/extension-underline'),
      import('@tiptap/extension-history'),
      import('@tiptap/extension-list-item'),
      import('@tiptap/extension-ordered-list'),
      import('@tiptap/extension-bullet-list'),
      import('@tiptap/extension-code'),
      import('@tiptap/extension-code-block-lowlight'),
      import('@tiptap/extension-link'),
    ]).then(
      ([html, Document, Text, Paragraph, Heading, Bold, Italic, Strike, Underline, History, ListItem, OrderedList, BulletList, Code, CodeBlockLowlight, Link]) => ({
        generateHTML: html.generateHTML,
        extensions: [
          Document.default,
          Text.default,
          Paragraph.default,
          Heading.default.configure({ levels: [1, 2, 3, 4, 5, 6] }),
          Bold.default,
          Italic.default,
          Strike.default,
          Underline.default,
          History.default,
          ListItem.default,
          OrderedList.default,
          BulletList.default,
          Code.default,
          CodeBlockLowlight.default,
          Link.default,
        ],
      })
    );
}

async function loadTiptap() {
  if (!extensionsPromise) {
    extensionsPromise = loadExtensions();
  }
  return extensionsPromise;
}

@Pipe({
  name: 'llRtToHtml',
  standalone: true,
})
export class RichTextToHtmlPipe implements PipeTransform {
  async transform(value: JSONContent | ContentRichText | string | undefined | null): Promise<string> {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    const { generateHTML, extensions } = await loadTiptap();
    return generateHTML(value as JSONContent, extensions);
  }
}
