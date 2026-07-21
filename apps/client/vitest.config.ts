import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    conditions: ['import', 'module', 'node', 'default'],
  },
  test: {
    include: ['src/main/poe/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
