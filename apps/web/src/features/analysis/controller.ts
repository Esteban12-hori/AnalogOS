/**
 * Controlador de la Lectura (chunk principal, liviano). Un único orquestador por página, aunque
 * el panel esté montado en varios slots o en ninguno (móvil en S0/S1):
 *  - cuando `ui.missionPhase` pasa a `analysis` (lo escribe el composer), arma la lectura de la
 *    misión: hechos primero, luego lktron o el pregenerado; termina con `setMissionPhase('done')`,
 *    también si solo hay hechos o si la IA falla;
 *  - una misión nueva (`interpreting`), `cancelled`, `error` o `idle` cancela el stream en curso;
 *  - la lectura del perfil base (Explorar) se arma a pedido de la UI, sin red de IA.
 * El código pesado (motor, validadores, vista) se descarga con `import()` al primer uso.
 */
import { loadDemoSnapshot, type DemoSnapshot } from '../../data/loadDemoSnapshot'
import { missionStore, type MissionState } from '../../state/mission'
import { uiActions, uiStore, type MissionPhase } from '../../state/ui'
import { missionReadingKey, readingStore } from './readingStore'
import type { Reading, ReadingContext } from './types'

export interface ReadingRuntime {
  runReading(input: {
    snapshot: DemoSnapshot
    context: ReadingContext
    mission: Pick<MissionState, 'profile' | 'scoring' | 'interpretation' | 'revision'> | null
    signal: AbortSignal
    allowLktron: boolean
    publish: (reading: Reading) => void
  }): Promise<Reading>
}

export interface ControllerDeps {
  loadRuntime: () => Promise<ReadingRuntime>
  getSnapshot: () => Promise<DemoSnapshot>
}

let registered: DemoSnapshot | null = null
let pendingLoad: Promise<DemoSnapshot> | null = null

/** Las vistas montadas entregan el snapshot que ya cargó la app (evita volver a pedirlo). */
export function registerSnapshot(snapshot: DemoSnapshot | null): void {
  if (snapshot) registered = snapshot
}

async function defaultSnapshot(): Promise<DemoSnapshot> {
  if (registered) return registered
  // Ningún panel montado (p. ej. móvil en S0): el mismo snapshot validado, desde la caché HTTP.
  pendingLoad ??= loadDemoSnapshot()
  const loaded = await pendingLoad
  registered ??= loaded
  return registered
}

const DEFAULT_DEPS: ControllerDeps = {
  loadRuntime: () => import('./deferred'),
  getSnapshot: defaultSnapshot,
}

let deps: ControllerDeps = DEFAULT_DEPS
let missionRun: AbortController | null = null
let baseRun: AbortController | null = null
let unsubscribe: (() => void) | null = null

function missionKey(state: MissionState): string | null {
  return state.profile && state.scoring ? missionReadingKey(state.profile.id, state.revision) : null
}

function message(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'No se pudo armar la lectura.'
}

/**
 * Arma (o rearma) la lectura de la misión vigente. `allowLktron` solo en la fase `analysis` o al
 * reintentar: abrir el panel nunca dispara una llamada de IA por sí solo.
 */
export async function runMissionReading(allowLktron: boolean): Promise<void> {
  const mission = missionStore.getState()
  const key = missionKey(mission)
  missionRun?.abort()
  const controller = new AbortController()
  missionRun = controller
  try {
    if (!key) return
    readingStore.patchSlot('mission', { status: 'building', error: null })
    const [runtime, snapshot] = await Promise.all([deps.loadRuntime(), deps.getSnapshot()])
    if (controller.signal.aborted) return
    await runtime.runReading({
      snapshot,
      context: 'mission',
      mission,
      signal: controller.signal,
      allowLktron,
      publish: (reading) => {
        if (!controller.signal.aborted) readingStore.setSlot('mission', { status: 'ready', reading, error: null })
      },
    })
  } catch (error) {
    if (!controller.signal.aborted) readingStore.patchSlot('mission', { status: 'error', error: message(error) })
  } finally {
    if (missionRun === controller) {
      missionRun = null
      // La fase la cierra quien la abrió: solo si sigue en `analysis` para ESTA misión.
      const current = missionStore.getState()
      if (!controller.signal.aborted && uiStore.getState().missionPhase === 'analysis' && missionKey(current) === key) {
        uiActions.setMissionPhase('done')
      }
    }
  }
}

/** Lectura del perfil base (Explorar): una vez por snapshot, sin red de IA. */
export async function ensureBaseReading(): Promise<void> {
  const slot = readingStore.getState().base
  if (baseRun || slot.status === 'ready' || slot.status === 'building') return
  const controller = new AbortController()
  baseRun = controller
  readingStore.patchSlot('base', { status: 'building', error: null })
  try {
    const [runtime, snapshot] = await Promise.all([deps.loadRuntime(), deps.getSnapshot()])
    await runtime.runReading({
      snapshot,
      context: 'base',
      mission: null,
      signal: controller.signal,
      allowLktron: false,
      publish: (reading) => readingStore.setSlot('base', { status: 'ready', reading, error: null }),
    })
  } catch (error) {
    readingStore.patchSlot('base', { status: 'error', error: message(error) })
  } finally {
    baseRun = null
  }
}

/** La UI pide la lectura de la misión vigente si falta o quedó desactualizada (sin IA). */
export function ensureMissionReading(): void {
  const state = missionStore.getState()
  const key = missionKey(state)
  if (!key || missionRun) return
  const slot = readingStore.getState().mission
  if (slot.status === 'building' || slot.reading?.key === key) return
  void runMissionReading(false)
}

/** Reintento explícito del análisis (botón ↻): vuelve a pedirlo a lktron si está activo. */
export function retryMissionAnalysis(): void {
  void runMissionReading(true)
}

const ABORTING: readonly MissionPhase[] = ['interpreting', 'cancelled', 'error', 'idle']

/**
 * Se suscribe a `ui.missionPhase`. Idempotente; devuelve la desuscripción (tests). Las
 * dependencias son inyectables para probar el ciclo completo sin red.
 */
export function startReadingController(overrides: Partial<ControllerDeps> = {}): () => void {
  deps = { ...DEFAULT_DEPS, ...overrides }
  if (unsubscribe) return unsubscribe
  let last = uiStore.getState().missionPhase
  const stop = uiStore.subscribe(() => {
    const phase = uiStore.getState().missionPhase
    if (phase === last) return
    last = phase
    if (phase === 'analysis') void runMissionReading(true)
    else if (ABORTING.includes(phase)) missionRun?.abort()
  })
  if (last === 'analysis') void runMissionReading(true)
  unsubscribe = () => {
    stop()
    unsubscribe = null
    deps = DEFAULT_DEPS
    missionRun?.abort()
    missionRun = null
    baseRun?.abort()
    baseRun = null
  }
  return unsubscribe
}

/** Solo tests: olvida el snapshot registrado. */
export function resetControllerForTests(): void {
  registered = null
  pendingLoad = null
}
