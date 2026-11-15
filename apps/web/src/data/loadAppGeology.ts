/**
 * Contexto geológico oficial para la interfaz integrada (M9, ADR-010 del equipo). Chunk DIFERIDO: el
 * validador del paquete (`shared/geology/context`) usa Ajv en runtime y no debe entrar al chunk de
 * entrada (docs/PERFORMANCE.md). Envuelve `loadGeologyContext` del equipo sin cambiarlo y calcula, con
 * `selectGeologySite`, qué sectores tienen SU ficha válida (misma geometría exacta, nunca heredada).
 *
 * Nunca lanza: ante cualquier problema devuelve «no disponible» y la ficha, el ranking y la misión
 * siguen funcionando sin geología.
 */
import type { CandidateSite } from '../domain/contracts'
import { selectGeologySite, type GeologyContextState } from '../domain/geologyContext'
import { loadGeologyContext } from './loadGeologyContext'

export interface AppGeology {
  /** Estado del paquete tal cual lo devuelve `loadGeologyContext` (el mismo objeto que usa la misión). */
  state: GeologyContextState
  /** Sectores con ficha geológica válida (`selectGeologySite(...).status === 'ready'`). */
  readySites: ReadonlySet<string>
}

export function appGeologyFrom(state: GeologyContextState, candidates: readonly CandidateSite[]): AppGeology {
  const readySites = new Set(candidates.filter((candidate) => selectGeologySite(state, candidate).status === 'ready').map((candidate) => candidate.site_id))
  return { state, readySites }
}

export async function loadAppGeology(candidates: CandidateSite[]): Promise<AppGeology> {
  const state = await loadGeologyContext(candidates)
  return appGeologyFrom(state, candidates)
}
