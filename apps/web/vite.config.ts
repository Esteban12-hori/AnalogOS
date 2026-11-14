import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: fileURLToPath(new URL('../../artifacts', import.meta.url)),
  server: {
    host: '127.0.0.1',
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url))],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // El chunk del globo (three.js) se carga de forma diferida; ver ADR-004.
    chunkSizeWarningLimit: 1100,
  },
})
