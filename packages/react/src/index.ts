/**
 * @localess/react
 *
 * Default export — Single Page Applications (SPA) and fully client-rendered React apps.
 * Includes the complete API: initialization, component registry, components, hooks,
 * Visual Editor live editing helpers, rich text rendering, and all TypeScript types.
 *
 * Use this export when:
 * - Building a Single Page Application (SPA) or client-rendered React app
 * - All code runs in the browser (no server components)
 * - You need live Visual Editor editing in browser-based applications
 *
 * For server-rendering without live editing use `@localess/react/ssr`.
 * For React Server Components with live editing use `@localess/react/rsc`.
 *
 * @example
 * ```ts
 * import { localessInit, LocalessComponent, useLocaless, localessEditable } from '@localess/react';
 * ```
 */

// ─── Initialization & State ───────────────────────────────────────────────────
// localessInit       — initialize client, register components, enable sync
// getLocalessClient  — access the initialized LocalessClient instance
// registerComponent / unregisterComponent / setComponents / getComponent
// setFallbackComponent / getFallbackComponent
// isSyncEnabled      — whether Visual Editor sync is active
// resolveAsset       — convert ContentAsset → full URL string
export * from './core/state';

// ─── Components ──────────────────────────────────────────────────────────────
// LocalessComponent  — maps content._schema to a registered React component; server-safe
// LocalessDocument   — wraps LocalessComponent and auto-subscribes to Visual Editor sync events; 'use client'
export * from './core/components';

// ─── Hooks ───────────────────────────────────────────────────────────────────
// useLocaless<T>     — fetch content by slug in a Client Component; subscribes to sync events when enabled
export * from './core/hooks';

// ─── Utils & Editable Helpers ────────────────────────────────────────────────
// localessEditable(content)          — returns { data-ll-id, data-ll-schema } for Visual Editor targeting
// localessEditableField<T>(fieldName) — returns { data-ll-field } for field-level Visual Editor targeting
// isBrowser / isServer / isIframe    — environment detection utilities
// findLink(links, link)              — resolve a ContentLink to a URL string
export * from './core/utils';

// ─── Rich Text ───────────────────────────────────────────────────────────────
// renderRichTextToReact(content) — convert a ContentRichText (TipTap document) to React.ReactNode
export * from './core/richtext';

// ─── TypeScript Types ────────────────────────────────────────────────────────
// LocalessOptions     — full init options (extends LocalessClientOptions with components, fallbackComponent, enableSync)
// LocalessClient      — the client instance type returned by localessInit / getLocalessClient
// Content<T>          — wrapper returned by getContentBySlug/getContentById: { data, links, references }
// ContentData         — base content shape with _id and _schema fields
// ContentMetadata     — content metadata (slug, name, locale, publishedAt, …)
// ContentDataSchema   — minimal shape used by localessEditable (_id, _schema)
// ContentDataField    — base shape for nested content fields
// ContentAsset        — asset reference with uri field; use resolveAsset() to get a full URL
// ContentRichText     — TipTap document structure; use renderRichTextToReact() to render
// ContentLink         — link reference with type ('content' | 'url') and uri; use findLink() to resolve
// ContentReference    — resolved content reference
// Links               — Record<string, { fullSlug }> map of content links
// References          — Record<string, ContentData> map of resolved references
// Translations        — locale-keyed translation record
// LocalessSync        — window.localess sync API interface
// EventToApp          — event payload sent from Visual Editor to the app
// EventCallback       — callback type for window.localess.on(…)
// EventToAppType      — union of Visual Editor event type strings
export type * from './core/models';


