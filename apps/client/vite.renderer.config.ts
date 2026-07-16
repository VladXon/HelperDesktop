import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const RADIX_PACKAGES = [
  '@radix-ui/primitive',
  '@radix-ui/react-accordion',
  '@radix-ui/react-compose-refs',
  '@radix-ui/react-context',
  '@radix-ui/react-dialog',
  '@radix-ui/react-direction',
  '@radix-ui/react-dismissable-layer',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-focus-guards',
  '@radix-ui/react-focus-scope',
  '@radix-ui/react-id',
  '@radix-ui/react-label',
  '@radix-ui/react-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-popper',
  '@radix-ui/react-portal',
  '@radix-ui/react-presence',
  '@radix-ui/react-primitive',
  '@radix-ui/react-roving-focus',
  '@radix-ui/react-slot',
  '@radix-ui/react-switch',
  '@radix-ui/react-tabs',
  '@radix-ui/react-tooltip',
  '@radix-ui/react-use-callback-ref',
  '@radix-ui/react-use-controllable-state',
  '@radix-ui/react-use-escape-keydown',
  '@radix-ui/react-use-layout-effect',
  '@radix-ui/react-use-size',
  '@radix-ui/react-visually-hidden',
  '@radix-ui/number',
  '@radix-ui/rect',
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
    },
    dedupe: [...RADIX_PACKAGES, 'react', 'react-dom', '@tanstack/react-query', '@tanstack/query-core'],
  },
  optimizeDeps: {
    include: [...RADIX_PACKAGES, 'react', 'react-dom', '@tanstack/react-query', '@floating-ui/react-dom'],
  },
  build: {
    outDir: '.vite/build',
    emptyOutDir: false,
    rollupOptions: {
      input: { index: resolve(__dirname, 'index.html') },
    },
  },
});
