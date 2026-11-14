/**
 * features/composer — composer de misión, tarjeta «Tu misión» (niveles, Deshacer, historial)
 * y coreografía de resultados (incremento 9). Orquesta: interpretar (analysis.interpretWithLktron
 * o engine.matchMissionDemo) → perfil (engine) → motor (engine.scoreMission) → escribe
 * state/mission y ui.missionPhase. Es el ÚNICO escritor de `state/mission.ts`.
 * Slots: `dock.composer` (≥1100), `sheet.tray.composer` (S0), `sheet.head` (botón «✦ Refinar»
 * en S1), `left.mission` (panel ≥1440 en Misión), `full.mission` (pestaña «Tu misión» en S2).
 * El popover de 1100–1439 (y de la bandeja <1100) lo abre el propio Composer.
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo. Implementación: composer en el chunk
 * principal; orquestador, motor y tarjeta «Tu misión» en el chunk diferido de misión
 * (`missionRun.ts`, `MissionPanel.tsx`), que se precarga al entrar a Misión.
 */
import type { AppData } from '../../shell/public'

export interface ComposerProps {
  data: AppData
  /** 'dock' (≥1100) · 'sheet' (bandeja S0) · 'sheet-head' (botón «✦ Refinar» de la cabecera de S1). */
  placement: 'dock' | 'sheet' | 'sheet-head'
  /** Solo 'sheet-head': pide al armazón volver a la bandeja S0 donde vive el composer. */
  onRequestTray?: () => void
}

export interface MissionCardProps {
  data: AppData
  /** 'panel' = sección del panel izquierdo (≥1440) · 'sheet' = pestaña «Tu misión» de S2. */
  placement: 'panel' | 'sheet'
}

export { Composer } from './Composer'
export { MissionCard } from './MissionCard'
export { focusComposer } from './focus'
