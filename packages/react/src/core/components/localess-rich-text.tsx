import type { LocalessRichTextInput } from '@localess/richtext';
import React from 'react';

import { type LocalessReactRichTextRenderers, renderRichText } from '../richtext';

export interface LocalessRichTextProps {
  /** The rich text field value (`ContentRichText` / TipTap JSON). */
  content: LocalessRichTextInput;
  /** Optional per-node/per-mark overrides (React components). */
  renderers?: LocalessReactRichTextRenderers;
}

/**
 * Renders a Localess rich text field.
 *
 * @example
 * ```tsx
 * <LocalessRichText content={data.body} />
 * ```
 */
export function LocalessRichText({ content, renderers }: LocalessRichTextProps): React.ReactNode {
  return renderRichText(content, { renderers });
}
