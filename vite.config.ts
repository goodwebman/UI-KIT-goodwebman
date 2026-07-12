import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { defineConfig } from 'vitest/config';
import dts from 'vite-plugin-dts';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss(), dts({ include: ['src'], exclude: ['**/*.stories.tsx', '**/*.test.tsx'], rollupTypes: true })],
  resolve: { alias: { '@': path.resolve(dirname, 'src') } },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.tsx', '**/*.stories.tsx', 'src/**/*.d.ts', 'src/**/index.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.resolve(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          browser: { enabled: true, provider: 'playwright', instances: [{ browser: 'chromium' }] },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
  build: {
    lib: {
      entry: path.resolve(dirname, 'src/index.ts'),
      name: 'MyUIKit',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-virtuoso'],
      output: {
        assetFileNames: 'styles.css', // tokens.css соберётся сюда
        globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-virtuoso': 'ReactVirtuoso' },
      },
    },
  },
});
