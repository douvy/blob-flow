import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Chart labels and timestamps render in the viewer's local timezone. Pin
    // a fixed non-UTC zone (UTC+9, no DST) so assertions are deterministic
    // on any machine and catch regressions back to UTC getters.
    env: {
      TZ: 'Asia/Tokyo',
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/api/**/*.ts',
        'src/hooks/**/*.ts',
        'src/utils/**/*.ts',
      ],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      thresholds: {
        lines: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
