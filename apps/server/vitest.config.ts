import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    env: {
      LOG_LEVEL: 'error',
      NODE_ENV: 'test',
    },
  },
});
