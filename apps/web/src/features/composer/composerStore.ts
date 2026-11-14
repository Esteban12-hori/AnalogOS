/**
 * Estado PRIVADO del composer (no es estado compartido): corrida en curso, tramo de espera,
 * resaltados del modo DEMO, pila de Deshacer, historial y la línea de resultado. Lo compartido
 * vive en `state/mission.ts` (solo lo escribe el composer) y en `ui.missionPhase`.
 */
import type { CriterionId } from '../../domain/contracts'
import type { MissionState } from '../../state/mission'
import { createStore, useStore } from '../../state/store'
import type { HistoryEntry } from './history'
import type { WaitStage } from './labels'

export interface DemoHighlight {
  start: number
  end: number
  criterionId: CriterionId
}

export interface ComposerRun {
  id: number
  startedAt: number
  text: string
  interpreter: 'lktron' | 'demo'
}

/** Lo que Deshacer restaura (sin `revision` ni `error`: al restaurar se crea una revisión nueva). */
export interface MissionSnapshot {
  mission: Pick<MissionState, 'text' | 'source' | 'interpretation' | 'profile' | 'scoring'>
  highlights: readonly DemoHighlight[] | null
  mentioned: readonly CriterionId[] | null
}

/** Resumen del último resultado para la línea de estado (cifras del motor, ya formateadas). */
export interface ResultLine {
  revision: number
  /** «3 lugares ordenados por el motor v1.0.0» */
  text: string
  firstSiteId: string | null
}

export interface PresetChip {
  id: string
  label: string
  description: string
}

export interface ComposerState {
  run: ComposerRun | null
  wait: WaitStage | null
  /** Tramos del texto que activaron cada criterio (solo modo DEMO). */
  highlights: readonly DemoHighlight[] | null
  /** Criterios que la interpretación mencionó (el resto queda «no mencionado»). */
  mentioned: readonly CriterionId[] | null
  undo: readonly MissionSnapshot[]
  history: readonly HistoryEntry[]
  /** Aviso no bloqueante (p. ej. lktron no respondió y se usó DEMO). */
  notice: string | null
  /** Último texto enviado (para Reintentar). */
  lastText: string | null
  result: ResultLine | null
  /** Perfiles predefinidos del motor, cuando su chunk ya cargó (chips «Refinar»). */
  presets: readonly PresetChip[] | null
}

export const UNDO_MAX = 20

export function initialComposerState(history: readonly HistoryEntry[] = []): ComposerState {
  return { run: null, wait: null, highlights: null, mentioned: null, undo: [], history, notice: null, lastText: null, result: null, presets: null }
}

/** El historial se lee de localStorage cuando carga el chunk de misión (missionController). */
export const composerStore = createStore<ComposerState>(initialComposerState())

export function useComposer<T>(selector: (state: ComposerState) => T): T {
  return useStore(composerStore, selector)
}
