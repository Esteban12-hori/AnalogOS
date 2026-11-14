/**
 * Dobles de prueba del composer (solo tests). Las similitudes de `fakeEngine` son FIXTURE:
 * cifras sintéticas para probar la orquestación, nunca resultados científicos.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CriterionLevel, MissionInterpretation } from '../../domain/aiContracts'
import { CRITERION_IDS, type CandidateSite, type CriterionId, type MissionProfile } from '../../domain/contracts'
import { INITIAL_MISSION_STATE, type MissionState } from '../../state/mission'
import { createStore } from '../../state/store'
import type { MissionPhase, SelectionKind } from '../../state/ui'
import type { DemoMatch, MissionProfileDraft, MissionScoring } from '../engine'
import { initialComposerState, type ComposerState } from './composerStore'
import type { HistoryEntry, Levels } from './history'
import type { EngineApi, MissionSnapshotData, RunDeps } from './missionRun'

const root = resolve(__dirname, '../../../../..')
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))

/** Snapshot científico v2 real (artifacts/science-v2), validado por tests/snapshot.test.ts. */
export function realSnapshot(): MissionSnapshotData {
  return {
    candidates: read('artifacts/science-v2/candidate-details.json') as CandidateSite[],
    profile: read('artifacts/science-v2/mission-profile.json') as MissionProfile,
  }
}

export const MOBILITY: Levels = {
  slope: 3,
  terrain_roughness: 3,
  local_relief: 2,
  bare_ground_fraction: 2,
  aridity_context: 1,
  surface_temperature_variability: 0,
  geologic_relevance: 0,
}

export function levels(partial: Partial<Record<CriterionId, CriterionLevel>>): Levels {
  return Object.fromEntries(CRITERION_IDS.map((id) => [id, partial[id] ?? 0])) as Levels
}

export function interpretation(overrides: Partial<MissionInterpretation> = {}): MissionInterpretation {
  return {
    schema: 'mission-interpretation/1',
    engine: 'demo',
    model: 'keywords',
    prompt_version: '1.0.0',
    base_profile: { id: 'mars-rover-screening-v2', version: '2.0.1-preliminary' },
    status: 'ok',
    mission_summary: 'Misión DEMO por palabras clave: clave pendiente y rugosidad.',
    criteria: [
      { id: 'slope', level: 3, rationale: 'Mencionado en el texto: «pendiente».' },
      { id: 'terrain_roughness', level: 3, rationale: 'Mencionado en el texto: «rocoso».' },
      { id: 'local_relief', level: 2, rationale: 'Contexto de movilidad: nivel Importante.' },
    ],
    assumptions: ['Interpretación DEMO por palabras clave, sin IA.'],
    unsupported: [{ phrase: 'hielo', reason: 'not_measured' }],
    ...overrides,
  }
}

export function demoMatch(text: string, overrides: Partial<MissionInterpretation> = {}): DemoMatch {
  const start = text.indexOf('pendiente')
  return {
    interpretation: interpretation(overrides),
    highlights: start >= 0 ? [{ start, end: start + 'pendiente'.length, criterionId: 'slope' }] : [],
  }
}

export function draft(levelsIn: Levels, base: { id: string; version: string }, label = 'Perfil de prueba'): MissionProfileDraft {
  const total = CRITERION_IDS.reduce((sum, id) => sum + levelsIn[id], 0)
  const weights = Object.fromEntries(CRITERION_IDS.map((id) => [id, total > 0 ? levelsIn[id] / total : 0])) as Record<CriterionId, number>
  return {
    id: `mission:${CRITERION_IDS.map((id) => levelsIn[id]).join('')}`,
    origin: 'mission',
    label,
    status: 'needs_calibration',
    levels: levelsIn,
    weights,
    baseProfileId: base.id,
    baseProfileVersion: base.version,
  }
}

/** FIXTURE: motor de prueba que ordena según `order` (no según el snapshot) con % sintéticos. */
export function fakeEngine(order: readonly string[], overrides: Partial<EngineApi> = {}): EngineApi & { calls: { scored: MissionProfileDraft[] } } {
  const calls = { scored: [] as MissionProfileDraft[] }
  return {
    calls,
    matchMissionDemo: (text) => demoMatch(text),
    profileFromLevels: (levelsIn, base, label) => draft(levelsIn, base, label),
    scoreMission: ({ profile }): MissionScoring => {
      calls.scored.push(profile)
      return {
        profileId: profile.id,
        engineVersion: 'test-1.0.0',
        sites: order.map((siteId, index) => ({
          siteId,
          similarity: 80 - index * 10,
          rank: index + 1,
          status: 'scored',
          coverage: 1,
          confidence: null,
          contributions: {},
          limitingCriterionId: null,
        })),
      }
    },
    MISSION_PRESETS: [
      { id: 'preset-movilidad', label: 'Movilidad y autonomía', description: 'Pendiente y rugosidad como claves.', levels: MOBILITY },
    ],
    PHASE_THRESHOLDS: { counterMs: 3000, slowMs: 10000, timeoutMs: 20000 },
    ...overrides,
  }
}

export interface Harness {
  deps: RunDeps
  mission: ReturnType<typeof createStore<MissionState>>
  composer: ReturnType<typeof createStore<ComposerState>>
  phases: MissionPhase[]
  selections: Array<{ siteId: string; kind: SelectionKind | undefined; preview: boolean | undefined }>
  announcements: Array<{ text: string; kind: string }>
  cameraResets: number[]
  persisted: Array<readonly HistoryEntry[]>
  /** Avanza el reloj falso y dispara los temporizadores vencidos. */
  advance(ms: number): void
  pendingTimers(): number
}

export function harness(engine: EngineApi, overrides: Partial<RunDeps> = {}): Harness {
  const mission = createStore<MissionState>(INITIAL_MISSION_STATE)
  const composer = createStore<ComposerState>(initialComposerState())
  const phases: MissionPhase[] = []
  const selections: Harness['selections'] = []
  const announcements: Harness['announcements'] = []
  const cameraResets: number[] = []
  const persisted: Array<readonly HistoryEntry[]> = []
  let clock = 1_700_000_000_000
  let seq = 0
  const timers = new Map<number, { at: number; callback: () => void }>()
  const deps: RunDeps = {
    engine,
    lktron: { enabled: false, interpret: async () => ({ ok: false, code: 'unavailable', message: 'apagado' }) },
    validate: (data) => ({ ok: true, value: data as MissionInterpretation }),
    ui: {
      setMissionPhase: (phase) => {
        phases.push(phase)
      },
      resetCameraTouch: () => {
        cameraResets.push(phases.length)
      },
      select: (siteId, kind, preview) => {
        selections.push({ siteId, kind, preview })
      },
    },
    mission,
    composer,
    announce: (text, kind = 'status') => {
      announcements.push({ text, kind })
    },
    persistHistory: (list) => {
      persisted.push(list)
    },
    now: () => clock,
    setTimer: (callback, ms) => {
      seq += 1
      timers.set(seq, { at: clock + ms, callback })
      return seq
    },
    clearTimer: (handle) => {
      timers.delete(handle as number)
    },
    ...overrides,
  }
  return {
    deps,
    mission,
    composer,
    phases,
    selections,
    announcements,
    cameraResets,
    persisted,
    advance(ms) {
      const target = clock + ms
      for (;;) {
        const due = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
        if (!due) break
        timers.delete(due[0])
        clock = due[1].at
        due[1].callback()
      }
      clock = target
    },
    pendingTimers: () => timers.size,
  }
}
