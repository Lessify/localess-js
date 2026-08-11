import { defineConfig } from 'astro/config';
import { localess } from '@localess/astro';

export default defineConfig({
  integrations: [
    localess({
      origin: 'https://demo.localess.org', // Replace it for your origin
      spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
      token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token
      debug: true,
      // enableSync/livePreview omitted — sync has no meaning once HTML is pre-baked at build time.
    }),
  ],
});
