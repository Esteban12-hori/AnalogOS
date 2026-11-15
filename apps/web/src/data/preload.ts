/**
 * Preloads everything the stage needs so that the globe and the 2D map
 * respond instantly. It is triggered when the module loads (in parallel with the snapshot)
 * and, in the background, the MapLibre chunk, its worker, and the images are warmed up.
 */
import earthPreviewUrl from '../assets/globe/earth-blue-marble-1k.webp'
import earthTexture2kUrl from '../assets/globe/earth-blue-marble-2k.webp'
import earthTexture4kUrl from '../assets/globe/earth-blue-marble-4k.webp'
import { globeScreenRadius } from '../domain/mapZoom'
import { baseStageInsets } from '../shell/stageGeometry.js'
import { createStore } from '../state/store'
import earthBumpUrl from '../assets/globe/earth-topology-2k.jpg'
import globePosterUrl from '../assets/globe/globe-poster.webp'
// Only the MapLibre worker URL (it does not run MapLibre): it is downloaded in the background.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

/**
 * Texture width needed for ~1 texel per physical pixel at the center of the disc:
 * the texture covers 2π radians and, at the center, one radian spans `radio` pixels.
 */
export function neededTextureWidth(radiusCssPx: number, devicePixelRatio: number): number {
  return 2 * Math.PI * radiusCssPx * devicePixelRatio
}

/** 2K (~170 KB) is enough on phones and normal screens; 4K (~585 KB) only where it makes a visible difference. */
export function pickGlobeTexture(width: number, height: number, dpr: number): '2k' | '4k' {
  return neededTextureWidth(globeScreenRadius(width, height, baseStageInsets(width, height)), dpr) > 2048 * 1.25 ? '4k' : '2k'
}

const chosen = typeof window === 'undefined'
  ? '4k'
  : pickGlobeTexture(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1)

/** Approximate resolution at the equator of the chosen texture, for the legend. */
export const GLOBE_TEXTURE_KM = chosen === '4k' ? 10 : 20

/** `preview` (1K, ~60 KB) paints the globe immediately; `color` (2K or 4K depending on the screen) replaces it. */
export const GLOBE_TEXTURES = {
  preview: earthPreviewUrl,
  color: chosen === '4k' ? earthTexture4kUrl : earthTexture2kUrl,
  bump: earthBumpUrl,
} as const

const requested = new Set<string>()

/**
 * Static poster of the globe in the initial view, rendered from the app itself
 * (capture scripts in docs/PERFORMANCE.md). It is visible instantly while three.js
 * downloads and compiles; `POSTER_HALF_OVER_RADIUS` is its half-side relative to the disc radius.
 */
export const GLOBE_POSTER = { url: globePosterUrl, halfOverRadius: 445 / 396.5 } as const

/**
 * Inserts a <link rel="preload"> only once per URL. `cors` must match the actual
 * request: the globe textures are requested by three.js with crossOrigin "anonymous"; without it, Chrome
 * discards the preload and downloads them twice. The poster is an <img> without CORS.
 */
export function preloadLink(href: string, as: 'image' | 'fetch' | 'script', type?: string, high = false, cors = as === 'fetch'): void {
  if (typeof document === 'undefined' || requested.has(href)) return
  requested.add(href)
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = as
  link.href = href
  if (type) link.type = type
  if (high) link.setAttribute('fetchpriority', 'high')
  if (cors) link.crossOrigin = 'anonymous'
  document.head.append(link)
}

/** Downloads and decodes an image so that the browser has it ready in memory. */
export function warmImage(href: string): Promise<void> {
  if (typeof Image === 'undefined' || requested.has(href)) return Promise.resolve()
  requested.add(href)
  const image = new Image()
  image.decoding = 'async'
  image.src = href
  return image.decode().catch(() => undefined)
}

/**
 * Downloads into the HTTP cache at low priority, without decoding or executing: the 2D map
 * is left "preloaded" without spending CPU until it is used.
 */
export function prefetchToCache(href: string): void {
  if (typeof fetch === 'undefined' || requested.has(href)) return
  requested.add(href)
  void fetch(href, { priority: 'low' } as RequestInit).catch(() => undefined)
}

export const MAPLIBRE_WORKER_URL = maplibreWorkerUrl

/**
 * State of the globe poster. The poster lives in the boot layer (features/boot,
 * slot `stage.overlay`): in the static HTML and then in React, beneath the panels.
 */
export const bootPoster = createStore<{ hidden: boolean }>({ hidden: false })

/**
 * Removes the poster (450 ms fade-out). It is called when the 3D globe already has its
 * sharp texture, when the user interacts, or if another mode is used (2D, SVG).
 */
export function hideBootStage(): void {
  bootPoster.setState({ hidden: true })
}

/** Runs `task` when the browser is idle (or after `timeout` ms at most). */
export function whenIdle(task: () => void, timeout = 1200): void {
  if (typeof window === 'undefined') return
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
  if (idle) idle(task, { timeout })
  else window.setTimeout(task, Math.min(timeout, 300))
}

if (typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1100px)').matches) preloadLink(GLOBE_POSTER.url, 'image', undefined, true)
// three.js (TextureLoader/useTexture) requests these images with crossOrigin "anonymous".
preloadLink(GLOBE_TEXTURES.preview, 'image', undefined, false, true)
preloadLink(GLOBE_TEXTURES.bump, 'image', undefined, false, true)
preloadLink(GLOBE_TEXTURES.color, 'image', undefined, false, true)
