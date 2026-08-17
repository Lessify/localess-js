import {createFileRoute, notFound} from '@tanstack/react-router';
import {LocalessServerDocument} from '@localess/react/ssr';
import {getPageContent} from '@/shared/server/get-page-content';
import {resolveLocaleAndSlug} from '@/shared/utils/route';

export const Route = createFileRoute('/$')({
  loader: async ({params}) => {
    const {locale, slug} = resolveLocaleAndSlug(params._splat);
    const document = await getPageContent({data: {locale, slug}});
    if (!document) {
      throw notFound();
    }
    return {document};
  },
  component: CatchAllPage,
});

function CatchAllPage() {
  const {document} = Route.useLoaderData();
  return <LocalessServerDocument document={document} />;
}
