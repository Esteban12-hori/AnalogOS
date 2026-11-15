/**
 * Parte diferida de la capa de líneas: lee los stores (cambios de estado, nunca por cuadro),
 * arma las vistas con `buildMetricViews` de features/metrics, elige las principales y monta
 * `LeaderStage`, que delega cada cuadro de cámara al controlador imperativo.
 *
 * `buildMetricViews` y el canal del escenario llegan por props desde LeaderLayer: este chunk
 * no importa `../metrics` ni `../globe` (ver LeaderStageBridge en projector.ts).
 */
import { useMemo } from 'react'
import type { CandidateSite } from '../../domain/contracts'
import { useViewportLayout, type AppData } from '../../shell/public'
import { useMission } from '../../state/mission'
import { useUi } from '../../state/ui'
// Directo del módulo (no del índice de metrics): así viaja en este chunk diferido y no en el
// principal (§6.1), sin arrastrar el resto de la feature.
import { buildMetricViews } from '../metrics/buildMetricViews'
import { leaderHeader, leaderLabelModelFor } from './labelModel'
import { LeaderStage } from './LeaderStage'
import { pickMissionMetrics, pickPrincipalMetrics } from './principal'
// La capa de requisitos sale del mismo reparto que usa el riel (función pura, sin estado).
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

  // Pesos y contribuciones SIEMPRE del snapshot; en Misión, los requisitos de la evaluación vigente.
  const option = mode === 'mision' ? evaluation?.options.find((item) => item.site_id === site.site_id) ?? null : null
  const missionActive = mode === 'mision' && evaluation !== null
  const outOfScope = missionActive && option === null
  const views = useMemo(() => {
    if (!snapshot) return []
    return buildMetricViews({ site, sites: snapshot.candidates, profile: snapshot.profile, weights: null, contributions: null, marsReference: snapshot.marsReference })
  }, [snapshot, site])
  const requirements = useMemo(() => requirementLayer(option, evaluatedRequest).byCriterion, [option, evaluatedRequest])
  const principal = useMemo(() => (missionActive ? pickMissionMetrics(views, requirements, 4) : pickPrincipalMetrics(views, 4)), [views, requirements, missionActive])
  const labels = useMemo(() => principal.map((view) => leaderLabelModelFor(view, requirements.get(view.criterionId) ?? [])), [principal, requirements])
  const header = useMemo(
    () => leaderHeader({ site, manifest: snapshot?.manifest ?? null, principal, missionActive }),
    [site, snapshot, principal, missionActive],
  )

  // Sin líneas para un sitio fuera del alcance de la evaluación (no hay requisitos que mostrar).
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
