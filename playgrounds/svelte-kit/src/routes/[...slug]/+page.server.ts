import { localessClient } from '@localess/client';
import { LOCALESS_ORIGIN, LOCALESS_SPACE_ID, LOCALESS_TOKEN } from '$env/static/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const client = localessClient({
    origin: LOCALESS_ORIGIN,
    spaceId: LOCALESS_SPACE_ID,
    token: LOCALESS_TOKEN, // secret — SvelteKit guarantees this file never reaches the client bundle
  });
  const content = await client.getContentBySlug(params.slug || 'home');
  return { content };
};
