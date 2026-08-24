import { svelte } from '@sveltejs/vite-plugin-svelte';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';
import { localess } from '@localess/svelte/vite';

export default defineConfig({
  plugins: [svelte(), basicSsl(), localess({ componentsDir: 'src/lib/components/localess' })],
  server: { https: true },
});
