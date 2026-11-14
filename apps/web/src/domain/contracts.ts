import { type ErrorObject, type ValidateFunction } from 'ajv'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import candidateSchema from '../../../../contracts/candidate-site.schema.json'
import manifestSchema from '../../../../contracts/data-manifest.schema.json'
import profileSchema from '../../../../contracts/mission-profile.schema.json'

export type Position = [number, number]

export interface PolygonGeometry {
  type: 'Polygon'
  coordinates: Position[][]
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon'
  coordinates: Position[][][]
}

export type CandidateGeometry = PolygonGeometry | MultiPolygonGeometry

export type CriterionStatus = 'valid' | 'missing' | 'needs_calibration' | 'excluded'

export interface ScoreBreakdownItem {
  criterion_id: string
  raw_value: number | string | null
  unit: string
  normalized_similarity: number | null
  weight: number
  contribution: number | null
  quality: number
  dataset_id: string
  status: CriterionStatus
  explanation: string
}

export type ScoreItem = ScoreBreakdownItem

export interface Evidence {
  evidence_id: string
  dataset_id: string
  claim: string
  source_url: string
}

export interface CandidateSite {
  site_id: string
  name: string
  profile_id: string
  profile_version: string
  data_snapshot_version: string
  pipeline_version: string
  geometry: CandidateGeometry
  area_km2: number
  status: 'fixture' | 'candidate' | 'insufficient_data' | 'excluded'
  similarity: number | null
  confidence: number
  feasibility: 'unknown' | 'requires_review' | 'potentially_feasible' | 'excluded'
  stability: number | null
  score_breakdown: ScoreBreakdownItem[]
  warnings: string[]
  limitations: string[]
  field_checks: string[]
  evidence: Evidence[]
}

export interface DatasetManifestEntry {
  dataset_id: string
  provider: string
  product: string
  collection_version: string
  landing_url: string
  access_url: string
  downloaded_at: string
  time_start: string | null
  time_end: string | null
  spatial_resolution: string
  temporal_resolution: string
  crs: string
  units: string
  license: string
  checksum: string
  nodata: string | number | null
  quality_notes: string[]
  transformations: string[]
}

export interface DataManifest {
  snapshot_version: string
  created_at: string
  pipeline_version: string
  datasets: DatasetManifestEntry[]
}

export interface MissionCriterion {
  id: string
  label: string
  weight: number
  unit: string
  method: string
  status: string
}

export interface MissionProfile {
  id: string
  version: string
  name: string
  purpose: string
  status: 'needs_calibration' | 'validated' | 'deprecated'
  planetary_reference: {
    dataset_id: string
    body: 'mars' | 'moon'
    notes: string
  }
  aggregation: {
    method: 'weighted_geometric_mean'
    epsilon: number
    minimum_valid_weight: number
  }
  criteria: MissionCriterion[]
  hard_constraints: string[]
  limitations: string[]
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: Record<string, string | number | boolean | null>
    geometry: CandidateGeometry
  }>
}

const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)

const validateCandidate = ajv.compile(candidateSchema) as ValidateFunction<CandidateSite>
const validateManifest = ajv.compile(manifestSchema) as ValidateFunction<DataManifest>
const validateProfile = ajv.compile(profileSchema) as ValidateFunction<MissionProfile>

function errorSummary(errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) return 'error de contrato desconocido'
  return errors.map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`.trim()).join('; ')
}

export function assertSnapshotContracts(
  candidates: unknown,
  manifest: unknown,
  profile: unknown,
): asserts candidates is CandidateSite[] {
  if (!Array.isArray(candidates)) {
    throw new Error('candidate-details.json debe contener una lista.')
  }
  candidates.forEach((candidate, index) => {
    if (!validateCandidate(candidate)) {
      throw new Error(`Candidato ${index + 1} inválido: ${errorSummary(validateCandidate.errors)}`)
    }
  })
  if (!validateManifest(manifest)) {
    throw new Error(`Manifest inválido: ${errorSummary(validateManifest.errors)}`)
  }
  if (!validateProfile(profile)) {
    throw new Error(`Perfil inválido: ${errorSummary(validateProfile.errors)}`)
  }
}
