import type { Action } from 'svelte/action';

import type {  ContentDataSchema } from '../models';
import {localessEditable as buildAttrs } from '../utils';

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
