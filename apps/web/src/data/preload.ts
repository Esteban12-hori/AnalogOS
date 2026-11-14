/**
 * Precarga de todo lo que el escenario necesita, para que el globo y el mapa 2D
 * respondan al instante. Se dispara al cargar el módulo (en paralelo con el snapshot)
 * y, en segundo plano, se calientan el chunk de MapLibre, su worker y las imágenes.
 */
import earthPreviewUrl from '../assets/globe/earth-blue-marble-1k.webp'
import earthTexture2kUrl from '../assets/globe/earth-blue-marble-2k.webp'
import earthTexture4kUrl from '../assets/globe/earth-blue-marble-4k.webp'
import { globeScreenRadius } from '../domain/mapZoom'
import earthBumpUrl from '../assets/globe/earth-topology-2k.jpg'
import globePosterUrl from '../assets/globe/globe-poster.webp'
// Solo la URL del worker de MapLibre (no ejecuta MapLibre): se descarga en segundo plano.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

/**
 * Ancho de textura necesario para ~1 texel por píxel físico en el centro del disco:
 * la textura cubre 2π radianes y, en el centro, un radián ocupa `radio` píxeles.
 */
export function neededTextureWidth(radiusCssPx: number, devicePixelRatio: number): number {
  return 2 * Math.PI * radiusCssPx * devicePixelRatio
}

/** 2K (~170 KB) basta en teléfonos y pantallas normales; 4K (~585 KB) solo donde se nota. */
export function pickGlobeTexture(width: number, height: number, dpr: number): '2k' | '4k' {
  const inset = width >= 1100 ? 520 : 0
  return neededTextureWidth(globeScreenRadius(width, height, inset), dpr) > 2048 * 1.25 ? '4k' : '2k'
}

const chosen = typeof window === 'undefined'
  ? '4k'
  : pickGlobeTexture(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1)

/** Resolución aproximada en el ecuador de la textura elegida, para la leyenda. */
export const GLOBE_TEXTURE_KM = chosen === '4k' ? 10 : 20

/** `preview` (1K, ~60 KB) pinta el globo de inmediato; `color` (2K o 4K según la pantalla) lo reemplaza. */
export const GLOBE_TEXTURES = {
  preview: earthPreviewUrl,
  color: chosen === '4k' ? earthTexture4kUrl : earthTexture2kUrl,
  bump: earthBumpUrl,
} as const

const requested = new Set<string>()

/**
 * Póster estático del globo en la vista inicial, renderizado desde la propia app
 * (scripts de captura en docs/PERFORMANCE.md). Se ve al instante mientras three.js
 * se descarga y compila; `POSTER_HALF_OVER_RADIUS` es su semilado sobre el radio del disco.
 */
export const GLOBE_POSTER = { url: globePosterUrl, halfOverRadius: 445 / 396.5 } as const

/** Inserta un <link rel="preload"> una sola vez por URL. */
export function preloadLink(href: string, as: 'image' | 'fetch' | 'script', type?: string, high = false): void {
  if (typeof document === 'undefined' || requested.has(href)) return
  requested.add(href)
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = as
  link.href = href
  if (type) link.type = type
  if (high) link.setAttribute('fetchpriority', 'high')
  if (as === 'fetch') link.crossOrigin = 'anonymous'
  document.head.append(link)
}

/** Descarga y decodifica una imagen para que el navegador la tenga lista en memoria. */
export function warmImage(href: string): Promise<void> {
  if (typeof Image === 'undefined' || requested.has(href)) return Promise.resolve()
  requested.add(href)
  const image = new Image()
  image.decoding = 'async'
  image.src = href
  return image.decode().catch(() => undefined)
}

/**
 * Descarga a la caché HTTP en baja prioridad, sin decodificar ni ejecutar: el mapa 2D
 * queda «precargado» sin gastar CPU hasta que se usa.
 */
export function prefetchToCache(href: string): void {
  if (typeof fetch === 'undefined' || requested.has(href)) return
  requested.add(href)
  void fetch(href, { priority: 'low' } as RequestInit).catch(() => undefined)
}

export const MAPLIBRE_WORKER_URL = maplibreWorkerUrl

/**
 * Retira el póster estático de index.html (desvanecido). Se llama cuando el globo 3D
 * ya tiene su textura nítida, cuando el usuario interactúa o si se usa otro modo.
 */
export function hideBootStage(): void {
  if (typeof document === 'undefined') return
  const stage = document.getElementById('boot-stage')
  if (!stage || stage.classList.contains('is-hidden')) return
  stage.classList.add('is-hidden')
  window.setTimeout(() => stage.remove(), 600)
}

/** Ejecuta `task` cuando el navegador esté ocioso (o tras `timeout` ms como máximo). */
export function whenIdle(task: () => void, timeout = 1200): void {
  if (typeof window === 'undefined') return
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
  if (idle) idle(task, { timeout })
  else window.setTimeout(task, Math.min(timeout, 300))
}

if (typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1100px)').matches) preloadLink(GLOBE_POSTER.url, 'image', undefined, true)
preloadLink(GLOBE_TEXTURES.preview, 'image')
preloadLink(GLOBE_TEXTURES.bump, 'image')
preloadLink(GLOBE_TEXTURES.color, 'image')
