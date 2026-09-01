import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^react-native$/,
        replacement: fileURLToPath(
          new URL('./scripts/react-native-test-shim.mjs', import.meta.url),
        ),
      },
      {
        find: /^react-native-safe-area-context$/,
        replacement: fileURLToPath(
          new URL(
            './scripts/react-native-safe-area-context-test-shim.mjs',
            import.meta.url,
          ),
        ),
      },
    ],
  },
  test: {
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
          include: ['@testing-library/react-native', 'test-renderer'],
        },
      },
    },
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    server: {
      deps: {
        inline: ['@testing-library/react-native', 'test-renderer'],
      },
    },
  },
});
