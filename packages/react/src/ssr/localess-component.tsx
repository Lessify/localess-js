import {forwardRef} from "react";
import {FONT_BOLD, FONT_NORMAL} from "../console";
import {getComponent, getFallbackComponent} from "../core/state";
import {ContentData, Links, References} from "../core/models";

/**
 * Props for {@link LocalessServerComponent}.
 *
 * @template T - The content data shape. Defaults to the base {@link ContentData} type.
 */
export type LocalessServerComponentProps<T extends ContentData = ContentData> = {
  /**
   * The content data object to render. Must have a `_schema` field that matches a key
   * in the component registry configured via `localessInit`.
   */
  data: T;
  /**
   * Optional map of content links keyed by link ID.
   * Pass through to child components so they can resolve {@link ContentLink} values with `findLink`.
   */
  links?: Links;
  /**
   * Optional map of resolved content references keyed by reference ID.
   * Pass through to child components that consume referenced content.
   */
  references?: References;
}

/**
 * Server-safe dynamic schema-to-component renderer for SSR and static-export environments.
 *
 * Equivalent to {@link LocalessComponent} but intentionally omits Visual Editor sync
 * attribute injection (`localessEditable`), making it safe for:
 * - Next.js static exports (`output: 'export'`)
 * - Server-side rendering where live editing is not needed
 *
 * Looks up `data._schema` in the component registry, renders the matched component,
 * falls back to the `fallbackComponent` if registered, or renders an inline error.
 *
 * **No `'use client'` directive** — safe to render in React Server Components.
 * If you need live Visual Editor editing use {@link LocalessComponent} from
 * `@localess/react` or `@localess/react/rsc` instead.
 *
 * @template T - The content data shape. Defaults to {@link ContentData}.
 *
 * @example
 * ```tsx
 * import { LocalessServerComponent } from '@localess/react/ssr';
 *
 * <LocalessServerComponent data={content.data} links={content.links} references={content.references} />
 * ```
 */
export const LocalessServerComponent = forwardRef<HTMLElement, LocalessServerComponentProps>(({data, links, references, ...restProps}, ref) => {
  if (!data) {
    console.error('LocalessServerComponent property %cdata%c is not provided.', FONT_BOLD, FONT_NORMAL)
    return <div>LocalessServerComponent property <b>data</b> is not provided.</div>
  }
  // Find Component from Mapping
  const Comp = getComponent(data._schema);
  if (Comp) {
    return <Comp ref={ref} data={data} links={links} references={references} {...restProps} />;
  }
  // Try to use Fallback Component
  const FallbackComponent = getFallbackComponent()
  if (FallbackComponent) {
    return <FallbackComponent ref={ref} data={data} links={links} references={references} {...restProps} />
  }
  // Missing Configuration case
  return (
    <p>
      <b>LocalessServerComponent</b> could not found component with key <b>{data._schema}</b>. <br/>
      Please check if your configuration is correct.
    </p>
  );
});
