/**
 * Core models barrel.
 *
 * Client & init types:
 *   LocalessClient   — the client instance type returned by localessInit / getLocalessClient.
 *   LocalessOptions  — full init options: LocalessClientOptions + components, fallbackComponent, enableSync.
 *
 * Content types:
 *   Content<T>          — wrapper returned by getContentBySlug / getContentById: { data, links, references }.
 *   ContentData         — base content shape with _id and _schema fields.
 *   ContentMetadata     — content metadata (slug, name, locale, publishedAt, updatedAt, …).
 *   ContentDataSchema   — minimal shape used by localessEditable: { _id, _schema }.
 *   ContentDataField    — base shape for nested content fields.
 *   ContentAsset        — asset reference with uri field; pass to resolveAsset() for a full URL.
 *   ContentRichText     — TipTap document structure; pass to renderRichTextToReact() to render.
 *   ContentLink         — link reference with type ('content' | 'url') and uri; pass to findLink() to resolve.
 *   ContentReference    — resolved content reference.
 *   Links               — Record<string, { fullSlug }> map of content links, keyed by link ID.
 *   References          — Record<string, ContentData> map of resolved references, keyed by reference ID.
 *
 * Sync / Visual Editor types:
 *   LocalessSync    — type of window.localess (exposes .on() and .onChange()).
 *   EventToApp      — event payload sent from the Visual Editor to the app.
 *   EventCallback   — callback signature for window.localess.on(events, callback).
 *   EventToAppType  — union of Visual Editor event type strings ('input' | 'change' | 'pong' | …).
 *
 * Translation types:
 *   Translations — locale-keyed flat translation record.
 */
export * from './client';
export * from './content';
export * from './sync';
export * from './translation';

