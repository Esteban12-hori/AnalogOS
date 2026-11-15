/**
 * Printable mission report (ADR-013): ONE per page, mounted at the root of the shell
 * whenever there is a current evaluation, so that "Print report" works from the panel, the
 * popover or the mobile sheet even if they are closed. The content is the team's `PrintReport`.
 * M11: with no current report (initial load, unvalidated data, edited test or report still on
 * its way) the browser's print output shows a clear notice, never an empty page or an outdated report.
 */
import { lazy, Suspense } from 'react'
import type { AppData } from '../../shell/public'
import { useMission } from '../../state/mission'

const PrintContent = lazy(() => import('./PrintContent'))

export type PrintNoticeReason = 'loading_data' | 'no_result' | 'stale' | 'preparing'

export const PRINT_NOTICE: Readonly<Record<PrintNoticeReason, string>> = {
  loading_data: 'There is no report to print: the validated data are still loading.',
  no_result: 'There is no current report. Define the test in “Your mission”, confirm the requirements and evaluate; then use “Print report”.',
  stale: 'You edited the test: the previous report no longer matches what you are writing. Confirm and evaluate again in “Your mission” to print the current report.',
  preparing: 'The current report is being prepared. Close this print view and use “Print report” when the button is available.',
}

/** Pure: why there is no report to print (null = there is a current evaluation and the data is ready). */
export function printNoticeReason(dataReady: boolean, hasResult: boolean, stale: boolean): PrintNoticeReason | null {
  if (!dataReady) return 'loading_data'
  if (hasResult) return null
  return stale ? 'stale' : 'no_result'
}

export function PrintNotice({ reason }: { reason: PrintNoticeReason }) {
  return (
    <article className="pl-print-only mission-print-notice">
      <h1>AnalogOS · Recommendation report for a test</h1>
      <p>{PRINT_NOTICE[reason]}</p>
    </article>
  )
}

export function MissionPrintHost({ data }: { data: AppData }) {
  const current = useMission((state) => state.planner?.result ?? null)
  const stale = useMission((state) => state.stale)
  const snapshot = data.status === 'ready' ? data.snapshot : null
  const reason = printNoticeReason(snapshot !== null, current !== null, stale)
  return (
    <div className="mission-print" aria-hidden="true">
      {reason !== null || !snapshot ? (
        <PrintNotice reason={reason ?? 'loading_data'} />
      ) : (
        <Suspense fallback={<PrintNotice reason="preparing" />}>
          <PrintContent candidates={snapshot.candidates} />
        </Suspense>
      )}
    </div>
  )
}
