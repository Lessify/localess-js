import { LocalessApiError, localessClient } from '@localess/client';
import { error } from '@sveltejs/kit';

import { resolveLocaleAndSlug } from '$lib/route';
import type { Page } from '../../shared/models/localess';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const client = localessClient({
    origin: 'https://demo.localess.org', // Replace it for your origin
    spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
    token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token — secret; SvelteKit guarantees this file never reaches the client bundle
  });
  const { locale, slug } = resolveLocaleAndSlug(params.slug);
  try {
    const content = await client.getContentBySlug<Page>(slug, { locale });
    return { content };
  } catch (err) {
    if (err instanceof LocalessApiError && err.status === 404) {
      error(404, `Content not found for slug "${slug}".`);
    }
    throw err;
  }
};
