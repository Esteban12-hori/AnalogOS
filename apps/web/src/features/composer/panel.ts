/**
 * Punto de carga diferida de «Tu misión» (tarjeta, historial y edición de niveles). La tarjeta
 * vive en el chunk de misión junto al motor; el chunk principal solo lleva este enlace.
 */
import { lazy } from 'react'
import type { AppData } from '../../shell/public'

/** Destino del foco de la pastilla de perfil cuando el panel izquierdo está en pantalla (≥1440). */
export const MISSION_PANEL_ID = 'composer-mission-panel'

export interface MissionPanelProps {
  data: AppData
  /** 'panel' = panel izquierdo ≥1440 · 'sheet' = pestaña de S2 · 'popover' = popover del composer <1440. */
  placement: 'panel' | 'sheet' | 'popover'
}

export const LazyMissionPanel = lazy(() => import('./MissionPanel').then((module) => ({ default: module.MissionPanel })))
