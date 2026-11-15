/** Content of the printable report (mission chunk): `PrintReport` of the team on the shared planner, with the geological orientation (M10) if there is context. */
import { useLayoutEffect } from 'react'
import { MissionPrintReport } from '../../components/planner/ResultView'
import type { CandidateSite } from '../../domain/contracts'
import { useMission } from '../../state/mission'
import { markPrintMounted } from './printState'

export default function PrintContent({ candidates }: { candidates: CandidateSite[] }) {
  const planner = useMission((state) => state.planner)
  const request = useMission((state) => state.request)
  const geologyCatalog = useMission((state) => state.geologyCatalog)
  const result = planner?.result ?? null
  const drawable = result !== null && request !== null
  // M11: "Print report" is enabled once THIS result is already in the report's DOM.
  useLayoutEffect(() => (drawable && result ? markPrintMounted(result) : undefined), [drawable, result])
  if (!planner || !result || !request) return null
  return <MissionPrintReport evaluation={result} request={request} state={planner} candidates={candidates} geologyCatalog={geologyCatalog} />
}
