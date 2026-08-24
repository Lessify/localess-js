import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localess } from '@localess/react/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    localess({
      origin: 'https://demo.localess.org', // Replace it for your origin
      spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
      token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token — shipped to the browser bundle too, see KNOWN GAP on localess()
      enableSync: true,
      debug: true,
      //componentsDir: 'src/components/localess',
      components: { Page: './components/localess/page.tsx', Button: './components/localess/button.tsx' },
    }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
