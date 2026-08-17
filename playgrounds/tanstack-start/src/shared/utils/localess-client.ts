import {localessInit} from '@localess/react';
import {PageLocaless} from '@/shared/components/localess/page';

/**
 * Client-side registry + Visual Editor sync bootstrap. TanStack Start renders this module's
 * importers isomorphically (server for the initial HTML, then the browser after hydration), so
 * this call also runs server-side — but it only ever carries a **public**, read-only token, never
 * the secret one used in `get-page-content.ts`. See docs/react.md's "Client-Side Fallback for
 * Static Export" for the pattern this generalizes: a public token is safe wherever it's the
 * default `@localess/react` export doing the registering, per docs/decisions/001-server-side-only.md.
 */
export function initClientLocaless() {
  localessInit({
    origin: 'https://demo.localess.org', // Replace it for your origin
    spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
    token: 'REPLACE_WITH_A_PUBLIC_TOKEN', // Public, read-only token — never the secret one
    enableSync: true,
    components: {
      Page: PageLocaless,
    },
  });
}
