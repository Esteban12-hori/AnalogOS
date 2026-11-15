/** Selection of the main metrics for the Tesla lines (docs/UX_REDESIGN.md §3.4). Pure. */
import { CRITERION_IDS } from '../../domain/criteria'
import type { RequirementResult } from '../../mission/types'
import type { MetricView } from '../metrics'

/** Weights closer than this are considered tied (e.g. 3/11 computed two different ways). */
const WEIGHT_TIE = 1e-9

function canonicalIndex(criterionId: string): number {
  const index = (CRITERION_IDS as readonly string[]).indexOf(criterionId)
  return index === -1 ? CRITERION_IDS.length : index
}

/**
 * The `count` highest-weighted metrics of the active profile; ties are resolved by the canonical
 * order of criteria (and, beyond that, by id). Excluded ones are discarded (weight 0 or
 * status `excluded`): a metric without weight is not "main". It does not reorder by similarity or
 * by contribution: the order is set by the profile, never by the result.
 */
export function pickPrincipalMetrics(views: readonly MetricView[], count = 4): MetricView[] {
  const limit = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  if (limit === 0) return []
  return views
    .filter((view) => Number.isFinite(view.weight) && view.weight > 0 && view.status !== 'excluded')
    .slice()
    .sort((a, b) => {
      const byWeight = b.weight - a.weight
      if (Math.abs(byWeight) > WEIGHT_TIE) return byWeight
      const byCanon = canonicalIndex(a.criterionId) - canonicalIndex(b.criterionId)
      if (byCanon !== 0) return byCanon
      return a.criterionId < b.criterionId ? -1 : a.criterionId > b.criterionId ? 1 : 0
    })
    .slice(0, limit)
}

/**
 * Mission with evaluation (ADR-013): first the criteria with a test requirement
 * (essential ones before preferences) and, if there is room left, those with the highest base weight. Without
 * requirements, same as `pickPrincipalMetrics`. It never sorts by result.
 */
export function pickMissionMetrics(
  views: readonly MetricView[],
  requirements: ReadonlyMap<string, readonly RequirementResult[]>,
  count = 4,
): MetricView[] {
  const limit = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  if (limit === 0) return []
  const critical = (view: MetricView) => (requirements.get(view.criterionId) ?? []).some((result) => result.importance === 'critical')
  const withRequirement = views
    .filter((view) => (requirements.get(view.criterionId)?.length ?? 0) > 0)
    .sort((a, b) => Number(critical(b)) - Number(critical(a)) || canonicalIndex(a.criterionId) - canonicalIndex(b.criterionId))
  const chosen = withRequirement.slice(0, limit)
  const rest = pickPrincipalMetrics(views.filter((view) => !chosen.includes(view)), limit - chosen.length)
  return [...chosen, ...rest]
}
