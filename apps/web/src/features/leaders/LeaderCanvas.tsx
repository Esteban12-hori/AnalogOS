/**
 * Deferred part of the lines layer: reads the stores (state changes, never per frame),
 * builds the views with `buildMetricViews` from features/metrics, chooses the main ones, and mounts
 * `LeaderStage`, which delegates each camera frame to the imperative controller.
 *
 * `buildMetricViews` and the stage channel arrive via props from LeaderLayer: this chunk
 * does not import `../metrics` or `../globe` (see LeaderStageBridge in projector.ts).
 */
import { useMemo } from 'react'
import type { CandidateSite } from '../../domain/contracts'
import { useLocale } from '../../i18n'
// Record text (`required`) in the interface language, loaded on demand only for Spanish (docs/I18N.md §5).
import { useRecordText, useViewportLayout, type AppData } from '../../shell/public'
import { useMission } from '../../state/mission'
import { useUi } from '../../state/ui'
// Directly from the module (not from the metrics index): this way it travels in this deferred chunk and not in the
// main one (§6.1), without dragging in the rest of the feature.
import { buildMetricViews } from '../metrics/buildMetricViews'
import { leaderHeader, leaderLabelModelFor } from './labelModel'
import { LeaderStage } from './LeaderStage'
import { pickMissionMetrics, pickPrincipalMetrics } from './principal'
// The requirements layer comes from the same distribution used by the rail (pure function, stateless).
import { requirementLayer } from '../metrics/metricContext'
import type { LeaderStageBridge } from './projector'

export interface LeaderCanvasProps {
  data: AppData
  site: CandidateSite
  bridge: LeaderStageBridge
}

export default function LeaderCanvas({ data, site, bridge }: LeaderCanvasProps) {
  const mode = useUi((state) => state.mode)
  const activeId = useUi((state) => state.activeCriterionId)
  const previewId = useUi((state) => state.previewCriterionId)
  const insets = useUi((state) => state.stageInsets)
  const obstacles = useUi((state) => state.obstacles)
  const evaluation = useMission((state) => state.evaluation)
  const evaluatedRequest = useMission((state) => state.evaluatedRequest)
  const stale = useMission((state) => state.stale)
  const revision = useMission((state) => state.revision)
  const { width, height, tramo, compact, sideSheet } = useViewportLayout()
  const snapshot = data.snapshot
  const locale = useLocale()
  const record = useRecordText()

  // Weights and contributions ALWAYS from the snapshot; in Mission, the requirements of the current assessment.
  const option = mode === 'mision' ? evaluation?.options.find((item) => item.site_id === site.site_id) ?? null : null
  const missionActive = mode === 'mision' && evaluation !== null
  const outOfScope = missionActive && option === null
  const views = useMemo(() => {
    if (!snapshot) return []
    return buildMetricViews({ site, sites: snapshot.candidates, profile: snapshot.profile, weights: null, contributions: null, marsReference: snapshot.marsReference }, locale)
  }, [snapshot, site, locale])
  const requirements = useMemo(() => requirementLayer(option, evaluatedRequest).byCriterion, [option, evaluatedRequest])
  const principal = useMemo(() => (missionActive ? pickMissionMetrics(views, requirements, 4) : pickPrincipalMetrics(views, 4)), [views, requirements, missionActive])
  const labels = useMemo(
    () => principal.map((view) => leaderLabelModelFor(view, requirements.get(view.criterionId) ?? [], locale, record.text)),
    [principal, requirements, locale, record],
  )
  const header = useMemo(
    () => leaderHeader({ site, manifest: snapshot?.manifest ?? null, principal, missionActive, locale }),
    [site, snapshot, principal, missionActive, locale],
  )

  // No lines for a site outside the scope of the assessment (there are no requirements to display).
  if (labels.length === 0 || outOfScope) return null
  return (
    <LeaderStage
      siteId={site.site_id}
      geometry={site.geometry}
      labels={labels}
      header={header}
      narrow={tramo === 'narrow'}
      sideSheet={sideSheet}
      compact={compact}
      width={width}
      height={height}
      insets={insets}
      obstacles={obstacles}
      activeId={previewId ?? activeId}
      busy={missionActive && stale}
      drawKey={`${site.site_id}:${missionActive ? `m${revision}` : 'base'}`}
      bridge={bridge}
    />
  )
}
