import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { loadingHints } from './src/features/boot/loadingHints'

// Servidor local equivalente a api/ai.ts: monta /api/ai en `vite dev` y `vite preview` (127.0.0.1,
// same-origin, sin proxy externo). Solo se leen ANTHROPIC_* y ANALOGOS_AI_* del .env de la raíz,
// únicamente en este proceso Node: Vite nunca las expone al bundle (no llevan prefijo VITE_).
// El adaptador se carga bajo demanda con el transformador de Vite (ADR-009).
type Next = (err?: unknown) => void
const ADAPTER = fileURLToPath(new URL('../../server/ai/nodeAdapter.ts', import.meta.url))

function aiDevApi(rootDir: string): Plugin {
  return {
    name: 'analogos-ai-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/ai', makeHandler(rootDir, server.config.mode, server))
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/ai', makeHandler(rootDir, server.config.mode, null))
    },
  }
}

function makeHandler(rootDir: string, mode: string, dev: ViteDevServer | null) {
  const env = loadEnv(mode, rootDir, ['ANTHROPIC_', 'ANALOGOS_AI_'])
  return (req: IncomingMessage, res: ServerResponse, next: Next): void => {
    void (async () => {
      const mod = dev ? await dev.ssrLoadModule(ADAPTER) : await loadForPreview()
      await (mod.nodeAiHandler as (r: IncomingMessage, s: ServerResponse, e: Record<string, string>) => Promise<void>)(req, res, env)
    })().catch(() => {
      // Sin detalle: nunca reflejar errores internos (pueden contener rutas o datos).
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('content-type', 'application/json; charset=utf-8')
      }
      res.end(JSON.stringify({ ok: false, error: { code: 'ai_upstream_error', message: 'Error interno del servidor local.' }, client_request_id: null }))
      void next
    })
  }
}

// `vite preview` no trae transformador: se crea uno en modo middleware solo para cargar el adaptador.
let previewLoader: Promise<ViteDevServer> | null = null
async function loadForPreview(): Promise<Record<string, unknown>> {
  const { createServer } = await import('vite')
  previewLoader ??= createServer({ configFile: false, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', optimizeDeps: { noDiscovery: true }, logLevel: 'silent' })
  return (await previewLoader).ssrLoadModule(ADAPTER)
}

export default defineConfig({
  // Rutas relativas: el mismo build carga en "/" y en un subdirectorio como "/AnalogOS/".
  base: './',
  plugins: [react(), loadingHints(), aiDevApi(fileURLToPath(new URL('../..', import.meta.url)))],
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
