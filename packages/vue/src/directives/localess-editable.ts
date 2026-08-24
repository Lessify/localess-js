import { localessEditable, type ContentDataSchema } from '@localess/client';
import type { ObjectDirective } from 'vue';

function apply(el: HTMLElement, content: ContentDataSchema): void {
  const attrs = localessEditable(content);
  el.setAttribute('data-ll-id', attrs['data-ll-id']);
  el.setAttribute('data-ll-schema', attrs['data-ll-schema']);
}

export const vLocalessEditable: ObjectDirective<HTMLElement, ContentDataSchema> = {
  mounted(el, binding) {
    apply(el, binding.value);
  },
  updated(el, binding) {
    apply(el, binding.value);
  },
};
