import {notFound} from "next/navigation";
import {getLocalessClient, Content, LocalessDocument} from "@localess/react/rsc";
import {LOCALES} from "@/shared/utils/locales";
import {Page} from "@/shared/generated/localess";
import {localessInit} from "@localess/react/rsc";
import {PageLocaless} from "@/shared/components/localess/page";

localessInit({
  origin: "https://demo.localess.org", // Replace it for your origin
  spaceId: "MmaT4DL0kJ6nXIILUcQF", // Replace it for your spaceId
  token: "Y4rvboPnyzVeC7LddEK5", // Replace it for your token
  debug: true,
  enableSync: true,
  components: {
    'Page': PageLocaless
  }
})

export default async function Home({params}: PageProps<'/[[...locale]]'>) {
  const {locale: segments} = await params
  if (segments && segments.length > 1) notFound()
  const locale = segments?.[0]
  if (locale && !LOCALES.some(l => l.id === locale)) notFound()
  const document = await fetchData(locale);
  return (
    <div className="flex flex-col w-full gap-8 mx-auto max-w-5xl">
      <header className="py-8">
        <nav className="flex justify-center">
          <ul
            className="flex rounded-full bg-white/90 px-3 text-sm font-medium text-zinc-800 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10">
            {
              LOCALES.map(item => {
                const isActive = (locale ?? '') === item.id
                return (
                  <li key={item.id}>
                    <a
                      className={
                        "relative block px-3 py-2 transition hover:text-teal-500 dark:hover:text-teal-400" +
                        (isActive ? " text-teal-500 dark:text-teal-400" : "")
                      }
                      href={item.id ? "/" + item.id : "/"}
                      hrefLang={item.id}
                      aria-current={isActive ? "page" : undefined}>
                      {item.name}
                    </a>
                  </li>
                )
              })
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
