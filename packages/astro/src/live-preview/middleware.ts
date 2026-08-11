import { defineMiddleware } from 'astro/middleware';
// @ts-expect-error — resolved by vite-plugin-localess-options at the consumer's build time, not this package's own build.
import options from 'virtual:localess-options';

/**
 * Intercepts Visual Editor live-preview POST requests (sent by `handleLocalessMessage`)
 * and stashes the draft content into `context.locals._localess_preview_data` so page
 * frontmatter can prefer it over a fresh API fetch — see `getLivePayload`.
 *
 * Validates the request is same-origin (`Sec-Fetch-Site: same-origin`, set automatically
 * by the browser on our own script's `fetch()` call) and carries a `spaceId` matching the
 * one configured for `localess()`, read via `virtual:localess-options` — not
 * `import.meta.env`, which would get statically inlined (and dead-code-eliminated, since
 * this package ships pre-built code) at `@localess/astro`'s own build time rather than the
 * consumer's. Unlike `@storyblok/astro`'s `isEditorRequest`, this can't check URL query
 * parameters: the Localess Visual Editor's preview iframe URL carries none (confirmed
 * against the `localess` editor app's `content-preview.component.ts`).
 */
export const onRequest = defineMiddleware(async ({ request, locals }, next) => {
  if (request.method === 'POST' && request.headers.get('content-type')?.includes('application/json')) {
    const sameOrigin = request.headers.get('sec-fetch-site') === 'same-origin';
    const expectedSpaceId = options.spaceId;

    if (sameOrigin && expectedSpaceId) {
      try {
        const body = await request.clone().json();
        if (body?.spaceId === expectedSpaceId && body?.data) {
          locals._localess_preview_data = { data: body.data };
        }
      } catch (error) {
        console.error('[Localess] Error reading live-preview request body:', error);
      }
    }
  }
  return next();
});
