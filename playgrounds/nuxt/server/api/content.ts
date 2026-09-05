import { LocalessApiError } from '@localess/vue';
import { useLocalessServerClient } from '#localess/server';
import { resolveLocaleAndSlug } from '#shared/utils/route';

export default defineEventHandler(async event => {
  const client = useLocalessServerClient();
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
