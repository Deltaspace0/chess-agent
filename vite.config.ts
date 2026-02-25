import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'src/app/main/index.html'),
        engine: resolve(import.meta.dirname, 'src/app/engine/index.html'),
        overlay: resolve(import.meta.dirname, 'src/app/overlay/index.html')
      }
    }
  }
});
