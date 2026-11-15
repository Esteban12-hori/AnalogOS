import type {
  CandidateSite,
  DataManifest,
  GeoJsonFeatureCollection,
  MissionProfile,
  PrecedentCatalog,
  SearchResults,
} from '../domain/contracts'
import { assertSnapshotContracts } from '../domain/snapshotContracts'
import { parseMarsReference, type MarsReference } from '../domain/marsReference'
import { parseSurfaceSeries, type SurfaceSeriesBySite } from '../domain/surfaceSeries'

export const SNAPSHOT_PATH: string = import.meta.env.VITE_SNAPSHOT_PATH ?? 'science-v3'
/** El snapshot v3 trae búsqueda, antecedentes y contornos de ambos países; los históricos, no. */
export const IS_DISCOVERY_SNAPSHOT = SNAPSHOT_PATH === 'science-v3'

export interface DemoSnapshot {
  candidates: CandidateSite[]
  manifest: DataManifest
  profile: MissionProfile
  outline: GeoJsonFeatureCollection
  search: SearchResults | null
  precedents: PrecedentCatalog | null
  /** Series mensuales Sentinel-2; vacío si el snapshot no las trae (p. ej. el fixture demo). */
  surfaceSeries: SurfaceSeriesBySite
  /** Medianas MOLA de Jezero; null si el snapshot no las trae. */
  marsReference: MarsReference | null
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}${SNAPSHOT_PATH}/${path}`)
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path} (${response.status}).`)
  }
  return response.json() as Promise<unknown>
}

export async function loadDemoSnapshot(): Promise<DemoSnapshot> {
  // Todo en paralelo (index.html ya los precarga). analysis-summary.json es opcional: un
  // snapshot sin él sigue siendo válido.
  const [candidateData, manifestData, profileData, outlineData, searchData, precedentData, summaryData] = await Promise.all([
    fetchJson('candidate-details.json'),
    fetchJson('manifest.json'),
    fetchJson('mission-profile.json'),
    fetchJson(IS_DISCOVERY_SNAPSHOT ? 'context-outline.geojson' : 'chile-outline.geojson'),
    IS_DISCOVERY_SNAPSHOT ? fetchJson('search-results.json') : null,
    IS_DISCOVERY_SNAPSHOT ? fetchJson('precedents.json') : null,
    fetchJson('analysis-summary.json').catch(() => null),
  ])

  assertSnapshotContracts(candidateData, manifestData, profileData)
  if (IS_DISCOVERY_SNAPSHOT) {
    // Validadores de búsqueda y antecedentes en un chunk diferido (solo los necesita v3).
    const discovery: typeof import('../domain/discoveryContracts') = await import('../domain/discoveryContracts')
    discovery.assertDiscoveryContracts(searchData, precedentData)
  }

  const outline = outlineData as GeoJsonFeatureCollection
  if (outline.type !== 'FeatureCollection' || !Array.isArray(outline.features)) {
    throw new Error('El contorno de contexto no tiene formato GeoJSON FeatureCollection.')
  }

  return {
    candidates: candidateData,
    manifest: manifestData as DataManifest,
    profile: profileData as MissionProfile,
    outline,
    search: IS_DISCOVERY_SNAPSHOT ? (searchData as SearchResults) : null,
    precedents: IS_DISCOVERY_SNAPSHOT ? (precedentData as PrecedentCatalog) : null,
    surfaceSeries: parseSurfaceSeries(summaryData),
    marsReference: parseMarsReference(summaryData),
  }
}
