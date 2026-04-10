import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ssr: 'src/ssr/index.ts',
    rsc: 'src/rsc/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
});
