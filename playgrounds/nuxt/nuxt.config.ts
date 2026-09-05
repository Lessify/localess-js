import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  future: { compatibilityVersion: 4 },
  // Nuxt resolves `css` entries as module ids relative to srcDir (`app/`), not to
  // this file — so `~/app.css`, not `./app/app.css`.
  css: ['~/app.css'],
  modules: ['@localess/nuxt'],
  localess: {
    origin: 'https://demo.localess.org', // Replace it for your origin
    spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
    // Public token — reaches the client bundle. Only ever put a token marked public in Localess here.
    token: process.env.LOCALESS_PUBLIC_TOKEN || 'Y4rvboPnyzVeC7LddEK5',
    // Secret token — stays on the server, read only by useLocalessServerClient().
    serverToken: process.env.LOCALESS_TOKEN || 'Y4rvboPnyzVeC7LddEK5',
    // Components under this directory are registered automatically — no manual registry.
    componentsDir: '~/components/localess',
    enableSync: true,
    debug: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
