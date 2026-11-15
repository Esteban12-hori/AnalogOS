/**
 * Convenience hook for other features (leaders, analysis): the place's metric views
 * with the same active profile used by the rail. Separate file so that the main chunk does not
 * pull in `buildMetricViews` if nobody uses it there.
 */
import { useMemo } from 'react'
import type { AppData } from '../../shell/public'
import { buildMetricViews } from './buildMetricViews'
import type { MetricView } from './index'
import { useMetricContext } from './metricContext'

/**
 * The place's metric views with the active profile: the same rule used by the rail, so that
 * the lines (leaders) and the Reading (analysis) do not diverge. [] if there is no snapshot or place.
 */
export function useMetricViews(data: AppData, siteId: string | null): MetricView[] {
  const site = useMemo(
    () => (siteId === null ? null : data.snapshot?.candidates.find((candidate) => candidate.site_id === siteId) ?? null),
    [data.snapshot, siteId],
  )
  const context = useMetricContext(data, site)
  return useMemo(() => (context ? buildMetricViews(context.input) : []), [context])
}
