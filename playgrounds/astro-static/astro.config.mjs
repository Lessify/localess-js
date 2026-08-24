import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { localess } from '@localess/astro';

import react from '@astrojs/react';

export default defineConfig({
  integrations: [localess({
    origin: 'https://demo.localess.org', // Replace it for your origin
    spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
    token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token
    debug: true,
    // livePreview requires output: 'server'; enableSync works under static output too (reload-based).
    //enableSync: true,
    componentsDir: 'src/components/localess',
    enableFallbackComponent: true,
  }), react()],
  vite: {
    plugins: [tailwindcss()],
  },
});