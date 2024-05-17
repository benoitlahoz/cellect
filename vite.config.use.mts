import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/useCellect.ts'),
      name: 'UseCellect',
    },
    rollupOptions: {
      external: ['vue', 'cell-collection'],
      output: {
        globals: { vue: 'Vue', 'cell-collection': 'CellCollection' },
        entryFileNames: '[name].[format].js',
      },
    },
    emptyOutDir: false,
    minify: 'terser',
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: ['**/example/**'],
    }),
  ],
});
