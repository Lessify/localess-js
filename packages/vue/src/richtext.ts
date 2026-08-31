import {
  buildMarkTree,
  type LocalessRichTextInput,
  type LocalessRichTextNodeWithKey,
  type LocalessRichTextRenderers,
  MARK_RENDER_MAP,
  type MarkTreeSegment,
  NODE_RENDER_MAP,
  normalizeInput,
  processAttrs,
  renderRichTextToHtml,
} from '@localess/richtext';
import { type Component, createTextVNode, Fragment, h, type VNodeChild } from 'vue';

/** Override map: node/mark type → Vue component; children arrive as the default slot. */
export type LocalessVueRichTextRenderers = Record<string, Component | undefined>;

export interface LocalessVueRichTextOptions {
  renderers?: LocalessVueRichTextRenderers;
}

interface Ctx {
  renderers?: LocalessVueRichTextRenderers;
  warned: Set<string>;
}

export { type LocalessRichTextInput, type LocalessRichTextRenderers, renderRichTextToHtml };

/**
 * Renders a Localess rich text field to Vue VNodes.
 *
 * @example
 * ```ts
 * h('article', renderRichText(data.body))
 * ```
 */
export function renderRichText(content: LocalessRichTextInput, options: LocalessVueRichTextOptions = {}): VNodeChild {
  const nodes = normalizeInput(content, { withKeys: true });
  if (nodes.length === 0) return null;
  return renderNodes(nodes, { renderers: options.renderers, warned: new Set() });
}

function renderNodes(nodes: LocalessRichTextNodeWithKey[], ctx: Ctx): VNodeChild[] {
  const out: VNodeChild[] = [];
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (node.type === 'text' && !ctx.renderers?.text) {
      const run: any[] = [];
      while (i < nodes.length && nodes[i].type === 'text') {
        run.push(nodes[i]);
        i++;
      }
      out.push(...renderSegments(buildMarkTree(run), ctx, run[0]._key ?? 'text'));
    } else {
      const rendered = renderNode(node, ctx);
      // Skipped (unknown) nodes return null — dropping them avoids Vue's `<!---->` comment placeholders.
      if (rendered !== null) out.push(rendered);
      i++;
    }
  }
  return out;
}

function renderNode(node: LocalessRichTextNodeWithKey, ctx: Ctx): VNodeChild {
  const key = node._key;
  const custom = ctx.renderers?.[node.type];
  if (custom) {
    const childRenderers = { ...ctx.renderers, [node.type]: undefined };
    const childCtx: Ctx = { renderers: childRenderers, warned: ctx.warned };
    const children =
      node.type === 'text' ? [createTextVNode((node as any).text ?? '')] : renderNodes(((node as any).content ?? []) as any, childCtx);
    return h(custom as any, { key, ...(node as any), context: { renderers: childRenderers } }, { default: () => children });
  }
  if (node.type === 'text') {
    return h(Fragment, { key }, renderSegments(buildMarkTree([node as any]), ctx, key ?? 'text'));
  }
  const spec = NODE_RENDER_MAP[node.type];
  if (spec === undefined) {
    warnUnknown(ctx, node.type);
    return null;
  }
  const children = renderNodes(((node as any).content ?? []) as any, ctx);
  if (spec === null) {
    return h(Fragment, { key }, children);
  }
  const attrs = processAttrs(node.type, (node as any).attrs);
  if (spec.children) {
    let inner: VNodeChild = children;
    for (let i = spec.children.length - 1; i >= 0; i--) {
      const child = spec.children[i];
      inner = h(child.tag, child.content ? attrs : {}, inner as any);
    }
    return h(spec.tag!, { key }, inner as any);
  }
  const tag = spec.resolve ? spec.resolve((node as any).attrs) : spec.tag!;
  return h(tag, { key, ...attrs }, children);
}

function renderSegments(segments: MarkTreeSegment[], ctx: Ctx, keyPrefix: string): VNodeChild[] {
  return segments.map((segment, index) => {
    const key = `${keyPrefix}-${index}`;
    if (segment.kind === 'text') return createTextVNode(segment.text);
    const children = renderSegments(segment.children, ctx, key);
    const custom = ctx.renderers?.[segment.mark.type];
    if (custom) {
      return h(custom as any, { key, ...(segment.mark as any), context: { renderers: ctx.renderers } }, { default: () => children });
    }
    const spec = MARK_RENDER_MAP[segment.mark.type];
    if (!spec) {
      warnUnknown(ctx, segment.mark.type);
      return h(Fragment, { key }, children);
    }
    return h(spec.tag!, { key, ...processAttrs(segment.mark.type, (segment.mark as any).attrs) }, children);
  });
}

function warnUnknown(ctx: Ctx, type: string): void {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') return;
  if (ctx.warned.has(type)) return;
  ctx.warned.add(type);
  console.warn(`[@localess/richtext] Unknown rich text element "${type}" was skipped. Provide a custom renderer to handle it.`);
}
