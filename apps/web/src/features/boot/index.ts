/**
 * features/boot — «Honest Orbit» loading WOW (increment 7): poster/silhouette, ring, satellite and
 * log of real milestones already in the HTML (loadingHints plugin + content/shell.ts), startup
 * reveal, status chip and the reusable orbit for the AI wait.
 * Slots: `stage.overlay` (BootLayer), `topbar.status` (StatusChip). Exports OrbitLoader for
 * composer and analysis. The Vite plugin lives in ./loadingHints.ts (Node code: do not
 * import it from the app).
 *
 * STABLE INTERFACE: types and signatures in this file. Added exports (compatible):
 * ORBIT_DELAY_MS and ORBIT_LOOP_MS, so that the composer light stays in phase with the orbit.
 */
import type { AppData } from '../../shell/public'

export type { BootMilestone, MilestoneStatus } from './bootModel'

export interface BootLayerProps {
  data: AppData
}

export interface StatusChipProps {
  data: AppData
}

export interface OrbitLoaderProps {
  /** While true, the orbit marks the wait (at most 2 loops of 2,4 s, then static). */
  active: boolean
  /** Text of the real phase (e.g. «Profile received · validated · step 2 of 4»). */
  label: string
  /** 'globe' = around the globe on the stage; 'inline' = next to a text. */
  placement?: 'globe' | 'inline'
}

export { BootLayer } from './BootLayer'
export { OrbitLoader } from './OrbitLoader'
export { StatusChip } from './StatusChip'
export { getBootMilestones, reportBootMilestone, useBootMilestones } from './milestones'
export { ORBIT_DELAY_MS, ORBIT_LOOP_MS } from './bootModel'
