/**
 * Manifest of 2D base maps baked by `pipelines/fetch_basemaps.py` (NASA GIBS).
 * If it is missing or invalid, the 2D map keeps working without local images.
 */
import { getLocale, type Locale } from '../i18n/core'
import { tGlobe } from '../i18n/messages/globe'
import { scienceText } from '../i18n/science'

export type Bounds = [west: number, south: number, east: number, north: number]

export interface Basemap {
  id: string
  /** `context`: Sentinel-2 view per ADR-005 candidate (does not come from the base map manifest). */
  kind: 'world' | 'regional' | 'sector' | 'context'
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

/** Validation at the system boundary: discards malformed entries instead of breaking the map. */
export function parseBasemaps(data: unknown): Basemap[] {
  if (typeof data !== 'object' || data === null || !Array.isArray((data as { basemaps?: unknown }).basemaps)) return []
  return ((data as { basemaps: unknown[] }).basemaps).filter((entry): entry is Basemap => {
    if (typeof entry !== 'object' || entry === null) return false
    const item = entry as Record<string, unknown>
    return (
      typeof item.id === 'string' &&
      (item.kind === 'world' || item.kind === 'regional' || item.kind === 'sector') &&
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

/** Lightweight WebP version of an ADR-005, Sentinel-2 view tied to the SHA-256 of its PNG. */
export interface ContextPreview {
  site_id: string
  image: string
  source_sha256: string
}

export function parseContextPreviews(data: unknown): ContextPreview[] {
  const list = (data as { context_previews?: unknown } | null)?.context_previews
  if (!Array.isArray(list)) return []
  return list.filter((entry): entry is ContextPreview => {
    if (typeof entry !== 'object' || entry === null) return false
    const item = entry as Record<string, unknown>
    return (
      typeof item.site_id === 'string' &&
      typeof item.image === 'string' &&
      /^basemaps\/[a-z0-9-]+\.webp$/.test(item.image) &&
      typeof item.source_sha256 === 'string' &&
      /^[0-9a-f]{64}$/.test(item.source_sha256)
    )
  })
}

export interface BasemapManifest {
  basemaps: Basemap[]
  previews: ContextPreview[]
}

export async function loadBasemaps(): Promise<BasemapManifest> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}basemaps/basemaps.json`)
    if (!response.ok) return { basemaps: [], previews: [] }
    const data: unknown = await response.json()
    return { basemaps: parseBasemaps(data), previews: parseContextPreviews(data) }
  } catch {
    return { basemaps: [], previews: [] }
  }
}

/** Intersection of two boxes [west, south, east, north]. */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]
}

export interface ActiveSource {
  id: string
  /** Label and detail in the language current when the list was computed. */
  label: string
  detail: string
  /** Same facts in another language (the stage keeps the list and re-renders it when the language changes). */
  describe?: (locale: Locale) => { label: string; detail: string }
}

/** Label and detail of a source in a language (falls back to the stored text). */
export function sourceIn(source: ActiveSource, locale: Locale = getLocale()): { label: string; detail: string } {
  return source.describe ? source.describe(locale) : { label: source.label, detail: source.detail }
}

function described(id: string, describe: (locale: Locale) => { label: string; detail: string }): ActiveSource {
  return { id, ...describe(getLocale()), describe }
}

export interface OnlineLayers {
  /** GIBS Blue Marble tiles loaded at least once. */
  blueMarble: boolean
  /** Online HLS dates if any tile loaded; `null` if there is no connection or none were requested. */
  hls: string[] | null
}

/**
 * Sources that are actually visible in the view: local images that intersect the
 * frame at a zoom level where they provide detail, plus the global online layer if it loaded.
 */
export function activeSources(view: Bounds, zoom: number, basemaps: Basemap[], online: OnlineLayers): ActiveSource[] {
  const visible = basemaps.filter((basemap) => boundsIntersect(view, basemap.bounds))
  const sectors = visible.filter((basemap) => basemap.kind === 'sector' && zoom >= 8)
  const regional = visible.filter((basemap) => basemap.kind === 'regional')
  const world = visible.filter((basemap) => basemap.kind === 'world')
  const contexts = visible.filter((basemap) => basemap.kind === 'context' && zoom >= 8)
  const sources: ActiveSource[] = []
  const first = contexts[0]
  if (first) {
    sources.push(described('sentinel2-context', (locale) => ({
      label: scienceText(first.label, locale),
      detail: `${scienceText(first.source, locale)} · ${tGlobe.in(locale)('source.sectors', { count: contexts.length })}`,
    })))
  }
  if (sectors.length) {
    const dates = sectors.flatMap((sector) => sector.dates.map((item) => item.split(':')[1] ?? item)).sort()
    sources.push(described('hls', (locale) => ({
      label: 'NASA HLS S30/L30 · ~30 m',
      detail: tGlobe.in(locale)('source.hlsDetail', { from: dates[0] ?? '', to: dates.at(-1) ?? '', sectors: tGlobe.in(locale)('source.sectors', { count: sectors.length }) }),
    })))
  }
  const hls = online.hls
  if (hls?.length && zoom >= 8) {
    sources.push(described('hls-online', (locale) => ({
      label: tGlobe.in(locale)('source.hlsOnline'),
      detail: tGlobe.in(locale)('source.hlsOnlineDetail', { from: hls[0] ?? '', to: hls.at(-1) ?? '' }),
    })))
  }
  if (regional.length) {
    sources.push(described('bluemarble-local', (locale) => ({ label: 'NASA Blue Marble NG · ~500 m', detail: tGlobe.in(locale)('source.regionalDetail') })))
  }
  if (online.blueMarble) {
    sources.push(described('gibs-online', (locale) => ({ label: tGlobe.in(locale)('source.gibsOnline'), detail: tGlobe.in(locale)('source.gibsOnlineDetail') })))
  } else if (world.length) {
    sources.push(described('world-local', (locale) => ({ label: 'NASA Blue Marble NG · ~20 km', detail: tGlobe.in(locale)('source.worldDetail') })))
  }
  return sources
}
