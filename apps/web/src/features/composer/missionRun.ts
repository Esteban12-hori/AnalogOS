/**
 * Orquestador de la misión (chunk diferido de misión). El composer es el ÚNICO escritor de
 * `state/mission.ts` y de `ui.missionPhase` hasta `analysis` (docs/BUILD_CONTRACTS.md §2.7):
 *
 *   1. `interpreting` + resetCameraTouch()  →  lktron (si LKTRON_ENABLED) o matcher DEMO · sin IA
 *   2. `profile`  →  el cliente valida (mission-interpretation/1 + reglas §5.2) y arma el perfil
 *   3. `scoring`  →  engine.scoreMission (motor determinista: el orden y el % son suyos)
 *   4. escribe missionStore (revision + 1), deja el #1 en vista previa y pasa a `analysis`
 *   5. un solo anuncio con announce()
 *
 * «Cancelar y reemplazar»: una sola corrida vigente; un envío, una edición de niveles o un
 * perfil predefinido reemplazan la corrida anterior. La espera (§2.3 C) avanza con temporizadores
 * en los umbrales del motor, nunca por cuadro. Todo depende de `RunDeps` para probarse con dobles.
 */
import type { ContractCheck, MissionInterpretRequest, MissionInterpretation } from '../../domain/aiContracts'
// Solo el validador de la interpretación: los del paquete y del análisis van con la Lectura (§6.1).
import { checkMissionInterpretation } from '../../domain/interpretationContract'
import type { CandidateSite, MissionProfile } from '../../domain/contracts'
import { rankCandidates } from '../../domain/scoring'
import { announce, type AnnouncementKind } from '../../shell/public'
import { missionStore, type MissionError, type MissionState } from '../../state/mission'
import type { Store } from '../../state/store'
import { uiActions, type MissionPhase, type SelectionKind } from '../../state/ui'
import { LKTRON_ENABLED, interpretWithLktron, type LktronResult } from '../analysis'
import {
  MISSION_PRESETS,
  PHASE_THRESHOLDS,
  matchMissionDemo,
  profileFromLevels,
  scoreMission,
  type DemoMatch,
  type MissionPreset,
  type MissionProfileDraft,
  type MissionScoring,
  type PhaseThresholds,
  type ScoreMissionInput,
} from '../engine'
import { composerStore, UNDO_MAX, type ComposerRun, type ComposerState, type DemoHighlight, type MissionSnapshot, type PresetChip } from './composerStore'
import { addHistory, loadHistory, saveHistory, type HistoryEntry, type Levels } from './history'
import { QUIET_MS } from './labels'
import { activeCount, baseAnnouncement, buildInterpretRequest, firstRanked, interpretationLevels, resultAnnouncement, resultLineText } from './model'

/** Lo que el orquestador necesita del snapshot validado. */
export interface MissionSnapshotData {
  candidates: readonly CandidateSite[]
  profile: MissionProfile
}

/** Subconjunto de la interfaz estable de `features/engine` que usa el composer. */
export interface EngineApi {
  matchMissionDemo(text: string, base?: { id: string; version: string }): DemoMatch | null
  profileFromLevels(levels: Levels, base: { id: string; version: string }, label?: string): MissionProfileDraft
  scoreMission(input: ScoreMissionInput): MissionScoring
  readonly MISSION_PRESETS: readonly MissionPreset[]
  readonly PHASE_THRESHOLDS: PhaseThresholds
}

export interface RunDeps {
  engine: EngineApi
  lktron: {
    enabled: boolean
    interpret(request: MissionInterpretRequest, signal: AbortSignal): Promise<LktronResult<MissionInterpretation>>
  }
  validate(data: unknown): ContractCheck<MissionInterpretation>
  ui: {
    setMissionPhase(phase: MissionPhase): void
    resetCameraTouch(): void
    select(siteId: string, kind?: SelectionKind, preview?: boolean): void
  }
  mission: Store<MissionState>
  composer: Store<ComposerState>
  announce(text: string, kind?: AnnouncementKind): void
  persistHistory(list: readonly HistoryEntry[]): void
  now(): number
  setTimer(callback: () => void, ms: number): unknown
  clearTimer(handle: unknown): void
}

