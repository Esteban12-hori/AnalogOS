/**
 * Carga diferida del controlador de misión (chunk de misión: planificador, evaluación, Ajv en
 * runtime, cliente de IA y exportación del equipo; docs/INTEGRATION_PLAN.md §3.8). El chunk
 * principal solo lleva este enlace. El bundle es el snapshot validado tal cual lo cargó la app.
 */
import type { DemoSnapshot } from '../../data/loadDemoSnapshot'
import type { GeologyContextState } from '../../domain/geologyContext'
import type { EvidenceBundle } from '../../mission/types'
import type { MissionController } from './missionController'
import { composerStore } from './composerStore'

let bundle: EvidenceBundle | null = null
let pending: Promise<MissionController> | null = null
let geology: GeologyContextState = { status: 'loading' }
const geologyListeners = new Set<(state: GeologyContextState) => void>()

/** El armazón registra el snapshot validado en cuanto llega (sin copiarlo ni transformarlo). */
export function registerMissionSnapshot(snapshot: DemoSnapshot | null): void {
  if (snapshot && !bundle) bundle = { candidates: snapshot.candidates, manifest: snapshot.manifest, profile: snapshot.profile }
}

/**
 * El armazón registra el contexto geológico oficial (M9/M10) cuando termina de cargar (o su ausencia).
 * Solo el tipo viaja aquí: el validador vive en un chunk diferido. El controlador lo recibe al crearse
 * y en cada cambio posterior.
 */
export function registerMissionGeology(state: GeologyContextState): void {
  if (state === geology) return
  geology = state
  for (const listener of [...geologyListeners]) listener(state)
}

export function registeredMissionGeology(): GeologyContextState {
  return geology
}

/** Suscripción del controlador: recibe el estado actual de inmediato y luego cada cambio. */
export function subscribeMissionGeology(listener: (state: GeologyContextState) => void): () => void {
  geologyListeners.add(listener)
  listener(geology)
  return () => {
    geologyListeners.delete(listener)
  }
}

export function loadController(): Promise<MissionController> {
  const current = bundle
  if (!current) return Promise.reject(new Error('El snapshot aún no está validado.'))
  pending ??= import('./missionController')
    .then((module) => module.missionController(current))
    .catch((error: unknown) => {
      pending = null
      throw error
    })
  return pending
}

/** Ejecuta `fn` con el controlador; si el chunk no carga (sin red y sin caché), avisa sin romper. */
export function withController(fn: (controller: MissionController) => unknown): void {
  loadController()
    .then(fn)
    .catch(() => {
      composerStore.setState({ notice: 'No se pudo cargar el planificador. Recargue la página para reintentar.' })
    })
}
