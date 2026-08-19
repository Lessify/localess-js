import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localessVite } from '@localess/react/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    localessVite({
      origin: 'https://demo.localess.org', // Replace it for your origin
      spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
      token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token
      publicToken: 'REPLACE_WITH_A_PUBLIC_TOKEN', // Public, read-only token — never the secret one
      enableSync: true,
      debug: true,
      //componentsDir: 'src/shared/components/localess',
      components: { Page: './shared/components/localess/page.tsx' },
    }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
