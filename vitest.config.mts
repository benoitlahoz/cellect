import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['json-summary', 'text'],
      exclude: ['**/node_modules/**', '**/.docs/**/*', '**/docs/**/*'],
    },
    exclude: ['**/node_modules/**', '**/.docs/**/*', '**/docs/**/*'],
  },
});
