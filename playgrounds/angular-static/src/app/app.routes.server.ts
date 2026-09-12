import { inject } from '@angular/core';
import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { LocalessContentService } from '@localess/angular';
import { LOCALES } from './shared/utils/locales';

/**
 * Enumerates every locale/slug combination the wildcard route can serve.
 *
 * With `outputMode: 'static'` there is no request-time server, so each navigable URL needs
 * its own prerendered HTML file. `getPrerenderParams` runs inside the injector context,
 * which is what lets it fetch the space's document links through `LocalessContentService`.
 */
async function prerenderPaths(): Promise<Record<string, string>[]> {
  const links = await inject(LocalessContentService).links({ kind: 'DOCUMENT' });
  const slugs = new Set(['home', ...Object.values(links).map(link => link.fullSlug)]);

  return LOCALES.flatMap(locale => {
    // The bare locale root and an explicit "home" slug resolve to the same content — see
    // `resolveLocaleAndSlug` — so both are emitted, deduped through the joined path.
    const paths = new Set(Array.from(slugs, slug => [locale.id, ...slug.split('/')].filter(Boolean).join('/')));
    paths.add(locale.id);

    return Array.from(paths, path => ({ '**': path }));
  });
}

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    getPrerenderParams: prerenderPaths,
  },
];
