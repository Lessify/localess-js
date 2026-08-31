import {
  buildMarkTree,
  type LocalessRichTextInput,
  type LocalessRichTextNodeWithKey,
  MARK_RENDER_MAP,
  type MarkTreeSegment,
  NODE_RENDER_MAP,
  normalizeInput,
  processAttrs,
} from '@localess/richtext';
import React, { type ComponentType, type ReactNode } from 'react';

const REACT_ATTR_MAP = { class: 'className' };

/** Override map: node/mark type → React component receiving the node's fields plus `children` and `context`. */
export type LocalessReactRichTextRenderers = Record<string, ComponentType<any> | undefined>;

export interface LocalessReactRichTextOptions {
  renderers?: LocalessReactRichTextRenderers;
}

interface Ctx {
  renderers?: LocalessReactRichTextRenderers;
  warned: Set<string>;
}

/**
 * Renders a Localess rich text field to React nodes — no TipTap, no browser
 * APIs; safe in SPA, SSR, and React Server Components.
 *
 * @example
 * ```tsx
 * <article>{renderRichText(data.body)}</article>
 * ```
 */
export function renderRichText(content: LocalessRichTextInput, options: LocalessReactRichTextOptions = {}): ReactNode {
  const nodes = normalizeInput(content, { withKeys: true });
  if (nodes.length === 0) return null;
  return renderNodes(nodes, { renderers: options.renderers, warned: new Set() });
}

function renderNodes(nodes: LocalessRichTextNodeWithKey[], ctx: Ctx): ReactNode[] {
  const out: ReactNode[] = [];
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
      out.push(renderNode(node, ctx));
      i++;
    }
  }
  return out;
}

function renderNode(node: LocalessRichTextNodeWithKey, ctx: Ctx): ReactNode {
  const key = node._key;
  const custom = ctx.renderers?.[node.type];
  if (custom) {
    const childRenderers = { ...ctx.renderers, [node.type]: undefined };
    const childCtx: Ctx = { renderers: childRenderers, warned: ctx.warned };
    const children = node.type === 'text' ? (node as any).text : renderNodes(((node as any).content ?? []) as any, childCtx);
    return React.createElement(custom, { key, ...(node as any), context: { renderers: childRenderers } }, children);
  }
  if (node.type === 'text') {
    return renderSegments(buildMarkTree([node as any]), ctx, key ?? 'text');
  }
  const spec = NODE_RENDER_MAP[node.type];
  if (spec === undefined) {
    warnUnknown(ctx, node.type);
    return null;
  }
  const children = renderNodes(((node as any).content ?? []) as any, ctx);
  if (spec === null) {
    return React.createElement(React.Fragment, { key }, children);
  }
  const attrs = processAttrs(node.type, (node as any).attrs, { attrMap: REACT_ATTR_MAP });
  if (spec.children) {
    let inner: ReactNode = children;
    for (let i = spec.children.length - 1; i >= 0; i--) {
      const child = spec.children[i];
      inner = React.createElement(child.tag, child.content ? attrs : {}, inner);
    }
    return React.createElement(spec.tag!, { key }, inner);
  }
  const tag = spec.resolve ? spec.resolve((node as any).attrs) : spec.tag!;
  return React.createElement(tag, { key, ...attrs }, children.length > 0 ? children : undefined);
}

function renderSegments(segments: MarkTreeSegment[], ctx: Ctx, keyPrefix: string): ReactNode[] {
  return segments.map((segment, index) => {
    const key = `${keyPrefix}-${index}`;
    if (segment.kind === 'text') return segment.text;
    const children = renderSegments(segment.children, ctx, key);
    const custom = ctx.renderers?.[segment.mark.type];
    if (custom) {
      return React.createElement(custom, { key, ...(segment.mark as any), context: { renderers: ctx.renderers } }, children);
    }
    const spec = MARK_RENDER_MAP[segment.mark.type];
    if (!spec) {
      warnUnknown(ctx, segment.mark.type);
      return React.createElement(React.Fragment, { key }, children);
    }
    const attrs = processAttrs(segment.mark.type, (segment.mark as any).attrs, { attrMap: REACT_ATTR_MAP });
    return React.createElement(spec.tag!, { key, ...attrs }, children);
  });
}

function warnUnknown(ctx: Ctx, type: string): void {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') return;
  if (ctx.warned.has(type)) return;
  ctx.warned.add(type);
  console.warn(`[@localess/richtext] Unknown rich text element "${type}" was skipped. Provide a custom renderer to handle it.`);
}
