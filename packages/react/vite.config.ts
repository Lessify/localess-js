import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import preserveDirectives from 'rollup-preserve-directives';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'ssr/index': resolve(__dirname, 'src/ssr/index.ts'),
        'rsc/index': resolve(__dirname, 'src/rsc/index.ts'),
      },
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@localess/client',
        /^@tiptap\/.*/,
      ],
      plugins: [preserveDirectives()],
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
