/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { loadingHints } from './src/features/boot/loadingHints'

// Local server equivalent to api/ai.ts: mounts /api/ai in `vite dev` and `vite preview` (127.0.0.1,
// same-origin, no external proxy). Only ANTHROPIC_* and ANALOGOS_AI_* are read from the root .env,
// solely in this Node process: Vite never exposes them to the bundle (they do not have the VITE_ prefix).
// The adapter is loaded on demand with the Vite transformer (ADR-009).
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
      // No details: never reflect internal errors (they may contain paths or data).
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('content-type', 'application/json; charset=utf-8')
      }
      res.end(JSON.stringify({ ok: false, error: { code: 'ai_upstream_error', message: 'Internal error in the local server.' }, client_request_id: null }))
      void next
    })
  }
}

// `vite preview` does not provide a transformer: one is created in middleware mode only to load the adapter.
let previewLoader: Promise<ViteDevServer> | null = null
async function loadForPreview(): Promise<Record<string, unknown>> {
  const { createServer } = await import('vite')
  previewLoader ??= createServer({ configFile: false, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', optimizeDeps: { noDiscovery: true }, logLevel: 'silent' })
  return (await previewLoader).ssrLoadModule(ADAPTER)
}

export default defineConfig({
  // Relative paths: the same build loads at "/" and in a subdirectory such as "/AnalogOS/".
  base: './',
  plugins: [react(), loadingHints(), aiDevApi(fileURLToPath(new URL('../..', import.meta.url)))],
  publicDir: fileURLToPath(new URL('../../artifacts', import.meta.url)),
  test: {
    // The app starts in English (ADR-017): every test file starts in 'en' and Spanish tests switch explicitly; the
    // setup restores English after each test (docs/I18N.md §9).
    setupFiles: ['./src/i18n/testSetup.ts'],
  },
  server: {
    host: '127.0.0.1',
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url))],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // The delivery packager takes the deferred chunks and permitted assets from here.
    manifest: true,
    // The globe chunk (three.js) is loaded lazily; see ADR-007.
    chunkSizeWarningLimit: 1100,
    rolldownOptions: {
      output: {
        // Everything the entry imports statically goes into ONE initial chunk. Without this,
        // Rolldown splits into shared chunks (react, ui, formatting, contracts…) every module
        // that a deferred chunk also uses: ~18 modulepreload and +5.7 KB gz on the critical path.
        // The deferred chunks (globe, 2D, rail, lines, mission, reading) do not change.
        codeSplitting: { groups: [{ name: 'index', tags: ['$initial'] }] },
      },
    },
  },
})
