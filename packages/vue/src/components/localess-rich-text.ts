import { defineComponent, type PropType } from 'vue';

import { type LocalessRichTextInput, type LocalessVueRichTextRenderers, renderRichText } from '../richtext';

/**
 * Renders a Localess rich text field.
 *
 * @example
 * ```vue
 * <LocalessRichText :content="data.body" />
 * ```
 */
export const LocalessRichText = defineComponent({
  name: 'LocalessRichText',
  props: {
    content: { type: [Object, Array] as PropType<LocalessRichTextInput>, default: undefined },
    renderers: { type: Object as PropType<LocalessVueRichTextRenderers>, default: undefined },
  },
  setup(props) {
    return () => renderRichText(props.content, { renderers: props.renderers });
  },
});
