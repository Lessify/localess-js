import {getLocalessClient, Content, LocalessDocument} from "@localess/react/rsc";
import {LOCALES} from "@/shared/utils/locales";
import {Page} from "@/shared/generated/localess";
import {localessInit} from "@localess/react/rsc";
import {PageLocaless} from "@/shared/components/localess/page";

localessInit({
  origin: "https://demo.localess.org", // Replace it for your origin
  spaceId: "MmaT4DL0kJ6nXIILUcQF", // Replace it for your spaceId
  version: "draft",
  token: "Y4rvboPnyzVeC7LddEK5", // Replace it for your token
  debug: true,
  enableSync: true,
  components: {
    'Page': PageLocaless
  }
})

export default async function Home({searchParams}: PageProps<'/'>) {
  const {locale} = await searchParams
  const document = await fetchData(locale?.toString());
  return (
    <div className="flex flex-col w-full gap-8 mx-auto max-w-5xl">
      <header className="py-8">
        <nav className="flex justify-center">
          <ul
            className="flex rounded-full bg-white/90 px-3 text-sm font-medium text-zinc-800 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10">
            {
              LOCALES.map(locale => (
                <li key={locale.id}>
                  <a className="relative block px-3 py-2 transition hover:text-teal-500 dark:hover:text-teal-400"
                     href={"/?locale=" + locale.id} hrefLang={locale.id}>
                    {locale.name}
                  </a>
                </li>
              ))
            }
          </ul>
        </nav>
      </header>
      <LocalessDocument document={document} />
    </div>
  );
}

async function fetchData(locale?: string): Promise<Content<Page>> {
  const client = getLocalessClient();
  return client.getContentBySlug<Page>('home', {locale: locale ? locale : undefined});
}
