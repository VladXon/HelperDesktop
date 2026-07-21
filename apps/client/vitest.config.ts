import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    conditions: ['import', 'module', 'node', 'default'],
  },
  test: {
    include: [
      'src/main/services/**/__tests__/**/*.test.ts',
      'src/renderer/**/__tests__/**/*.test.{ts,tsx}',
    ],
    environment: 'node',
    environmentMatchGlobs: [
      ['src/renderer/**', 'jsdom'],
    ],
  },
});
