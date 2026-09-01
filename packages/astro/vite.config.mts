import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
    }),
    viteStaticCopy({
      targets: [{ src: 'src/components/*.astro', dest: 'components', rename: { stripBase: true } }],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        'dev-toolbar/toolbar-app': resolve(import.meta.dirname, 'src/dev-toolbar/toolbar-app.ts'),
        'live-preview/middleware': resolve(import.meta.dirname, 'src/live-preview/middleware.ts'),
      },
    },
    rollupOptions: {
      external: [
        '@localess/client',
        '@localess/richtext',
        'astro/runtime/server/index.js',
        'astro/toolbar',
        'astro/middleware',
        'virtual:localess-options',
      ],
      output: [
        {
          format: 'es',
          dir: 'dist',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].mjs',
          chunkFileNames: '[name].mjs',
        },
        {
          format: 'cjs',
          dir: 'dist',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
        },
      ],
    },
  },
});
