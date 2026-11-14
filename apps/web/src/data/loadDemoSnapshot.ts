import {
  assertDiscoveryContracts,
  assertSnapshotContracts,
  type CandidateSite,
  type DataManifest,
  type GeoJsonFeatureCollection,
  type MissionProfile,
  type PrecedentCatalog,
  type SearchResults,
} from '../domain/contracts'

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
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}${SNAPSHOT_PATH}/${path}`)
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path} (${response.status}).`)
  }
  return response.json() as Promise<unknown>
}

export async function loadDemoSnapshot(): Promise<DemoSnapshot> {
  const [candidateData, manifestData, profileData, outlineData, searchData, precedentData] = await Promise.all([
    fetchJson('candidate-details.json'),
    fetchJson('manifest.json'),
    fetchJson('mission-profile.json'),
    fetchJson(IS_DISCOVERY_SNAPSHOT ? 'context-outline.geojson' : 'chile-outline.geojson'),
    IS_DISCOVERY_SNAPSHOT ? fetchJson('search-results.json') : null,
    IS_DISCOVERY_SNAPSHOT ? fetchJson('precedents.json') : null,
  ])

  assertSnapshotContracts(candidateData, manifestData, profileData)
  if (IS_DISCOVERY_SNAPSHOT) assertDiscoveryContracts(searchData, precedentData)

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
  }
}
