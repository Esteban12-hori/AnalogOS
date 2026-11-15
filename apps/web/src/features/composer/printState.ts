/**
 * Is the printable report of the current evaluation mounted? (M11). The only source of currency is
 * `planner.result` from state/mission (the team reducer nullifies it when editing): the report registers
 * here the result object it renders, and «Print report» is only enabled if it is the same object.
 * This way a click never prints a half-loaded report or one from another mission, and there is no deferred printing.
 */
import type { MissionEvaluation } from '../../mission'
import { useMission } from '../../state/mission'
import { createStore, useStore } from '../../state/store'

export const printStore = createStore<{ mounted: MissionEvaluation | null }>({ mounted: null })

/** The printable report signals that it is already rendering this result (null on unmount). */
export function markPrintMounted(result: MissionEvaluation): () => void {
  printStore.setState({ mounted: result })
  return () => {
    if (printStore.getState().mounted === result) printStore.setState({ mounted: null })
  }
}

/** Pure: ready only if there is a current result and the mounted report is exactly that one. */
export function isPrintReady(current: MissionEvaluation | null, mounted: MissionEvaluation | null): boolean {
  return current !== null && mounted === current
}

export function usePrintReady(): boolean {
  const current = useMission((state) => state.planner?.result ?? null)
  const mounted = useStore(printStore, (state) => state.mounted)
  return isPrintReady(current, mounted)
}
