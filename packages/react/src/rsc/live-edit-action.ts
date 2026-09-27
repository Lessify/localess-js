'use server';

import { isSyncConfigured } from '../core/client';
import { clearLiveEdit, isLiveEditable, setLiveEdit } from './live-edit-cache';

const EVENT_TYPES: ReadonlySet<string> = new Set(['input', 'change', 'save', 'publish', 'unpublish']);
const MAX_PATH_LENGTH = 2048;

export type LocalessLiveEditActionInput = {
  /** The content's top-level `id` (`Content.id`), used as the live-edit cache key. */
  id: string;
  /** The current page path, passed to `revalidatePath`. */
  path: string;
  type: 'input' | 'change' | 'save' | 'publish' | 'unpublish';
  /** The edited content data — present for `input`/`change`, absent otherwise. */
  data?: unknown;
};

/**
 * Server Action shipped inside `@localess/react/rsc` — consumers never author or call
 * this directly; {@link LiveEditListener} calls it on every Visual Editor sync event.
 *
 * On `input`/`change`, stashes the edited (unsaved) data in the in-process live-edit
 * cache. On `save`/`publish`/`unpublish`, clears it instead, since the CMS API is the
 * source of truth again. Always calls `revalidatePath` so Next.js refreshes the
 * Server Component tree, which re-renders using the cache and the server's own
 * component registry.
 *
 * A Server Action is a public endpoint, so every call is checked server-side and dropped
 * unless the server's `localessInit()` set `enableSync: true`, the `id` belongs to a
 * document this server rendered, and `type`, `path` and `data` are well-formed.
 */
export async function localessLiveEditAction(input: LocalessLiveEditActionInput): Promise<void> {
  if (!isSyncConfigured()) {
    console.error('[Localess] localessLiveEditAction: rejected, enableSync is not set in the server-side localessInit()');
    return;
  }
  if (typeof input?.id !== 'string' || typeof input.path !== 'string' || !input.id || !input.path) {
    console.error('[Localess] localessLiveEditAction: id or path is not provided');
    return;
  }
  if (!isLiveEditable(input.id) || !EVENT_TYPES.has(input.type) || !isSafePath(input.path)) {
    console.error('[Localess] localessLiveEditAction: rejected invalid id, type or path');
    return;
  }
  if ((input.type === 'input' || input.type === 'change') && !isPlainObject(input.data)) {
    console.error('[Localess] localessLiveEditAction: rejected, data must be an object');
    return;
  }

  if (input.type === 'input' || input.type === 'change') {
    setLiveEdit(input.id, input.data);
  } else {
    clearLiveEdit(input.id);
  }

  if (process.env.NEXT_RUNTIME) {
    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath(input.path);
    } catch (error) {
      console.error('[Localess] localessLiveEditAction: error while revalidating path', error);
    }
  }
}

function isSafePath(path: string): boolean {
  return path.length <= MAX_PATH_LENGTH && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
