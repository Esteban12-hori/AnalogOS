/**
 * Hook de conveniencia para otras features (leaders, analysis): las vistas de métricas del lugar
 * con el mismo perfil activo que usa el riel. Archivo aparte para que el chunk principal no
 * arrastre `buildMetricViews` si nadie lo usa ahí.
 */
import { useMemo } from 'react'
import type { AppData } from '../../shell/public'
import { buildMetricViews } from './buildMetricViews'
import type { MetricView } from './index'
import { useMetricContext } from './metricContext'

/**
 * Vistas de métricas del lugar con el perfil activo: la misma regla que usa el riel, para que
 * las líneas (leaders) y la Lectura (analysis) no diverjan. [] si no hay snapshot o lugar.
 */
export function useMetricViews(data: AppData, siteId: string | null): MetricView[] {
  const site = useMemo(
    () => (siteId === null ? null : data.snapshot?.candidates.find((candidate) => candidate.site_id === siteId) ?? null),
    [data.snapshot, siteId],
  )
  const context = useMetricContext(data, site)
  return useMemo(() => (context ? buildMetricViews(context.input) : []), [context])
}
