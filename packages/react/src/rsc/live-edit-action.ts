'use server';

import { clearLiveEdit, setLiveEdit } from './live-edit-cache';

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
 */
export async function localessLiveEditAction(input: LocalessLiveEditActionInput): Promise<void> {
  if (!input.id || !input.path) {
    console.error('[Localess] localessLiveEditAction: id or path is not provided');
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
