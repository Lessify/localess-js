import {getLocalessClient, Content, LocalessServerDocument} from "@localess/react/ssr";
import {Page} from "@/shared/generated/localess";
import {localessInit} from "@localess/react/ssr";
import {PageLocaless} from "@/shared/components/localess/page";

localessInit({
  origin: "https://demo.localess.org", // Replace it for your origin
  spaceId: "MmaT4DL0kJ6nXIILUcQF", // Replace it for your spaceId
  version: "draft",
  token: "Y4rvboPnyzVeC7LddEK5", // Replace it for your token
  debug: true,
  components: {
    'Page': PageLocaless
  }
})

// `output: 'export'` prerenders this page once at build time — there is no request-time
// server to read a `?locale=` query param from, so (unlike next-latest) this page always
// renders the default locale. A real static locale switcher needs locale-prefixed routes
// generated via `generateStaticParams`, one static page per locale.
export default async function Home() {
  const document = await fetchData();
  return (
    <div className="flex flex-col w-full gap-8 mx-auto max-w-5xl">
      <LocalessServerDocument document={document} />
    </div>
  );
}

async function fetchData(): Promise<Content<Page>> {
  const client = getLocalessClient();
  return client.getContentBySlug<Page>('home');
}
