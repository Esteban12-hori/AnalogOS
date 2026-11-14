/**
 * features/metrics — riel de métricas (MetricRail), modelo puro `buildMetricViews` y contenido
 * de S1 en móvil (incremento 5, docs/UX_REDESIGN.md §3.6).
 * Slots: `rail.metrics` (≥1100, riel de 340–380 px), `full.metrics` (pestaña «Métricas»
 * de la ficha completa, 520 px o S2) y `sheet.s1` (<1100).
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo. Solo se han AÑADIDO campos opcionales
 * (`MetricView.measure`, `MetricView.rule.consistent`) y exports nuevos (`resolveMetricContext`,
 * `useMetricViews`, `limitingView`, constantes del catálogo); nada se quitó ni cambió de tipo.
 *
 * Implementación: `MetricRail` (chunk principal) pinta al instante las cifras del lugar
 * (similitud, confianza, estabilidad y factibilidad, siempre separadas) y carga en diferido
 * el detalle por criterio (acordeón en el riel, tarjetas en la ficha, carrusel en S1).
 */
import type { CandidateSite, CriterionId, CriterionStatus, MissionProfile } from '../../domain/contracts'
import type { MarsReference } from '../../domain/marsReference'
import type { AppData } from '../../shell/public'

export interface MetricRailProps {
  data: AppData
  /** Lugar evaluado seleccionado (ui.selection.kind === 'evaluated'). */
  site: CandidateSite
  /** 'rail' = riel compacto; 'full' = pestaña Métricas de la ficha completa; 'sheet' = S1. */
  variant: 'rail' | 'full' | 'sheet'
  /** Pide «ver el sector en el mapa 2D» (el armazón encuadra el escenario). */
  onShowOnMap?: () => void
}

/** Una métrica lista para dibujar. Toda cifra viene del snapshot o del motor; nada se inventa. */
export interface MetricView {
  criterionId: CriterionId
  label: string
  /** Qué mide el criterio, en una línea (opcional: añadido en el incremento 5). */
  measure?: string
  /** Peso del perfil activo (0–1); 0 = excluido. */
  weight: number
  /** Peso del perfil base del snapshot (0–1). */
  baseWeight: number
  /** Estado del dato en el snapshot (no cambia con el perfil; el peso 0 indica «excluido»). */
  status: CriterionStatus
  /** Similitud del criterio 0–100 (entera al mostrar); null = sin dato. */
  similarity: number | null
  /** Valor del sector: número crudo, unidad y texto ya formateado (es-CL). */
  siteValue: { raw: number | string | null; unit: string; text: string }
  /** ■ Jezero: solo pendiente, rugosidad y relieve (MOLA). null en el resto: nunca se inventa. */
  marsValue: { raw: number; unit: string; text: string } | null
  /**
   * ┆ Regla del perfil para criterios bounded_preference; null si no aplica.
   * `satisfied` = la regla llegó a su tope («cumple la regla»); null sin dato o sin verificar.
   * `consistent` = la regla reproduce la similitud del snapshot (null = no hay regla conocida).
   */
  rule: { text: string; satisfied: boolean | null; consistent?: boolean | null } | null
  /** Dirección y razón sector/Jezero (solo con marsValue). `ratio` = sector ÷ Jezero. */
  vsMars: { direction: 'more_demanding' | 'less_demanding' | 'similar'; ratio: number } | null
  /** Limitante = contribución más negativa (campo `contribution` del pipeline o del motor). */
  isLimiting: boolean
  contribution: number | null
  /** «satura» / «cumple la regla · no significa igual a Marte». */
  saturates: boolean
  /** Otros site_ids con el mismo valor regional (p. ej. aridez POWER compartida). */
  sharedRegionalWith: readonly string[]
  quality: number
  datasetId: string
}

export interface BuildMetricViewsInput {
  site: CandidateSite
  /** Todos los sectores evaluados (para valores regionales compartidos y «mejor de N»). */
  sites: readonly CandidateSite[]
  profile: MissionProfile
  /** Pesos del perfil de misión activo; null = perfil base del snapshot. */
  weights: Readonly<Partial<Record<CriterionId, number>>> | null
  /** Contribuciones del motor TS con perfil de misión; null = usar `contribution` del snapshot. */
  contributions: Readonly<Partial<Record<CriterionId, number | null>>> | null
  marsReference: MarsReference | null
}

export { MetricRail } from './MetricRail'
export {
  buildMetricViews,
  limitingView,
  BOUNDED_RULES,
  MARS_COMPARABLE,
  METRIC_LABELS,
  METRIC_MEASURES,
} from './buildMetricViews'
export { resolveMetricContext, type MetricContext, type SiteFigures } from './metricContext'
export { useMetricViews } from './useMetricViews'
