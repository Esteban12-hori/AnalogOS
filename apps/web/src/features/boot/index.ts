/**
 * features/boot — Loading WOW «Órbita honesta» (incremento 7): anillo y bitácora de hitos
 * reales en el HTML (plugin loadingHints), revelado del arranque, chip de estado y la órbita
 * reutilizable para la espera de la IA.
 * Slots: `stage.overlay` (BootLayer), `topbar.status` (StatusChip). Exporta OrbitLoader para
 * composer y analysis. El plugin de Vite vive en ./loadingHints.ts (código de Node: no lo
 * importes desde la app).
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo. Implementación actual: STUB (sin
 * coreografía; el chip muestra el estado real del snapshot; introPhase pasa a 'done').
 */
import type { AppData } from '../../shell/public'

export type BootMilestone = 'snapshot' | 'globe' | 'texture'
export type MilestoneStatus = 'pending' | 'ok' | 'error'

export interface BootLayerProps {
  data: AppData
}

export interface StatusChipProps {
  data: AppData
}

export interface OrbitLoaderProps {
  /** Mientras es true, la órbita marca la espera (2 vueltas de 2,4 s como máximo, luego estática). */
  active: boolean
  /** Texto de la fase real (p. ej. «Perfil recibido · validado · paso 2 de 4»). */
  label: string
  /** 'globe' = alrededor del globo en el escenario; 'inline' = junto a un texto. */
  placement?: 'globe' | 'inline'
}

export { BootLayer } from './BootLayer'
export { OrbitLoader } from './OrbitLoader'
export { StatusChip } from './StatusChip'
export { getBootMilestones, reportBootMilestone, useBootMilestones } from './milestones'
