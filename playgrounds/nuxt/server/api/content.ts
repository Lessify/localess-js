import { LocalessApiError, localessClient } from '@localess/vue';
import { resolveLocaleAndSlug } from '#shared/utils/route';

export default defineEventHandler(async event => {
  const client = localessClient({
    origin: 'https://demo.localess.org', // Replace it for your origin
    spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
    token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token — secret, never leaves this server-only file
  });
  const { locale, slug } = resolveLocaleAndSlug((getQuery(event).slug as string) || 'home');
  try {
    return await client.getContentBySlug(slug, { locale });
  } catch (error) {
    if (error instanceof LocalessApiError && error.status === 404) {
      throw createError({ statusCode: 404, statusMessage: `Content not found for slug "${slug}".` });
    }
    throw error;
  }
});
