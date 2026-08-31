import { processAttrs } from './attrs';
import { escapeAttr, escapeHtml } from './escape';
import { buildMarkTree, type MarkTreeSegment } from './marks';
import type { LocalessRichTextInput, LocalessRichTextNode, LocalessRichTextRenderers } from './model';
import { normalizeInput } from './normalize';
import { MARK_RENDER_MAP, NODE_RENDER_MAP } from './render-map';

export interface LocalessRichTextHtmlOptions {
  /** Per-type overrides. A custom renderer receives pre-rendered `children` and a loop-safe `context`. */
  renderers?: LocalessRichTextRenderers<string>;
}

interface Ctx {
  renderers?: LocalessRichTextRenderers<string>;
  warned: Set<string>;
}

/**
 * Renders Localess rich text JSON to an HTML string. Framework-neutral,
 * dependency-free, and byte-compatible with TipTap's `generateHTML` for the
 * node set the Localess Studio editor produces.
 */
export function renderRichTextToHtml(input: LocalessRichTextInput, options: LocalessRichTextHtmlOptions = {}): string {
  return renderNodes(normalizeInput(input), { renderers: options.renderers, warned: new Set() });
}

function renderNodes(nodes: LocalessRichTextNode[], ctx: Ctx): string {
  let result = '';
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (node.type === 'text' && !ctx.renderers?.text) {
      const run: Array<{ text: string; marks?: any[] }> = [];
      while (i < nodes.length && nodes[i].type === 'text') {
        run.push(nodes[i] as any);
        i++;
      }
      result += renderSegments(buildMarkTree(run), ctx);
    } else {
      result += renderNode(node, ctx);
      i++;
    }
  }
  return result;
}

function renderNode(node: LocalessRichTextNode, ctx: Ctx): string {
  const custom = ctx.renderers?.[node.type];
  if (custom) {
    const childRenderers = { ...ctx.renderers, [node.type]: undefined };
    const childCtx: Ctx = { renderers: childRenderers, warned: ctx.warned };
    const children = node.type === 'text' ? escapeHtml((node as any).text ?? '') : renderNodes((node as any).content ?? [], childCtx);
    return custom({ ...(node as any), children, context: { renderers: childRenderers } });
  }
  if (node.type === 'text') {
    return renderSegments(buildMarkTree([node as any]), ctx);
  }
  const spec = NODE_RENDER_MAP[node.type];
  if (spec === undefined) {
    warnUnknown(ctx, node.type);
    return '';
  }
  if (spec === null) {
    return renderNodes((node as any).content ?? [], ctx);
  }
  const attrs = processAttrs(node.type, (node as any).attrs);
  const children = renderNodes((node as any).content ?? [], ctx);
  if (spec.children) {
    let inner = children;
    for (let i = spec.children.length - 1; i >= 0; i--) {
      const child = spec.children[i];
      inner = wrapTag(child.tag, child.content ? attrs : {}, inner);
    }
    return wrapTag(spec.tag!, {}, inner);
  }
  const tag = spec.resolve ? spec.resolve((node as any).attrs) : spec.tag!;
  return wrapTag(tag, attrs, children);
}

function renderSegments(segments: MarkTreeSegment[], ctx: Ctx): string {
  let out = '';
  for (const segment of segments) {
    if (segment.kind === 'text') {
      out += escapeHtml(segment.text);
      continue;
    }
    const children = renderSegments(segment.children, ctx);
    const custom = ctx.renderers?.[segment.mark.type];
    if (custom) {
      out += custom({ ...(segment.mark as any), children, context: { renderers: ctx.renderers } });
      continue;
    }
    const spec = MARK_RENDER_MAP[segment.mark.type];
    if (!spec) {
      warnUnknown(ctx, segment.mark.type);
      out += children;
      continue;
    }
    out += wrapTag(spec.tag!, processAttrs(segment.mark.type, (segment.mark as any).attrs), children);
  }
  return out;
}

function wrapTag(tag: string, attrs: Record<string, any>, children: string): string {
  let open = `<${tag}`;
  for (const [name, value] of Object.entries(attrs)) {
    open += ` ${name}="${escapeAttr(String(value))}"`;
  }
  return `${open}>${children}</${tag}>`;
}

function warnUnknown(ctx: Ctx, type: string): void {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') return;
  if (ctx.warned.has(type)) return;
  ctx.warned.add(type);
  console.warn(`[@localess/richtext] Unknown rich text element "${type}" was skipped. Provide a custom renderer to handle it.`);
}
