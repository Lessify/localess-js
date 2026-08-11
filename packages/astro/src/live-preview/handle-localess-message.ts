import morphdom from 'morphdom';

import type { EventToApp } from '../models';

const DEBOUNCE_DELAY_MS = 500;
const LL_ID_ATTRIBUTE = 'data-ll-id';

let timeout: ReturnType<typeof setTimeout>;
let abortController: AbortController | null = null;

/**
 * Handles Visual Editor sync events for the `livePreview: true` tier.
 *
 * `save`/`publish`/`unpublish` reload the page. `input`/`change` debounce (~500ms),
 * POST the updated content to the current page (validated server-side by
 * `live-preview/middleware.ts`), and morphdom-patch the returned HTML into the live DOM
 * instead of reloading — keyed by `data-ll-id`, mirroring `@storyblok/astro`'s
 * `data-blok-uid` keying strategy. Other event types (`pong`, `enterSchema`, `hoverSchema`,
 * `leaveSchema`) are no-ops here; they don't affect page content.
 */
export async function handleLocalessMessage(event: EventToApp): Promise<void> {
  if (event.type === 'save' || event.type === 'publish' || event.type === 'unpublish') {
    location.reload();
    return;
  }

  if (event.type !== 'input' && event.type !== 'change') {
    return;
  }

  if (abortController) {
    abortController.abort();
  }
  clearTimeout(timeout);

  timeout = setTimeout(async () => {
    try {
      await patchWithUpdatedContent(event.data);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('[Localess] Failed to update live preview:', error);
    }
  }, DEBOUNCE_DELAY_MS);
}

async function patchWithUpdatedContent(data: unknown): Promise<void> {
  abortController = new AbortController();

  const response = await fetch(location.href, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, spaceId: window.__localessSpaceId }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch updated HTML: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const newBody = new DOMParser().parseFromString(html, 'text/html').body;

  morphdom(document.body, newBody, {
    getNodeKey(node: Node) {
      if (node.nodeType === 1) {
        return (node as Element).getAttribute(LL_ID_ATTRIBUTE) ?? undefined;
      }
      return undefined;
    },
  });
}

declare global {
  interface Window {
    /** Set by the `localess()` integration's live-preview injected script (Task 6). */
    __localessSpaceId?: string;
  }
}
