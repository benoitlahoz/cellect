import { resolve } from 'node:path';
import { defineConfig } from 'vite';

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
});
