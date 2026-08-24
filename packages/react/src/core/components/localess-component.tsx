import { forwardRef } from 'react';

import { FONT_BOLD, FONT_NORMAL } from '../../console';
import type { LocalessComponentProps } from '../models';
import { getComponent, getFallbackComponent } from '../state';
import { localessEditable } from '../utils';

export type { LocalessComponentProps } from '../models';

/**
 * Dynamic schema-to-component renderer for use in SPA and client-side contexts.
 *
 * Looks up `data._schema` in the component registry (set via `localessInit` or `setComponents`),
 * renders the matched component, and always spreads `localessEditable` attributes on the root
 * element (`data-ll-id` / `data-ll-schema`) so the Visual Editor can target it for live editing.
 *
 * Falls back to the `fallbackComponent` (if registered) when the schema key is not found,
 * or renders an inline error message as a last resort.
 *
 * **Server-safe** — does not include a `'use client'` directive and can be used in
 * React Server Components. For SSR / static-export environments use {@link LocalessServerComponent}
 * from `@localess/react/ssr` instead, which omits the sync attribute injection.
 *
 * @template T - The content data shape. Defaults to {@link ContentData}.
 *
 * @example Basic usage
 * ```tsx
 * import { LocalessComponent } from '@localess/react';
 *
 * <LocalessComponent data={content.data} links={content.links} references={content.references} />
 * ```
 *
 * @example Rendering a list of nested blocks
 * ```tsx
 * {data.body.map(item => (
 *   <LocalessComponent key={item._id} data={item} links={content.links} references={content.references} />
 * ))}
 * ```
 */
export const LocalessComponent = forwardRef<HTMLElement, LocalessComponentProps>(
  ({ data, links, references, assets, ...restProps }, ref) => {
    if (!data) {
      console.error('LocalessComponent property %cdata%c is not provided.', FONT_BOLD, FONT_NORMAL);
      return (
        <div>
          LocalessComponent property <b>data</b> is not provided.
        </div>
      );
    }
    // Find Component from Mapping
    const Comp = getComponent(data._schema);
    if (Comp) {
      return (
        <Comp ref={ref} data={data} assets={assets} links={links} references={references} {...localessEditable(data)} {...restProps} />
      );
    }
    // Try to use Fallback Component
    const FallbackComponent = getFallbackComponent();
    if (FallbackComponent) {
      return <FallbackComponent ref={ref} data={data} assets={assets} links={links} references={references} {...restProps} />;
    }
    // Missing Configuration case
    return (
      <p>
        <b>LocalessComponent</b> could not found component with key <b>{data._schema}</b>. <br />
        Please check if your configuration is correct.
      </p>
    );
  }
);
