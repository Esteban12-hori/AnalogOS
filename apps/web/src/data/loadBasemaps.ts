/**
 * Manifiesto de mapas base 2D horneados por `pipelines/fetch_basemaps.py` (NASA GIBS).
 * Si falta o es inválido, el mapa 2D sigue funcionando sin imágenes locales.
 */

export type Bounds = [west: number, south: number, east: number, north: number]

export interface Basemap {
  id: string
  /** `context`: vista Sentinel-2 por candidato de ADR-005 (no viene del manifiesto de mapas base). */
  kind: 'regional' | 'sector' | 'context'
  label: string
  bounds: Bounds
  image: string
  layers: string[]
  dates: string[]
  resolution_m: number
  gap_fraction: number
  source: string
}

function isBounds(value: unknown): value is Bounds {
  return Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

/** Validación en el límite del sistema: descarta entradas mal formadas en vez de romper el mapa. */
export function parseBasemaps(data: unknown): Basemap[] {
  if (typeof data !== 'object' || data === null || !Array.isArray((data as { basemaps?: unknown }).basemaps)) return []
  return ((data as { basemaps: unknown[] }).basemaps).filter((entry): entry is Basemap => {
    if (typeof entry !== 'object' || entry === null) return false
    const item = entry as Record<string, unknown>
    return (
      typeof item.id === 'string' &&
      (item.kind === 'regional' || item.kind === 'sector') &&
      typeof item.label === 'string' &&
      isBounds(item.bounds) &&
      item.bounds[0] < item.bounds[2] &&
      item.bounds[1] < item.bounds[3] &&
      typeof item.image === 'string' &&
      Array.isArray(item.dates) &&
      typeof item.resolution_m === 'number' &&
      typeof item.source === 'string'
    )
  })
}

export async function loadBasemaps(): Promise<Basemap[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}basemaps/basemaps.json`)
    if (!response.ok) return []
    return parseBasemaps(await response.json())
  } catch {
    return []
  }
}

/** Intersección de dos cajas [oeste, sur, este, norte]. */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]
}

export interface ActiveSource {
  id: string
  label: string
  detail: string
}

export interface OnlineLayers {
  /** Teselas Blue Marble de GIBS cargadas al menos una vez. */
  blueMarble: boolean
  /** Fechas HLS en línea si alguna tesela cargó; `null` si no hay conexión o no se pidieron. */
  hls: string[] | null
}

/**
 * Fuentes que realmente se ven en la vista: imágenes locales que intersectan el
 * encuadre a un zoom en que aportan detalle, más la capa global en línea si cargó.
 */
export function activeSources(view: Bounds, zoom: number, basemaps: Basemap[], online: OnlineLayers): ActiveSource[] {
  const visible = basemaps.filter((basemap) => boundsIntersect(view, basemap.bounds))
  const sectors = visible.filter((basemap) => basemap.kind === 'sector' && zoom >= 8)
  const regional = visible.filter((basemap) => basemap.kind === 'regional')
  const contexts = visible.filter((basemap) => basemap.kind === 'context' && zoom >= 8)
  const sources: ActiveSource[] = []
  const first = contexts[0]
  if (first) {
    sources.push({ id: 'sentinel2-context', label: first.label, detail: `${first.source} · ${contexts.length} sector(es)` })
  }
  if (sectors.length) {
    const dates = sectors.flatMap((sector) => sector.dates.map((item) => item.split(':')[1] ?? item)).sort()
    sources.push({
      id: 'hls',
      label: 'NASA HLS S30/L30 · ~30 m',
      detail: `Mediana por píxel ${dates[0] ?? ''} – ${dates.at(-1) ?? ''} · ${sectors.length} sector(es)`,
    })
  }
  if (online.hls?.length && zoom >= 8) {
    sources.push({
      id: 'hls-online',
      label: 'NASA HLS S30 en línea · ~30 m',
      detail: `NASA GIBS · fecha única por píxel ${online.hls[0]} – ${online.hls.at(-1)} (puede haber nubes)`,
    })
  }
  if (regional.length) {
    sources.push({ id: 'bluemarble-local', label: 'NASA Blue Marble NG · ~500 m', detail: 'Copia local · norte de Chile' })
  }
  if (online.blueMarble) {
    sources.push({ id: 'gibs-online', label: 'NASA GIBS Blue Marble', detail: 'Teselas en línea · resto del mundo' })
  }
  return sources
}
