/**
 * Apoyo de tests (solo lo importan archivos *.test.*; nunca la app): el snapshot científico v3
 * real tal como lo entrega loadDemoSnapshot, y evaluaciones del planificador del equipo
 * (`plannerReducer` + `evaluateMission`, sin cambios) para probar la interfaz integrada.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { DemoSnapshot } from '../data/loadDemoSnapshot'
import { assertDiscoveryContracts, assertSnapshotContracts, type DataManifest, type GeoJsonFeatureCollection, type MissionProfile, type PrecedentCatalog, type SearchResults } from '../domain/contracts'
import { parseMarsReference } from '../domain/marsReference'
import { parseSensitivity } from '../domain/sensitivity'
import { parseSurfaceSeries } from '../domain/surfaceSeries'
import {
  buildRequest,
  emptyScope,
  evaluateMission,
  exampleState,
  initialPlannerState,
  plannerReducer,
  type EvidenceBundle,
  type MissionEvaluation,
  type MissionRequest,
  type PlannerAction,
  type PlannerState,
  type ScopeInput,
} from '../mission'
import type { AppData } from '../shell/public'

export const REPO_ROOT = resolve(__dirname, '../../../..')
export const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(REPO_ROOT, path), 'utf8'))

export const YUNGAY = 'cl-pampa-yungay-screening'

export function loadV3Snapshot(): DemoSnapshot {
  const v3 = (file: string) => readJson(`artifacts/science-v3/${file}`)
  const candidates = v3('candidate-details.json')
  const manifest = v3('manifest.json')
  const profile = v3('mission-profile.json')
  const search = v3('search-results.json')
  const precedents = v3('precedents.json')
  assertSnapshotContracts(candidates, manifest, profile)
  assertDiscoveryContracts(search, precedents)
  const summary = v3('analysis-summary.json')
  return {
    candidates,
    manifest: manifest as DataManifest,
    profile: profile as MissionProfile,
    outline: v3('context-outline.geojson') as GeoJsonFeatureCollection,
    search: search as SearchResults,
    precedents: precedents as PrecedentCatalog,
    surfaceSeries: parseSurfaceSeries(summary),
    marsReference: parseMarsReference(summary),
    sensitivity: parseSensitivity(summary),
  }
}

export const v3Snapshot = loadV3Snapshot()
export const v3Bundle: EvidenceBundle = { candidates: v3Snapshot.candidates, manifest: v3Snapshot.manifest, profile: v3Snapshot.profile }
export const readyData: AppData = { status: 'ready', snapshot: v3Snapshot, visual: { status: 'loading' }, error: null }

const run = (state: PlannerState, actions: readonly PlannerAction[]) => actions.reduce(plannerReducer, state)

export interface Evaluated {
  state: PlannerState
  request: MissionRequest
  evaluation: MissionEvaluation
}

/** Ejemplo editable del equipo (pendiente ≤ 3°, suelo desnudo ≥ 95 %, tracción sin medición), confirmado y evaluado. */
export function evaluateExample(scope: ScopeInput = emptyScope(), extra: readonly PlannerAction[] = []): Evaluated {
  const confirmed = run(initialPlannerState(), [
    { type: 'set_journey', journey: 'test' },
    { type: 'load_example', example: exampleState() },
    { type: 'set_scope', scope },
    ...extra,
    { type: 'confirm' },
  ])
  const request = buildRequest(confirmed).request
  if (!request) throw new Error(`Solicitud inválida: ${buildRequest(confirmed).issues.join('; ')}`)
  const evaluation = evaluateMission(request, v3Bundle)
  const state = plannerReducer(confirmed, { type: 'evaluated', evaluation })
  return { state, request, evaluation }
}
