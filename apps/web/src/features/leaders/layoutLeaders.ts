/** Funciones puras de las líneas Tesla (incremento 6). STUB. */
import type { MetricView } from '../metrics'
import type { LeaderLayout, LeaderLayoutInput } from './index'

/** Las `count` métricas de mayor peso; empates por el orden canónico. STUB: ninguna. */
export function pickPrincipalMetrics(views: readonly MetricView[], count = 4): MetricView[] {
  void views
  void count
  return []
}

/** Columna de etiquetas sin cruces dentro del área segura, degradando 4→3→2→0. STUB: chip. */
export function layoutLeaders(input: LeaderLayoutInput): LeaderLayout {
  return { mode: 'chip', side: input.previousSide ?? 'right', placements: [] }
}
