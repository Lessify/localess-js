import {renderToReactElement} from '@tiptap/static-renderer/pm/react'
import React from "react";
import {ContentRichText} from "@localess/client";
import {Document} from "@tiptap/extension-document";
import {Text} from "@tiptap/extension-text";
import {Paragraph} from "@tiptap/extension-paragraph";
import {Heading} from "@tiptap/extension-heading";
import {Bold} from "@tiptap/extension-bold";
import {Italic} from "@tiptap/extension-italic";
import {Strike} from "@tiptap/extension-strike";
import {Underline} from "@tiptap/extension-underline";
import {History} from "@tiptap/extension-history";
import {ListItem} from "@tiptap/extension-list-item";
import {OrderedList} from "@tiptap/extension-ordered-list";
import {BulletList} from "@tiptap/extension-bullet-list";
import {Code} from "@tiptap/extension-code";
import {CodeBlockLowlight} from "@tiptap/extension-code-block-lowlight";
import {Link} from "@tiptap/extension-link";

/**
 * Render Localess Rich Text content to React elements
 * @param content - The Rich Text content to render
 * @returns React.ReactNode - The rendered React elements
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
    ]
  })
}
