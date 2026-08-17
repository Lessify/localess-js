import {createServerFn} from '@tanstack/react-start';
import {LocalessApiError, localessInit} from '@localess/react';
import type {Content} from '@localess/react';
import {PageLocaless} from '@/shared/components/localess/page';
import type {Page} from '@/shared/models/localess';

/**
 * Server-only Localess client. Uses the secret token — safe here because `createServerFn`
 * strips this handler's implementation (and everything it closes over) from the client bundle.
 * Never move this call, or the token, into a module reachable from client-rendered code.
 */
function getServerLocalessClient() {
  return localessInit({
    origin: 'https://demo.localess.org', // Replace it for your origin
    spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
    token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token
    debug: true,
    components: {
      Page: PageLocaless,
    },
  });
}

export const getPageContent = createServerFn({method: 'GET'})
  .validator((data: {locale?: string; slug: string}) => data)
  .handler(async ({data}): Promise<Content<Page> | null> => {
    const client = getServerLocalessClient();
    try {
      return await client.getContentBySlug<Page>(data.slug, {locale: data.locale});
    } catch (error) {
      if (error instanceof LocalessApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  });
