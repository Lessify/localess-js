import { sanitizeUrl } from './escape';

export interface ProcessAttrsOptions {
  /** Per-framework attribute renames, e.g. `{ class: 'className' }` for React. */
  attrMap?: Record<string, string>;
}

/**
 * Normalizes a node/mark's stored attrs into the attributes to emit, in the
 * order TipTap's `generateHTML` emits them (parity-tested — adjust order here
 * and in the fixtures together if the parity test disagrees).
 */
export function processAttrs(type: string, attrs: Record<string, any> | undefined, options: ProcessAttrsOptions = {}): Record<string, any> {
  const out: Record<string, any> = {};
  const name = (key: string) => options.attrMap?.[key] ?? key;
  const put = (key: string, value: any) => {
    if (value === null || value === undefined || value === '') return;
    out[name(key)] = value;
  };
  if (!attrs) return out;

  switch (type) {
    case 'orderedList':
      if (attrs.start !== null && attrs.start !== undefined && attrs.start !== 1) put('start', attrs.start);
      break;
    case 'codeBlock':
      if (attrs.language) put('class', `language-${attrs.language}`);
      break;
    case 'link':
      put('target', attrs.target);
      put('rel', attrs.rel);
      out[name('href')] = sanitizeUrl(String(attrs.href ?? ''));
      put('class', attrs.class);
      break;
    default:
      break;
  }
  return out;
}
