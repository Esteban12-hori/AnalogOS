// Contexto visual offline: lee el índice local generado por pipelines/fetch_visual_context.py.
// La web nunca llama a Copernicus; solo sirve archivos que ya están en el build.
import type { CandidateSite } from '../domain/contracts'

export interface VisualSceneUse {
  orbit_index: number
  date_from: string | null
  date_to: string | null
  pixels: number
  fraction: number
}

export interface VisualSite {
  site_id: string
  name: string
  image: string
  sha256: string
  width: number
  height: number
  bbox: [number, number, number, number]
  extent_km: { width: number; height: number }
  approx_meters_per_pixel: number
  queried_at: string
  scenes_considered: number
  scenes_used: VisualSceneUse[] | null
}

export interface VisualContextIndex {
  kind: 'analogos-visual-context'
  schema_version: 1
  snapshot_version: string
  source: { collection: string; attribution: string }
  product: {
    period_label: string
    time_range: { from: string; to: string }
    mosaicking: string
    max_cloud_coverage_percent: number
    transformation: string
  }
  sites: VisualSite[]
}

export type VisualContextState =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; index: VisualContextIndex }

export type VisualSelection =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; index: VisualContextIndex; site: VisualSite }

const IMAGE_NAME = /^[a-z0-9-]+\.png$/

/** Cada snapshot tiene su paquete visual: el v3 no reutiliza el índice del v2. */
export const VISUAL_CONTEXT_DIR = (import.meta.env.VITE_SNAPSHOT_PATH ?? 'science-v3') === 'science-v3'
  ? 'visual-context-v3'
  : 'visual-context'

/** Ruta local de un archivo del paquete visual; funciona en "/", "./" y "/AnalogOS/". */
export function visualContextUrl(baseUrl: string, file: string, directory: string = VISUAL_CONTEXT_DIR): string {
  return `${baseUrl}${directory}/${file}`
}

function invalid(detail: string): never {
  throw new Error(`Índice de contexto visual no válido: ${detail}.`)
}

/** Valida lo que la interfaz usa del índice. Lanza Error si el archivo no es el esperado. */
export function parseVisualContext(data: unknown): VisualContextIndex {
  const index = data as Partial<VisualContextIndex> | null
  if (!index || index.kind !== 'analogos-visual-context' || index.schema_version !== 1) invalid('tipo o versión desconocidos')
  if (typeof index.snapshot_version !== 'string') invalid('falta la versión de snapshot')
  if (typeof index.source?.attribution !== 'string' || typeof index.source.collection !== 'string') invalid('falta la fuente')
  const product = index.product
  if (
    typeof product?.period_label !== 'string' || typeof product.mosaicking !== 'string'
    || typeof product.transformation !== 'string' || typeof product.max_cloud_coverage_percent !== 'number'
    || typeof product.time_range?.from !== 'string' || typeof product.time_range.to !== 'string'
  ) invalid('falta la descripción del producto')
  if (!Array.isArray(index.sites)) invalid('falta la lista de sitios')
  const seen = new Set<string>()
  for (const site of index.sites as unknown[]) {
    const siteId = validSite(site)
    if (seen.has(siteId)) invalid(`sitio repetido: ${siteId}`)
    seen.add(siteId)
  }
  return index as VisualContextIndex
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0
const isPositive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
const isDateOrNull = (value: unknown) => value === null || typeof value === 'string'

function validScene(scene: unknown): boolean {
  return isObject(scene)
    && isCount(scene.orbit_index) && isCount(scene.pixels)
    && isDateOrNull(scene.date_from) && isDateOrNull(scene.date_to)
    && typeof scene.fraction === 'number' && scene.fraction >= 0 && scene.fraction <= 1
}

/** Comprueba tipos y rangos de todo lo que el panel muestra de un sitio; devuelve su site_id. */
function validSite(site: unknown): string {
  if (!isObject(site) || typeof site.site_id !== 'string' || !site.site_id || typeof site.name !== 'string') {
    invalid('sitio sin identidad')
  }
  // La imagen debe ser la del propio candidato: un nombre simple dentro del paquete local.
  if (site.image !== `${site.site_id}.png` || !IMAGE_NAME.test(site.image)) invalid(`imagen no permitida en ${site.site_id}`)
  const bbox = site.bbox
  const extent = site.extent_km
  const complete = typeof site.sha256 === 'string' && /^[0-9a-f]{64}$/.test(site.sha256)
    && typeof site.queried_at === 'string'
    && isPositive(site.width) && Number.isInteger(site.width) && isPositive(site.height) && Number.isInteger(site.height)
    && isPositive(site.approx_meters_per_pixel) && isCount(site.scenes_considered)
    && Array.isArray(bbox) && bbox.length === 4 && bbox.every((value) => typeof value === 'number' && Number.isFinite(value))
    && bbox[0] < bbox[2] && bbox[1] < bbox[3]
    && bbox[0] >= -180 && bbox[2] <= 180 && bbox[1] >= -90 && bbox[3] <= 90
    && isObject(extent) && isPositive(extent.width) && isPositive(extent.height)
    && (site.scenes_used === null || (Array.isArray(site.scenes_used) && site.scenes_used.every(validScene)))
  if (!complete) invalid(`metadata incompleta o fuera de rango en ${site.site_id}`)
  return site.site_id
}

/** Decide qué mostrar para un candidato sin tocar su score, confianza ni factibilidad. */
export function selectVisualSite(state: VisualContextState, candidate: CandidateSite): VisualSelection {
  if (state.status !== 'ready') return state
  if (candidate.status === 'fixture') {
    return { status: 'unavailable', reason: 'Los fixtures sintéticos no tienen imagen satelital.' }
  }
  if (state.index.snapshot_version !== candidate.data_snapshot_version) {
    return { status: 'unavailable', reason: 'El paquete visual corresponde a otra versión de snapshot.' }
  }
  const site = state.index.sites.find((item) => item.site_id === candidate.site_id)
  return site
    ? { status: 'ready', index: state.index, site }
    : { status: 'unavailable', reason: 'No hay imagen para este candidato en el paquete visual.' }
}

/** Nunca lanza: si el índice falta o es inválido, la ficha sigue funcionando sin imagen. */
export async function loadVisualContext(baseUrl: string = import.meta.env.BASE_URL): Promise<VisualContextState> {
  try {
    const response = await fetch(visualContextUrl(baseUrl, 'index.json'))
    if (!response.ok) {
      return { status: 'unavailable', reason: `Este build no incluye contexto visual (${response.status}).` }
    }
    return { status: 'ready', index: parseVisualContext(await response.json()) }
  } catch (error) {
    return {
      status: 'unavailable',
      reason: error instanceof Error ? error.message : 'No se pudo leer el contexto visual.',
    }
  }
}
