import {Content, LocalessServerDocument} from "@localess/react/ssr";
import {localessClient, LOCALES} from "@/shared/utils/locales";
import {resolveLocaleAndSlug} from "@/shared/utils/route";
import {Page} from "@/shared/models/localess";
import {ThemeToggle} from "@/components/theme-toggle";

// `output: 'export'` prerenders every route at build time — there is no request-time
// server, so every navigable locale/slug combination needs its own statically generated
// page via `generateStaticParams` rather than being resolved on demand.
export async function generateStaticParams() {
  const links = await localessClient.getLinks({kind: 'DOCUMENT'});
  const slugs = new Set(['home', ...Object.values(links).map(link => link.fullSlug)]);

  return LOCALES.flatMap(locale => {
    // joined path -> dedupe key; the bare locale root and an explicit "home" slug
    // both resolve to the same content, same as the dynamic playground's fallback.
    const paths = new Set(Array.from(slugs, slug => [locale.id, ...slug.split('/')].filter(Boolean).join('/')));
    paths.add(locale.id);

    return Array.from(paths, joined => ({path: joined ? joined.split('/') : []}));
  });
}

async function fetchData(locale: string | undefined, slug: string): Promise<Content<Page>> {
  return localessClient.getContentBySlug<Page>(slug, {locale});
}

export default async function Home({params}: PageProps<'/[[...path]]'>) {
  const {path: segments} = await params
  const {locale, slug} = resolveLocaleAndSlug(segments)
  const document = await fetchData(locale, slug);
  return (
    <div className="flex flex-col w-full gap-8 mx-auto max-w-5xl">
      <header className="flex items-center justify-center gap-4 py-8">
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
        <ThemeToggle />
      </header>
      <LocalessServerDocument document={document}/>
    </div>
  );
}
