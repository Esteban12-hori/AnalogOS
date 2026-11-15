/**
 * features/composer — composer de misión, «Tu misión» (planificador del equipo, historial y
 * Deshacer) y coreografía de resultados, sobre el planificador compartido (ADR-013).
 * Orquesta con el controlador de misión: `plannerReducer` → confirmación explícita →
 * `evaluateMission` (equipo, ADR-009) → escribe state/mission y ui.missionPhase. Es el ÚNICO
 * escritor de `state/mission.ts`. La IA de Anthropic solo se llama con los botones explícitos.
 * Slots: `dock.composer` (≥1100), `sheet.tray.composer` (S0), `sheet.head` (botón «Refinar»
 * en S1), `left.mission` (panel ≥1440 en Misión), `full.mission` (pestaña «Tu misión» en S2).
 * El popover de 1100–1439 (y de la bandeja <1100) lo abre el propio Composer.
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo. Implementación: composer en el chunk
 * principal; controlador, planificador, Ajv en runtime, cliente de IA y «Tu misión» en el chunk
 * diferido de misión (`missionController.ts`, `MissionPanel.tsx`), que se precarga al entrar a
 * Misión o al enfocar el dock.
 */
import type { AppData } from '../../shell/public'

export interface ComposerProps {
  data: AppData
  /** 'dock' (≥1100) · 'sheet' (bandeja S0) · 'sheet-head' (botón «Refinar» de la cabecera de S1). */
  placement: 'dock' | 'sheet' | 'sheet-head'
  /** Solo 'sheet-head': pide al armazón volver a la bandeja S0 donde vive el composer. */
  onRequestTray?: () => void
}

export interface MissionCardProps {
  data: AppData
  /** 'panel' = sección del panel izquierdo (≥1440) · 'sheet' = pestaña «Tu misión» de S2. */
  placement: 'panel' | 'sheet'
  /** Promesa del producto (App.tsx), en la cabecera de Misión antes de elegir recorrido. */
  promise?: string
}

export { Composer } from './Composer'
export { MissionCard } from './MissionCard'
export { focusComposer } from './focus'
export { registerMissionSnapshot, withController } from './runLoader'
export { MissionPrintHost } from './printHost'
export { useMissionOpenRequest } from './composerStore'
