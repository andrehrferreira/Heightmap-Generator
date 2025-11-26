import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: './web',
  server: {
    port: 15001,
    open: true,
  },
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@web': new URL('./web/src', import.meta.url).pathname,
    },
  },
  test: {
    include: ['../tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    globals: true,
    pool: 'forks',
    fileParallelism: true,
    testTimeout: 5000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      enabled: false,
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: '../coverage',
      include: ['../src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts'],
      thresholds: {
        lines: 85,
        functions: 90,
        branches: 85,
        statements: 85,
      },
    },
    clearMocks: true,
    restoreMocks: true,
  },
});
