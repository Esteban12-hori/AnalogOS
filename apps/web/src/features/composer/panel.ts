/**
 * Punto de carga diferida de «Tu misión» (planificador del equipo, historial y Deshacer). La
 * tarjeta vive en el chunk de misión junto al controlador; el chunk principal solo lleva este enlace.
 */
import { lazy } from 'react'
import type { AppData } from '../../shell/public'

/** Destino del foco de la pastilla de perfil cuando el panel izquierdo está en pantalla (≥1440). */
export const MISSION_PANEL_ID = 'composer-mission-panel'

export interface MissionPanelProps {
  data: AppData
  /** 'panel' = panel izquierdo ≥1440 · 'sheet' = pestaña de S2 · 'popover' = popover del composer <1440. */
  placement: 'panel' | 'sheet' | 'popover'
  /** Promesa del producto (App.tsx): se muestra antes de elegir recorrido. */
  promise?: string
}

export const LazyMissionPanel = lazy(() => import('./MissionPanel').then((module) => ({ default: module.MissionPanel })))
