import {
  assertSnapshotContracts,
  type CandidateSite,
  type DataManifest,
  type GeoJsonFeatureCollection,
  type MissionProfile,
} from '../domain/contracts'
import { parseSurfaceSeries, type SurfaceSeriesBySite } from '../domain/surfaceSeries'

export interface DemoSnapshot {
  candidates: CandidateSite[]
  manifest: DataManifest
  profile: MissionProfile
  chileOutline: GeoJsonFeatureCollection
  /** Series mensuales Sentinel-2; vacío si el snapshot no las trae (p. ej. el fixture demo). */
  surfaceSeries: SurfaceSeriesBySite
}

async function fetchJson(path: string): Promise<unknown> {
  const snapshotPath = import.meta.env.VITE_SNAPSHOT_PATH ?? 'science-v2'
  const response = await fetch(`${import.meta.env.BASE_URL}${snapshotPath}/${path}`)
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path} (${response.status}).`)
  }
  return response.json() as Promise<unknown>
}

export async function loadDemoSnapshot(): Promise<DemoSnapshot> {
  const [candidateData, manifestData, profileData, outlineData] = await Promise.all([
    fetchJson('candidate-details.json'),
    fetchJson('manifest.json'),
    fetchJson('mission-profile.json'),
    fetchJson('chile-outline.geojson'),
  ])
  // Opcional: un snapshot sin analysis-summary.json sigue siendo válido.
  const summaryData = await fetchJson('analysis-summary.json').catch(() => null)

  assertSnapshotContracts(candidateData, manifestData, profileData)

  const outline = outlineData as GeoJsonFeatureCollection
  if (outline.type !== 'FeatureCollection' || !Array.isArray(outline.features)) {
    throw new Error('El contorno de Chile no tiene formato GeoJSON FeatureCollection.')
  }

  return {
    candidates: candidateData,
    manifest: manifestData as DataManifest,
    profile: profileData as MissionProfile,
    chileOutline: outline,
    surfaceSeries: parseSurfaceSeries(summaryData),
  }
}
