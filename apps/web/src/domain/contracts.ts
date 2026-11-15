/**
 * Contratos de datos de la web. Los TIPOS del snapshot, la búsqueda y los antecedentes son los de
 * shared/domain/contracts.ts (compartidos con la función Node de IA, ADR-009); aquí solo se
 * reexportan como tipos, para no arrastrar Ajv en runtime al navegador.
 *
 * La validación en el límite usa validadores precompilados (scripts/build-validators.mjs) con los
 * mismos esquemas y mensajes:
 * - snapshotContracts.ts: candidatos, manifiesto y perfil (chunk principal).
 * - discoveryContracts.ts: búsqueda y antecedentes v3 (chunk diferido).
 * - referenceAnalogContract.ts: catálogo de ◆ (chunk diferido).
 * Este archivo los reexporta para tests y herramientas; el código del chunk principal importa
 * los valores en tiempo de ejecución desde su módulo concreto (criteria, snapshotContracts).
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
// Análogos de referencia (◆): contracts/reference-analog.schema.json
// No tienen similitud, confianza ni ranking: el contrato no ofrece dónde ponerlos.
// ---------------------------------------------------------------------------

export interface ReferenceAnalogSource {
  title: string
  url: string
  publisher?: string
}

/** Punto citado con radio de incertidumbre: se dibuja como «zona aproximada», nunca como pin. */
export interface ApproximatePointLocation {
  kind: 'approximate_point'
  lon: number
  lat: number
  radius_km: number
}

/** Región extensa como caja [oeste, sur, este, norte]. */
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
