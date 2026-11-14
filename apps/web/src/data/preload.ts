/**
 * Precarga de todo lo que el escenario necesita, para que el globo y el mapa 2D
 * respondan al instante. Se dispara al cargar el módulo (en paralelo con el snapshot)
 * y, en segundo plano, se calientan el chunk de MapLibre, su worker y las imágenes.
 */
import earthTextureUrl from '../assets/globe/earth-blue-marble-2k.jpg'
import earthBumpUrl from '../assets/globe/earth-topology-1k.jpg'

export const GLOBE_TEXTURES = { color: earthTextureUrl, bump: earthBumpUrl } as const

const requested = new Set<string>()

/** Inserta un <link rel="preload"> una sola vez por URL. */
export function preloadLink(href: string, as: 'image' | 'fetch' | 'script', type?: string): void {
  if (typeof document === 'undefined' || requested.has(href)) return
  requested.add(href)
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = as
  link.href = href
  if (type) link.type = type
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

/** Ejecuta `task` cuando el navegador esté ocioso (o tras `timeout` ms como máximo). */
export function whenIdle(task: () => void, timeout = 1200): void {
  if (typeof window === 'undefined') return
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
  if (idle) idle(task, { timeout })
  else window.setTimeout(task, Math.min(timeout, 300))
}

preloadLink(GLOBE_TEXTURES.color, 'image')
preloadLink(GLOBE_TEXTURES.bump, 'image')
