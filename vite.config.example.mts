import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  base: resolve(__dirname, '/example'),
  root: 'example',
  build: {
    outDir: '../dist',
  },
  plugins: [vue()],
});
