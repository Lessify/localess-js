import { localessEditable as buildAttrs, type ContentDataSchema } from '@localess/client';
import type { Action } from 'svelte/action';

function apply(node: HTMLElement, content: ContentDataSchema): void {
  const attrs = buildAttrs(content);
  node.setAttribute('data-ll-id', attrs['data-ll-id']);
  node.setAttribute('data-ll-schema', attrs['data-ll-schema']);
}

export const localessEditable: Action<HTMLElement, ContentDataSchema> = (node, content) => {
  apply(node, content);
  return {
    update(newContent: ContentDataSchema) {
      apply(node, newContent);
    },
  };
};
