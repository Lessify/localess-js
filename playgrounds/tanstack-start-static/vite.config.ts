import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localessClient } from '@localess/client'
import { localessVite } from '@localess/react/vite'

import { LOCALES } from './src/shared/utils/locales'

// Static prerendering needs an explicit list of URLs for our dynamic `$` catch-all route — it
// has no fixed set of paths the way `src/routes/about.tsx` would. `@localess/client` (not
// `@localess/react`) is deliberately used here: this only ever runs in this Node build script,
// never bundled, so the secret token used for this one build-time fetch never ships anywhere.
async function getPrerenderPaths(): Promise<string[]> {
  const client = localessClient({
    origin: 'https://demo.localess.org', // Replace it for your origin
    spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
    token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token
  })
  const links = await client.getLinks({ kind: 'DOCUMENT' })
  const slugs = new Set(['home', ...Object.values(links).map(link => link.fullSlug)])

  const paths = new Set<string>()
  for (const locale of LOCALES) {
    paths.add(locale.id ? `/${locale.id}` : '/')
    for (const slug of slugs) {
      const joined = [locale.id, ...slug.split('/')].filter(Boolean).join('/')
      paths.add(`/${joined}`)
    }
  }
  return Array.from(paths)
}

export default defineConfig(async () => {
  const pages = await getPrerenderPaths()

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      tailwindcss(),
      localessVite({
        origin: 'https://demo.localess.org', // Replace it for your origin
        spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
        token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token
        debug: true,
        components: { Page: './shared/components/localess/page.tsx' },
      }),
      tanstackStart({
        prerender: {
          enabled: true,
          failOnError: true,
        },
        pages: pages.map(path => ({ path })),
      }),
      viteReact(),
    ],
  }
})
