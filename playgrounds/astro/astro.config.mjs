import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { localess } from '@localess/astro';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    localess({
      origin: 'https://demo.localess.org', // Replace it for your origin
      spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
      token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token
      debug: true,
      livePreview: true,
      componentsDir: 'src/shared/components',
      enableFallbackComponent: true,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
