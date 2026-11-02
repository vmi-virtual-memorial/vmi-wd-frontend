import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    environment: 'jsdom',
    // Node 25+ ships a global localStorage that shadows jsdom's (and is undefined
    // without --localstorage-file); turn it off so tests get jsdom's storage.
    poolOptions: { forks: { execArgv: ['--no-experimental-webstorage'] } },
    coverage: {
      include: ['lib/classYear.ts', 'lib/navigation.ts', 'lib/search/**', 'components/search/**'],
      thresholds: { lines: 90 },
    },
  },
});
