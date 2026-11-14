/**
 * Hitos reales del arranque (snapshot validado, globo listo, textura nítida). Los reporta el
 * armazón; los lee la bitácora. STUB funcional: además, al resolverse el globo marca
 * `introPhase: 'done'` (sin coreografía) para que nada espere una intro que aún no existe.
 */
import { createStore, useStore } from '../../state/store'
import { uiActions } from '../../state/ui'
import type { BootMilestone, MilestoneStatus } from './index'

type Milestones = Record<BootMilestone, MilestoneStatus>

const milestones = createStore<Milestones>({ snapshot: 'pending', globe: 'pending', texture: 'pending' })

export function reportBootMilestone(milestone: BootMilestone, status: Exclude<MilestoneStatus, 'pending'>): void {
  milestones.setState({ [milestone]: status } as Partial<Milestones>)
  if (milestone === 'globe') uiActions.setIntroPhase('done')
}

export function getBootMilestones(): Readonly<Milestones> {
  return milestones.getState()
}

export function useBootMilestones(): Readonly<Milestones> {
  return useStore(milestones, (state) => state)
}