export interface ApplyOptions {
  /** true si el usuario tiene una selección manual: no se reemplaza por la vista previa del #1. */
  keepSelection?: boolean
}

export interface MissionController {
  /** Interpreta, arma el perfil, puntúa y escribe el resultado (reemplaza la corrida vigente). */
  submit(text: string, snapshot: MissionSnapshotData): Promise<void>
  /** Reenvía el último texto. */
  retry(snapshot: MissionSnapshotData): Promise<void>
  /** Esc, «Detener» o «Cancelar»: aborta la corrida vigente. false si no había ninguna. */
  cancel(): boolean
  /** «Usar perfil base»: vuelve al perfil del snapshot (% y orden del pipeline). */
  useBaseProfile(snapshot: MissionSnapshotData, options?: ApplyOptions): void
  /** Edición de niveles en «Tu misión»: recalcula con el motor, sin IA. */
  applyLevels(levels: Levels, snapshot: MissionSnapshotData, options?: ApplyOptions): void
  applyPreset(presetId: string, snapshot: MissionSnapshotData, options?: ApplyOptions): void
  /** Deshacer: restaura el estado anterior de la misión (revisión nueva). */
  undo(snapshot: MissionSnapshotData, options?: ApplyOptions): boolean
  /** Restaura una misión del historial con sus niveles (el motor recalcula el %). */
  restore(entryId: string, snapshot: MissionSnapshotData, options?: ApplyOptions): void
  clearHistory(): void
  presets(): PresetChip[]
  dispose(): void
}

const ENGINE_PENDING: MissionError = {
  code: 'unavailable',
  message: 'El motor de misión está por calcular en esta versión: no hay % para tu perfil.',
}
const DEMO_PENDING: MissionError = {
  code: 'unavailable',
  message: 'La interpretación DEMO · sin IA aún no está disponible: el motor de misión está por calcular.',
}
const CANCELLED: MissionError = { code: 'cancelled', message: 'Misión cancelada: se mantienen los resultados anteriores.' }

interface ActiveRun {
  run: ComposerRun
  controller: AbortController
  timers: unknown[]
}

function baseRef(snapshot: MissionSnapshotData): { id: string; version: string } {
  return { id: snapshot.profile.id, version: snapshot.profile.version }
}

function attempt<T>(fn: () => T): T | null {
  try {
    return fn()
  } catch {
    return null
  }
}

