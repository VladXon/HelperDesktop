import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const RADIX_PACKAGES = [
  '@radix-ui/primitive',
  '@radix-ui/react-accordion',
  '@radix-ui/react-collection',
  '@radix-ui/react-collapsible',
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
  '@radix-ui/react-use-is-hydrated',
  '@radix-ui/react-use-layout-effect',
  '@radix-ui/react-use-previous',
  '@radix-ui/react-use-size',
  '@radix-ui/react-visually-hidden',
  '@radix-ui/number',
  '@radix-ui/rect',
];

const MARKDOWN_PACKAGES = [
  'react-markdown',
  'remark-gfm',
  'remark-parse',
  'remark-rehype',
  'rehype-sanitize',
  'unified',
  'unist-util-visit',
  'vfile',
  'mdast-util-gfm',
  'micromark-extension-gfm',
  'hast-util-sanitize',
  'hast-util-to-jsx-runtime',
  'html-url-attributes',
  'devlop',
  'scheduler',
];

const UTILITY_PACKAGES = [
  'aria-hidden',
  'react-remove-scroll',
  'dijkstrajs',
  '@floating-ui/dom',
  '@floating-ui/react-dom',
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
    entries: ['index.html'],
    include: [
      ...RADIX_PACKAGES,
      ...MARKDOWN_PACKAGES,
      ...UTILITY_PACKAGES,
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@tanstack/query-core',
  'qrcode',
  'cmdk',
  'framer-motion',
  'motion-utils',
  'motion-dom',
  'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'react-hotkeys-hook',
      '@phosphor-icons/react',
    ],
  },
  build: {
    outDir: '.vite/build/renderer',
    emptyOutDir: false,
    rollupOptions: {
      input: { index: resolve(__dirname, 'index.html') },
    },
  },
});
