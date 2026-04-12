import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      rollupTypes: true,
    }),
  ],
  build: {
    target: 'node20',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.mjs',
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        '@localess/client',
        '@inquirer/prompts',
        'commander',
        'chalk',
        'orval',
        'zod',
      ],
    },
  },
});
