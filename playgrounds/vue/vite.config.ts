import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { localess } from '@localess/vue/vite';

export default defineConfig({
  plugins: [vue(), basicSsl(), localess({ componentsDir: 'src/components/localess' })],
  server: { https: true },
});
