import type { LocalessRichTextInput, LocalessRichTextNode, LocalessRichTextNodeWithKey } from './model';

export interface NormalizeInputOptions {
  /** Inject recursive `_key` values (`paragraph-1`, `text-3`, …) for keyed renderers. */
  withKeys?: boolean;
}

/**
 * Flattens any accepted rich text input (document, node, node array, or the
 * loose `ContentRichText` shape from `@localess/model`) into a node list.
 * Never throws; malformed input yields `[]`.
 */
export function normalizeInput(input: LocalessRichTextInput, options: NormalizeInputOptions = {}): LocalessRichTextNodeWithKey[] {
  let nodes: LocalessRichTextNode[];
  if (!input) {
    nodes = [];
  } else if (Array.isArray(input)) {
    nodes = input as LocalessRichTextNode[];
  } else if ((input as { type?: string }).type === 'doc') {
    nodes = ((input as { content?: LocalessRichTextNode[] }).content ?? []) as LocalessRichTextNode[];
  } else if (typeof (input as { type?: string }).type === 'string') {
    nodes = [input as LocalessRichTextNode];
  } else {
    nodes = [];
  }
  return options.withKeys ? addKeys(nodes, {}) : nodes;
}

function addKeys(nodes: LocalessRichTextNode[], counters: Record<string, number>): LocalessRichTextNodeWithKey[] {
  return nodes.map(node => {
    counters[node.type] = (counters[node.type] ?? 0) + 1;
    const keyed: any = { ...node, _key: `${node.type}-${counters[node.type]}` };
    if (Array.isArray(keyed.content)) {
      keyed.content = addKeys(keyed.content, counters);
    }
    return keyed;
  });
}
