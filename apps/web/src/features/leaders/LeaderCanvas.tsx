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
import { isMissionBusy, useUi } from '../../state/ui'
// Directo del módulo (no del índice de metrics): así viaja en este chunk diferido y no en el
// principal (§6.1), sin arrastrar el resto de la feature.
import { buildMetricViews } from '../metrics/buildMetricViews'
import { leaderHeader, leaderLabelModel } from './labelModel'
import { LeaderStage } from './LeaderStage'
import { pickPrincipalMetrics } from './principal'
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
  const busy = useUi((state) => isMissionBusy(state.missionPhase))
  const profile = useMission((state) => state.profile)
  const scoring = useMission((state) => state.scoring)
  const revision = useMission((state) => state.revision)
  const { width, height, tramo, compact, sideSheet } = useViewportLayout()
  const snapshot = data.snapshot

  // Pesos de tu misión solo cuando el motor ya puntuó ese mismo perfil; si no, los del snapshot.
  const missionActive = mode === 'mision' && profile !== null && scoring !== null && scoring.profileId === profile.id
  const views = useMemo(() => {
    if (!snapshot) return []
    const contributions = missionActive ? scoring?.sites.find((scored) => scored.siteId === site.site_id)?.contributions ?? null : null
    return buildMetricViews({
      site,
      sites: snapshot.candidates,
      profile: snapshot.profile,
      weights: missionActive && profile ? profile.weights : null,
      contributions,
      marsReference: snapshot.marsReference,
    })
  }, [snapshot, site, missionActive, profile, scoring])
  const principal = useMemo(() => pickPrincipalMetrics(views, 4), [views])
  const labels = useMemo(() => principal.map(leaderLabelModel), [principal])
  const header = useMemo(
    () => leaderHeader({ site, manifest: snapshot?.manifest ?? null, principal, missionActive }),
    [site, snapshot, principal, missionActive],
  )

  if (labels.length === 0) return null
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
      busy={busy}
      drawKey={`${site.site_id}:${missionActive ? `m${revision}` : 'base'}`}
      bridge={bridge}
    />
  )
}
