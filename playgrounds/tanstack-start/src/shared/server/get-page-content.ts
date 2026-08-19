import {createServerFn} from '@tanstack/react-start';
import 'virtual:localess-init';
import {getLocalessClient, LocalessApiError} from '@localess/react';
import type {Content} from '@localess/react';
import type {Page} from '@/shared/models/localess';

export const getPageContent = createServerFn({method: 'GET'})
  .validator((data: {locale?: string; slug: string}) => data)
  .handler(async ({data}): Promise<Content<Page> | null> => {
    console.log('Fetching page content for slug:', data.slug, 'locale:', data.locale);
    try {
      return await getLocalessClient().getContentBySlug<Page>(data.slug, {locale: data.locale});
    } catch (error) {
      if (error instanceof LocalessApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  });
