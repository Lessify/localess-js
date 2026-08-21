import type { Config } from "@react-router/dev/config";
import { localessClient } from "@localess/react/ssr";
import { LOCALES } from "./app/shared/utils/locales";

// Static prerendering needs an explicit list of URLs for our dynamic `*` catch-all route — it
// has no fixed set of paths the way `app/routes/about.tsx` would. This needs a standalone
// client outside the `localessInit()`/`getLocalessClient()` singleton lifecycle, since this
// runs before any app graph exists — `localessClient` from `@localess/react/ssr` (never
// `@localess/client` directly, per that package's contributor rules). This only ever runs in
// this Node build script, never bundled, so the token used for this one build-time fetch never
// ships anywhere.
async function getPrerenderPaths(): Promise<string[]> {
  const client = localessClient({
    origin: "https://demo.localess.org", // Replace it for your origin
    spaceId: "MmaT4DL0kJ6nXIILUcQF", // Replace it for your spaceId
    token: "Y4rvboPnyzVeC7LddEK5", // Replace it for your token
  });
  const links = await client.getLinks({ kind: "DOCUMENT" });
  const slugs = new Set(["home", ...Object.values(links).map(link => link.fullSlug)]);

  const paths = new Set<string>();
  for (const locale of LOCALES) {
    paths.add(locale.id ? `/${locale.id}` : "/");
    for (const slug of slugs) {
      const joined = [locale.id, ...slug.split("/")].filter(Boolean).join("/");
      paths.add(`/${joined}`);
    }
  }
  return Array.from(paths);
}

export default {
  ssr: false,
  async prerender() {
    return getPrerenderPaths();
  },
} satisfies Config;
