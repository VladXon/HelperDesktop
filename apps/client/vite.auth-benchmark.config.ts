import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { builtinModules } from 'node:module';

const nodeBuiltins = builtinModules.flatMap((m) => [m, `node:${m}`]);

export default defineConfig({
  build: {
    outDir: '.vite/auth-benchmark',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/main/auth-benchmark.ts'),
        verify: resolve(__dirname, 'src/main/auth-verify.ts'),
      },
      output: {
        format: 'cjs',
        entryFileNames: '[name].js',
      },
      external: ['electron', ...nodeBuiltins],
    },
  },
});
