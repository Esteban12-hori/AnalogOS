/**
 * Web data contracts. The snapshot, search, and background TYPES are those of
 * shared/domain/contracts.ts (shared with the AI Node function, ADR-009); here they are only
 * re-exported as types, so as not to drag Ajv into the browser at runtime.

 * Validation at the boundary uses precompiled validators (scripts/build-validators.mjs) with the
 * same schemas and messages:
 * - snapshotContracts.ts: candidates, manifest, and profile (main chunk).
 * - discoveryContracts.ts: search and v3 background (deferred chunk).
 * - referenceAnalogContract.ts: ◆ catalog (deferred chunk).
 * This file re-exports them for tests and tooling; the main chunk code imports
 * the runtime values from their specific module (criteria, snapshotContracts).
 */
export type {
  CandidateGeometry,
  CandidateSite,
  CountryCode,
  CriterionStatus,
  DataManifest,
  DatasetManifestEntry,
  Discovery,
  Evidence,
  GeoJsonFeatureCollection,
  LiteratureReview,
  LiteratureStatus,
  MissionCriterion,
  MissionProfile,
  MultiPolygonGeometry,
  PolygonGeometry,
  Position,
  Precedent,
  PrecedentCatalog,
  PrecedentMatch,
  PrecedentRelation,
  ScoreBreakdownItem,
  ScoreItem,
  SearchDecision,
  SearchRegion,
  SearchResults,
  SearchWindow,
} from '../../../../shared/domain/contracts'

export { CRITERION_IDS, isCriterionId, type CriterionId } from './criteria'
export { assertSnapshotContracts, errorSummary } from './snapshotContracts'
export { assertDiscoveryContracts } from './discoveryContracts'

// ---------------------------------------------------------------------------
// Reference analogs (◆): contracts/reference-analog.schema.json
// They have no similarity, confidence, or ranking: the contract offers no place to put them.
// ---------------------------------------------------------------------------

export interface ReferenceAnalogSource {
  title: string
  url: string
  publisher?: string
}

/** Cited point with an uncertainty radius: it is drawn as an "approximate zone", never as a pin. */
export interface ApproximatePointLocation {
  kind: 'approximate_point'
  lon: number
  lat: number
  radius_km: number
}

/** Extensive region as a box [west, south, east, north]. */
export interface RegionLocation {
  kind: 'region'
  bbox: [number, number, number, number]
}

export interface ReferenceAnalog {
  id: string
  name: string
  country: string
  status: 'por_calcular'
  location: ApproximatePointLocation | RegionLocation
  summary?: string
  sources: ReferenceAnalogSource[]
}

export interface ReferenceAnalogCatalog {
  schema: 'reference-analogs/1'
  analogs: ReferenceAnalog[]
}
