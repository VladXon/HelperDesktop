import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { builtinModules } from 'node:module';

const nodeBuiltins = builtinModules.flatMap((m) => [m, `node:${m}`]);

export default defineConfig({
  build: {
    outDir: '.vite/build',
    emptyOutDir: false,
    rollupOptions: {
      input: { index: resolve(__dirname, 'src/main/index.ts') },
      output: { format: 'cjs', entryFileNames: 'main.js' },
      external: ['ws', 'electron', 'electron-squirrel-startup', ...nodeBuiltins],
    },
  },
});
