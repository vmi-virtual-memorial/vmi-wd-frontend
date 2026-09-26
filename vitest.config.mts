import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'jsdom',
    coverage: {
      include: ['lib/classYear.ts', 'lib/navigation.ts'],
      thresholds: { lines: 90 },
    },
  },
});
