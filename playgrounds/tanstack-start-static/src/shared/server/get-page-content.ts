import {createServerFn} from '@tanstack/react-start';
import 'virtual:localess-init';
import {getLocalessClient, LocalessApiError} from '@localess/react/ssr';
import type {Content} from '@localess/react/ssr';
import type {Page} from '@/shared/models/localess';

export const getPageContent = createServerFn({method: 'GET'})
  .validator((data: {locale?: string; slug: string}) => data)
  .handler(async ({data}): Promise<Content<Page> | null> => {
    try {
      return await getLocalessClient().getContentBySlug<Page>(data.slug, {locale: data.locale});
    } catch (error) {
      if (error instanceof LocalessApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  });
