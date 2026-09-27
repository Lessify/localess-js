declare global {
  var __localessLiveEditCache: Map<string, unknown> | undefined;
  var __localessLiveEditableIds: Set<string> | undefined;
}

function getCache(): Map<string, unknown> {
  globalThis.__localessLiveEditCache = globalThis.__localessLiveEditCache ?? new Map<string, unknown>();
  return globalThis.__localessLiveEditCache;
}

function getLiveEditableIds(): Set<string> {
  globalThis.__localessLiveEditableIds = globalThis.__localessLiveEditableIds ?? new Set<string>();
  return globalThis.__localessLiveEditableIds;
}

/**
 * Records that this server rendered a content item with live sync enabled, making its `id`
 * eligible for {@link localessLiveEditAction}. The action rejects any other `id`, so a caller
 * can't grow the cache with arbitrary keys. Called by `/rsc`'s `LocalessDocument`.
 */
export function markLiveEditable(id: string): void {
  getLiveEditableIds().add(id);
}

/** Whether {@link markLiveEditable} has been called for this `id`. */
export function isLiveEditable(id: string): boolean {
  return getLiveEditableIds().has(id);
}

/**
 * Stores an in-flight Visual Editor edit for a content item, keyed by its `id`.
 * Called by {@link localessLiveEditAction} on `input`/`change` events.
 */
export function setLiveEdit(id: string, data: unknown): void {
  getCache().set(id, data);
}

/**
 * Reads and immediately removes the cached edit for a content item — a one-shot
 * overlay, not a persistent read. Safe because a live-editing session re-writes the
 * cache on every subsequent keystroke; nothing is lost across a single render.
 */
export function consumeLiveEdit(id: string): unknown | undefined {
  const cache = getCache();
  const value = cache.get(id);
  cache.delete(id);
  return value;
}

/**
 * Removes a cached edit without reading it. Called by {@link localessLiveEditAction}
 * on `save`/`publish`/`unpublish`, since the CMS API becomes the source of truth again.
 */
export function clearLiveEdit(id: string): void {
  getCache().delete(id);
}
