import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadingHints } from './src/features/boot/loadingHints'

export default defineConfig({
  // Rutas relativas: el mismo build carga en "/" y en un subdirectorio como "/AnalogOS/".
  base: './',
  plugins: [react(), loadingHints()],
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
    // El empaquetador de entrega toma de aquí los chunks diferidos y assets permitidos.
    manifest: true,
    // El chunk del globo (three.js) se carga de forma diferida; ver ADR-007.
    chunkSizeWarningLimit: 1100,
    rolldownOptions: {
      output: {
        // Todo lo que la entrada importa de forma estática va en UN chunk inicial. Sin esto,
        // Rolldown parte en chunks compartidos (react, ui, formatting, contracts…) cada módulo
        // que también usa un chunk diferido: ~18 modulepreload y +5,7 KB gz en la ruta crítica.
        // Los chunks diferidos (globo, 2D, riel, líneas, misión, lectura) no cambian.
        codeSplitting: { groups: [{ name: 'index', tags: ['$initial'] }] },
      },
    },
  },
})
