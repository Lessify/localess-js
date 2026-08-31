/**
 * Rich text rendering for Astro — a thin pass-through to `@localess/richtext`'s
 * dependency-free HTML renderer. `renderLocalessRichTextToHtml` keeps its
 * historical name for standalone imports; `renderRichTextToHtml` is the
 * canonical name shared across Localess SDKs.
 */
export {
  type LocalessRichTextHtmlOptions,
  type LocalessRichTextInput,
  type LocalessRichTextRenderers,
  renderRichTextToHtml as renderLocalessRichTextToHtml,
  renderRichTextToHtml,
} from '@localess/richtext';
