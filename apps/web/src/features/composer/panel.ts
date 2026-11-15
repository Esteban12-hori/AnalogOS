/**
 * Lazy-loading entry point for "Your Mission" (the team planner, history and Undo). The
 * card lives in the mission chunk alongside the controller; the main chunk only carries this link.
 */
import { lazy } from 'react'
import type { AppData } from '../../shell/public'

/** Focus target of the profile pill when the left panel is on screen (≥1440). */
export const MISSION_PANEL_ID = 'composer-mission-panel'

export interface MissionPanelProps {
  data: AppData
  /** 'panel' = left panel ≥1440 · 'sheet' = S2 tab · 'popover' = composer popover <1440. */
  placement: 'panel' | 'sheet' | 'popover'
  /** Product promise (App.tsx): shown before choosing a path. */
  promise?: string
}

export const LazyMissionPanel = lazy(() => import('./MissionPanel').then((module) => ({ default: module.MissionPanel })))
