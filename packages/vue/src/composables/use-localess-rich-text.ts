import { computed, type ComputedRef, type MaybeRefOrGetter, toValue, type VNodeChild } from 'vue';

import {
  type LocalessRichTextInput,
  type LocalessRichTextRenderers,
  type LocalessVueRichTextOptions,
  renderRichText,
  renderRichTextToHtml,
} from '../richtext';

/**
 * Reactive rich text → VNodes. Re-renders when the doc (or a ref/getter it
 * derives from) changes — Visual Editor live-sync safe.
 */
export function useLocalessRichText(
  doc: MaybeRefOrGetter<LocalessRichTextInput>,
  options: LocalessVueRichTextOptions = {}
): ComputedRef<VNodeChild> {
  return computed(() => renderRichText(toValue(doc), options));
}

/** Reactive rich text → HTML string, for `v-html` bindings. */
export function useLocalessRichTextHtml(
  doc: MaybeRefOrGetter<LocalessRichTextInput>,
  options: { renderers?: LocalessRichTextRenderers<string> } = {}
): ComputedRef<string> {
  return computed(() => renderRichTextToHtml(toValue(doc), options));
}
