import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'src/app/main/index.html'),
        action: resolve(import.meta.dirname, 'src/app/action/index.html'),
        engine: resolve(import.meta.dirname, 'src/app/engine/index.html'),
        region: resolve(import.meta.dirname, 'src/app/region/index.html'),
        settings: resolve(import.meta.dirname, 'src/app/settings/index.html')
      }
    }
  }
})