export function createMissionController(deps: RunDeps): MissionController {
  let active: ActiveRun | null = null
  let sequence = 0

  const isCurrent = (current: ActiveRun) => active === current && !current.controller.signal.aborted

  function clearTimers(current: ActiveRun): void {
    for (const timer of current.timers) deps.clearTimer(timer)
  }

  /** Aborta la corrida vigente sin tocar la fase (la reemplaza otra acción). */
  function abortActive(): ActiveRun | null {
    const current = active
    if (!current) return null
    active = null
    clearTimers(current)
    current.controller.abort()
    deps.composer.setState({ run: null, wait: null })
    return current
  }

  function endRun(current: ActiveRun): void {
    if (active !== current) return
    active = null
    clearTimers(current)
    deps.composer.setState({ run: null, wait: null })
  }

  function setWait(current: ActiveRun, wait: ComposerState['wait']): void {
    if (isCurrent(current)) deps.composer.setState({ wait })
  }

  function fail(current: ActiveRun | null, error: MissionError): void {
    if (current) {
      if (!isCurrent(current)) return
      endRun(current)
    }
    deps.mission.setState({ error })
    deps.ui.setMissionPhase('error')
    deps.announce(error.message, 'alert')
  }

  function startRun(text: string, interpreter: ComposerRun['interpreter']): ActiveRun {
    abortActive()
    const controller = new AbortController()
    sequence += 1
    const run: ComposerRun = { id: sequence, startedAt: deps.now(), text, interpreter }
    const thresholds = deps.engine.PHASE_THRESHOLDS
    const current: ActiveRun = { run, controller, timers: [] }
    current.timers = [
      deps.setTimer(() => setWait(current, 'busy'), QUIET_MS),
      deps.setTimer(() => setWait(current, 'counter'), thresholds.counterMs),
      deps.setTimer(() => {
        if (!isCurrent(current)) return
        setWait(current, 'slow')
        deps.announce('Está tardando más de lo normal. Puedes cancelar o usar el perfil base.')
      }, thresholds.slowMs),
      deps.setTimer(() => {
        if (active !== current) return
        active = null
        clearTimers(current)
        controller.abort()
        deps.composer.setState({ run: null, wait: null })
        fail(null, {
          code: 'timeout',
          message: `Tiempo agotado: la interpretación no respondió en ${Math.round(thresholds.timeoutMs / 1000)} s. Puedes reintentar.`,
        })
      }, thresholds.timeoutMs),
    ]
    active = current
    deps.composer.setState({ run, wait: 'quiet', notice: null, lastText: text })
    if (deps.mission.getState().error) deps.mission.setState({ error: null })
    return current
  }

  function capture(): MissionSnapshot {
    const { text, source, interpretation, profile, scoring } = deps.mission.getState()
    const { highlights, mentioned } = deps.composer.getState()
    return { mission: { text, source, interpretation, profile, scoring }, highlights, mentioned }
  }

  interface CommitOptions {
    highlights: readonly DemoHighlight[] | null
    mentioned: MissionSnapshot['mentioned']
    notice?: string | null
    preview: boolean
    history?: HistoryEntry | null
    /** 'push' apila el estado actual; una lista la reemplaza (Deshacer). */
    undo: 'push' | readonly MissionSnapshot[]
    announcement?: string
  }

  /**
   * Coreografía D en T0 (§2.3): primero los datos (missionStore, revisión nueva), luego la
   * vista previa del #1 y la fase; la animación decorativa la siguen globo, líneas y riel.
   * Hace el ÚNICO anuncio del resultado.
   */
  function commit(next: MissionSnapshot['mission'], snapshot: MissionSnapshotData, options: CommitOptions): void {
    const composer = deps.composer.getState()
    const undo = options.undo === 'push' ? [capture(), ...composer.undo].slice(0, UNDO_MAX) : options.undo
    const revision = deps.mission.getState().revision + 1
    deps.mission.setState({ ...next, error: null, revision })
    let history = composer.history
    if (options.history) {
      history = addHistory(history, options.history)
      deps.persistHistory(history)
    }
    const first = next.scoring ? firstRanked(next.scoring) : (rankCandidates(snapshot.candidates)[0]?.site_id ?? null)
    deps.composer.setState({
      highlights: options.highlights,
      mentioned: options.mentioned,
      undo,
      history,
      notice: options.notice ?? null,
      result: next.scoring ? { revision, text: resultLineText(next.scoring, snapshot.candidates), firstSiteId: first } : null,
    })
    if (first && options.preview) deps.ui.select(first, 'evaluated', true)
    deps.ui.setMissionPhase(next.profile ? 'analysis' : 'idle')
    deps.announce(
      options.announcement ?? (next.scoring ? resultAnnouncement(next.scoring, snapshot.candidates) : baseAnnouncement(snapshot.candidates)),
    )
  }

  /** Perfil → motor, sin IA (edición, predefinido, historial). null si el motor no está. */
  function score(profile: MissionProfileDraft | null, snapshot: MissionSnapshotData): MissionScoring | null {
    if (!profile) return null
    return attempt(() => deps.engine.scoreMission({ profile, candidates: snapshot.candidates, base: snapshot.profile }))
  }

  function historyEntry(text: string | null, source: HistoryEntry['source'], profile: MissionProfileDraft, presetId: string | null): HistoryEntry {
    const at = deps.now()
    return { id: `${at.toString(36)}-${profile.id}`, at, text, source, label: profile.label, levels: profile.levels, presetId }
  }

  function presetProfile(preset: Pick<MissionPreset, 'id' | 'label'>, levels: Levels, snapshot: MissionSnapshotData): MissionProfileDraft | null {
    const profile = attempt(() => deps.engine.profileFromLevels(levels, baseRef(snapshot), preset.label))
    return profile ? { ...profile, id: preset.id, origin: 'preset' } : null
  }

  /** Recalcula sin IA y publica (fases profile → scoring → analysis en el mismo tick). */
  function recompute(
    profile: MissionProfileDraft | null,
    next: Omit<MissionSnapshot['mission'], 'profile' | 'scoring'>,
    snapshot: MissionSnapshotData,
    options: Omit<CommitOptions, 'undo'> & { undo?: CommitOptions['undo'] },
  ): void {
    abortActive()
    deps.ui.setMissionPhase('profile')
    if (!profile) return fail(null, ENGINE_PENDING)
    deps.ui.setMissionPhase('scoring')
    const scoring = score(profile, snapshot)
    if (!scoring) return fail(null, ENGINE_PENDING)
    commit({ ...next, profile, scoring }, snapshot, { undo: 'push', ...options })
  }

  const controller: MissionController = {
    async submit(text, snapshot) {
      const trimmed = text.trim().slice(0, 600)
      if (!trimmed) return
      const interpreter = deps.lktron.enabled ? 'lktron' : 'demo'
      const current = startRun(trimmed, interpreter)
      deps.ui.setMissionPhase('interpreting')
      deps.ui.resetCameraTouch()

      let interpretation: MissionInterpretation | null = null
      let highlights: DemoHighlight[] | null = null
      let source: 'lktron' | 'demo' = interpreter
      let notice: string | null = null

      if (interpreter === 'lktron') {
        let result: LktronResult<MissionInterpretation>
        try {
          const levels = deps.mission.getState().profile?.levels ?? null
          result = await deps.lktron.interpret(buildInterpretRequest(trimmed, snapshot, levels), current.controller.signal)
        } catch (error) {
          result = { ok: false, code: 'unavailable', message: error instanceof Error ? error.message : 'lktron no respondió.' }
        }
        if (!isCurrent(current)) return
        if (result.ok) interpretation = result.value
        else if (result.code === 'aborted') return
        else if (result.code === 'timeout') {
          return fail(current, { code: 'timeout', message: 'Tiempo agotado: la IA no respondió. Puedes reintentar o usar el modo DEMO · sin IA.' })
        } else {
          // Sin red o respuesta inválida: el flujo central sigue sin IA (§1.18).
          notice =
            result.code === 'invalid'
              ? 'La interpretación de IA no pasó la validación: se usó el modo DEMO · sin IA.'
              : 'La IA no está disponible: se usó el modo DEMO · sin IA.'
          source = 'demo'
        }
      }

      if (!interpretation) {
        const match = attempt(() => deps.engine.matchMissionDemo(trimmed, { id: snapshot.profile.id, version: snapshot.profile.version }))
        if (!match) return fail(current, DEMO_PENDING)
        interpretation = match.interpretation
        highlights = match.highlights.map((item) => ({ start: item.start, end: item.end, criterionId: item.criterionId }))
        source = 'demo'
      }

      // Paso 2: el cliente valida el contrato y las reglas que el esquema no expresa.
      deps.ui.setMissionPhase('profile')
      const checked = deps.validate(interpretation)
      if (!checked.ok) {
        return fail(current, { code: 'invalid', message: 'La interpretación no cumple el contrato mission-interpretation/1: se descartó sin mostrarla.' })
      }
      if (source === 'lktron' && checked.value.base_profile.id !== snapshot.profile.id) {
        return fail(current, { code: 'invalid', message: 'La interpretación se refiere a otro perfil base: se descartó.' })
      }
      const levels = interpretationLevels(checked.value)
      if (!levels.ok) return fail(current, levels.error)
      const profile = attempt(() => deps.engine.profileFromLevels(levels.levels, baseRef(snapshot), 'Perfil de tu misión'))
      if (!profile) return fail(current, ENGINE_PENDING)

      // Paso 3: el motor determinista calcula y ordena.
      deps.ui.setMissionPhase('scoring')
      const scoring = score(profile, snapshot)
      if (!scoring) return fail(current, ENGINE_PENDING)
      if (!isCurrent(current)) return

      endRun(current)
      commit({ text: trimmed, source, interpretation: checked.value, profile, scoring }, snapshot, {
        highlights,
        mentioned: levels.mentioned,
        notice,
        preview: true,
        history: historyEntry(trimmed, source, profile, null),
        undo: 'push',
      })
    },

    async retry(snapshot) {
      const text = deps.composer.getState().lastText
      if (text) await controller.submit(text, snapshot)
    },

    cancel() {
      const current = abortActive()
      if (!current) return false
      deps.mission.setState({ error: CANCELLED })
      deps.ui.setMissionPhase('cancelled')
      deps.announce(CANCELLED.message)
      return true
    },

    useBaseProfile(snapshot, options = {}) {
      const hadRun = abortActive() !== null
      if (deps.mission.getState().profile === null) {
        // Ya rige el perfil base: solo se deja de esperar.
        deps.ui.setMissionPhase('idle')
        if (hadRun) deps.announce(baseAnnouncement(snapshot.candidates))
        return
      }
      commit({ text: null, source: null, interpretation: null, profile: null, scoring: null }, snapshot, {
        highlights: null,
        mentioned: null,
        preview: !options.keepSelection,
        undo: 'push',
      })
    },

    applyLevels(levels, snapshot, options = {}) {
      if (activeCount(levels) === 0) {
        abortActive()
        return fail(null, { code: 'insufficient', message: 'Deja al menos un criterio activo: con todos en Excluir no hay nada que puntuar.' })
      }
      const state = deps.mission.getState()
      const { highlights, mentioned } = deps.composer.getState()
      const profile = attempt(() => deps.engine.profileFromLevels(levels, baseRef(snapshot), 'Perfil personalizado'))
      recompute(profile, { text: state.text, source: state.source ?? 'preset', interpretation: state.interpretation }, snapshot, {
        highlights,
        mentioned,
        preview: !options.keepSelection,
      })
    },

    applyPreset(presetId, snapshot, options = {}) {
      const preset = deps.engine.MISSION_PRESETS.find((item) => item.id === presetId)
      if (!preset) return
      const profile = presetProfile(preset, preset.levels, snapshot)
      recompute(profile, { text: null, source: 'preset', interpretation: null }, snapshot, {
        highlights: null,
        mentioned: null,
        preview: !options.keepSelection,
        history: profile ? historyEntry(null, 'preset', profile, preset.id) : null,
      })
    },

    undo(snapshot, options = {}) {
      const [last, ...rest] = deps.composer.getState().undo
      if (!last) return false
      abortActive()
      commit(last.mission, snapshot, {
        highlights: last.highlights,
        mentioned: last.mentioned,
        preview: !options.keepSelection,
        undo: rest,
        announcement: `Deshecho. ${last.mission.scoring ? resultAnnouncement(last.mission.scoring, snapshot.candidates) : baseAnnouncement(snapshot.candidates)}`,
      })
      return true
    },

    restore(entryId, snapshot, options = {}) {
      const entry = deps.composer.getState().history.find((item) => item.id === entryId)
      if (!entry) return
      const profile = entry.presetId
        ? presetProfile({ id: entry.presetId, label: entry.label }, entry.levels, snapshot)
        : attempt(() => deps.engine.profileFromLevels(entry.levels, baseRef(snapshot), entry.label))
      recompute(profile, { text: entry.text, source: entry.source, interpretation: null }, snapshot, {
        highlights: null,
        mentioned: null,
        preview: !options.keepSelection,
        history: profile ? historyEntry(entry.text, entry.source, profile, entry.presetId) : null,
      })
    },

    clearHistory() {
      deps.composer.setState({ history: [] })
      deps.persistHistory([])
    },

    presets() {
      return deps.engine.MISSION_PRESETS.map((preset) => ({ id: preset.id, label: preset.label, description: preset.description }))
    },

    dispose() {
      abortActive()
    },
  }
  return controller
}

let singleton: MissionController | null = null

/** Controlador con las dependencias reales (motor, lktron detrás del flag, stores, announce). */
export function missionController(): MissionController {
  if (singleton) return singleton
  singleton = createMissionController({
    engine: { matchMissionDemo, profileFromLevels, scoreMission, MISSION_PRESETS, PHASE_THRESHOLDS },
    lktron: { enabled: LKTRON_ENABLED, interpret: interpretWithLktron },
    validate: checkMissionInterpretation,
    ui: uiActions,
    mission: missionStore,
    composer: composerStore,
    announce,
    persistHistory: (list) => saveHistory(list),
    now: () => Date.now(),
    setTimer: (callback, ms) => window.setTimeout(callback, ms),
    clearTimer: (handle) => window.clearTimeout(handle as number),
  })
  // Comodidades locales: perfiles predefinidos (chips) e historial de este navegador.
  composerStore.setState({ presets: singleton.presets(), history: loadHistory() })
  return singleton
}
