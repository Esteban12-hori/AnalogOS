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
import { parseSensitivity, type SensitivityResult } from '../domain/sensitivity'
import { parseSurfaceSeries, type SurfaceSeriesBySite } from '../domain/surfaceSeries'
import { SNAPSHOT_OUTLINE_INVALID, snapshotLoadFailed } from './snapshotError'

export const SNAPSHOT_PATH: string = import.meta.env.VITE_SNAPSHOT_PATH ?? 'science-v3'
/** The v3 snapshot includes search, background data and boundaries for both countries; the historical ones do not. */
export const IS_DISCOVERY_SNAPSHOT = SNAPSHOT_PATH === 'science-v3'

export interface DemoSnapshot {
  candidates: CandidateSite[]
  manifest: DataManifest
  profile: MissionProfile
  outline: GeoJsonFeatureCollection
  search: SearchResults | null
  precedents: PrecedentCatalog | null
  /** Monthly Sentinel-2 series; empty if the snapshot does not include them (e.g., the demo fixture). */
  surfaceSeries: SurfaceSeriesBySite
  /** Jezero MOLA medians; null if the snapshot does not include them. */
  marsReference: MarsReference | null
  /** Per-site ranking sensitivity (analysis-summary.json); absent or empty if the snapshot does not include it. */
  sensitivity?: ReadonlyMap<string, SensitivityResult>
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}${SNAPSHOT_PATH}/${path}`)
  if (!response.ok) {
    // Canonical English; the error screen shows it in the interface language (data/snapshotError.ts).
    throw new Error(snapshotLoadFailed(path, response.status))
  }
  return response.json() as Promise<unknown>
}

export async function loadDemoSnapshot(): Promise<DemoSnapshot> {
  // Everything in parallel (index.html already preloads them). analysis-summary.json is optional: a
  // snapshot without it is still valid.
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
    // Search and background data validators in a deferred chunk (only v3 needs them).
    const discovery: typeof import('../domain/discoveryContracts') = await import('../domain/discoveryContracts')
    discovery.assertDiscoveryContracts(searchData, precedentData)
  }

  const outline = outlineData as GeoJsonFeatureCollection
  if (outline.type !== 'FeatureCollection' || !Array.isArray(outline.features)) {
    throw new Error(SNAPSHOT_OUTLINE_INVALID)
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
    sensitivity: parseSensitivity(summaryData),
  }
}
