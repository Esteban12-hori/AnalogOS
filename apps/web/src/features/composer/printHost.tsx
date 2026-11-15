/**
 * Printable mission report (ADR-013): ONE per page, mounted at the root of the shell
 * whenever there is a current evaluation, so that "Print report" works from the panel, the
 * popover or the mobile sheet even if they are closed. The content is the team's `PrintReport`.
 * M11: with no current report (initial load, unvalidated data, edited test or report still on
 * its way) the browser's print output shows a clear notice, never an empty page or an outdated report.
 */
import { lazy, Suspense } from 'react'
import { useT } from '../../i18n'
import { tComposer } from '../../i18n/messages/composer'
import type { AppData } from '../../shell/public'
import { useMission } from '../../state/mission'

const PrintContent = lazy(() => import('./PrintContent'))

export type PrintNoticeReason = 'loading_data' | 'no_result' | 'stale' | 'preparing'

/** English notices (the print view shows them in the interface language: `print.<reason>`). */
export const PRINT_NOTICE: Readonly<Record<PrintNoticeReason, string>> = {
  loading_data: tComposer.in('en')('print.loading_data'),
  no_result: tComposer.in('en')('print.no_result'),
  stale: tComposer.in('en')('print.stale'),
  preparing: tComposer.in('en')('print.preparing'),
}

/** Pure: why there is no report to print (null = there is a current evaluation and the data is ready). */
export function printNoticeReason(dataReady: boolean, hasResult: boolean, stale: boolean): PrintNoticeReason | null {
  if (!dataReady) return 'loading_data'
  if (hasResult) return null
  return stale ? 'stale' : 'no_result'
}

export function PrintNotice({ reason }: { reason: PrintNoticeReason }) {
  const t = useT(tComposer)
  return (
    <article className="pl-print-only mission-print-notice">
      <h1>{t('print.title')}</h1>
      <p>{t(`print.${reason}`)}</p>
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
