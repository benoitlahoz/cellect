import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Cellect',
    },
    rollupOptions: {
      external: ['cell-collection'],
      output: {
        globals: { 'cell-collection': 'CellCollection' },
      },
    },
    minify: 'terser',
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: ['**/example/**'],
    }),
  ],
});
