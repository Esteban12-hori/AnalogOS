/**
 * features/composer — mission composer, «Your mission» (team planner, history and
 * Undo) and results choreography, on top of the shared planner (ADR-013).
 * Orchestrates with the mission controller: `plannerReducer` → explicit confirmation →
 * `evaluateMission` (team, ADR-009) → writes state/mission and ui.missionPhase. It is the ONLY
 * writer of `state/mission.ts`. Anthropic's AI is only called via the explicit buttons.
 * Slots: `dock.composer` (≥1100), `sheet.tray.composer` (S0), `sheet.head` («Refine» button
 * in S1), `left.mission` (panel ≥1440 in Mission), `full.mission` («Your mission» tab in S2).
 * The 1100–1439 popover (and that of the <1100 tray) is opened by the Composer itself.
 *
 * STABLE INTERFACE: types and signatures of this file. Implementation: composer in the
 * main chunk; controller, planner, runtime Ajv, AI client and «Your mission» in the
 * deferred mission chunk (`missionController.ts`, `MissionPanel.tsx`), which is preloaded when entering
 * Mission or when focusing the dock.
 */
import type { AppData } from '../../shell/public'

export interface ComposerProps {
  data: AppData
  /** 'dock' (≥1100) · 'sheet' (S0 tray) · 'sheet-head' («Refine» button in the S1 header). */
  placement: 'dock' | 'sheet' | 'sheet-head'
  /** Only 'sheet-head': asks the shell to return to the S0 tray where the composer lives. */
  onRequestTray?: () => void
}

export interface MissionCardProps {
  data: AppData
  /** 'panel' = section of the left panel (≥1440) · 'sheet' = «Your mission» tab of S2. */
  placement: 'panel' | 'sheet'
  /** Product promise (App.tsx), in the Mission header before choosing a route. */
  promise?: string
}

export { Composer } from './Composer'
export { MissionCard } from './MissionCard'
export { focusComposer } from './focus'
export { registerMissionGeology, registerMissionSnapshot, withController } from './runLoader'
export { MissionPrintHost } from './printHost'
export { useMissionOpenRequest } from './composerStore'
