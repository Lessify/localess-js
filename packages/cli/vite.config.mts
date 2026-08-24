import { chmodSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// The CLI is invoked directly via its `bin` entry (`localess/dist/index.mjs`, shebang `#!/usr/bin/env node`).
// Rollup/Vite doesn't preserve or set the executable bit on emitted files, so without this the file is
// only readable, and running it (e.g. via `npm run <script>` in a workspace that depends on this package,
// through node_modules/.bin/localess) fails with "Permission denied".
function makeBinExecutable() {
  return {
    name: 'make-bin-executable',
    writeBundle(_options: unknown, bundle: Record<string, unknown>) {
      for (const fileName of Object.keys(bundle)) {
        chmodSync(resolve(import.meta.dirname, 'dist', fileName), 0o755);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      rollupTypes: true,
    }),
    makeBinExecutable(),
  ],
  build: {
    target: 'node20',
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
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
