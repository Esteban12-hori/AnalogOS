/**
 * features/metrics — riel de métricas (MetricRail), modelo puro `buildMetricViews` y contenido
 * de S1 en móvil (incremento 5).
 * Slots: `rail.metrics` (≥1100, riel de 340–380 px), `rail.full.metrics` (pestaña «Métricas»
 * de la ficha completa, 520 px o S2) y `sheet.s1` (<1100).
 *
 * INTERFAZ ESTABLE: tipos y firmas de este archivo. Implementación actual: STUB (MetricRail
 * muestra la ficha existente: cifras del lugar, advertencias y desglose; buildMetricViews → []).
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
  /** Peso del perfil activo (0–1); 0 = excluido. */
  weight: number
  /** Peso del perfil base del snapshot (0–1). */
  baseWeight: number
  status: CriterionStatus
  /** Similitud del criterio 0–100 (entera al mostrar); null = sin dato. */
  similarity: number | null
  /** Valor del sector: número crudo, unidad y texto ya formateado (es-CL). */
  siteValue: { raw: number | string | null; unit: string; text: string }
  /** ■ Jezero: solo pendiente, rugosidad y relieve (MOLA). null en el resto: nunca se inventa. */
  marsValue: { raw: number; unit: string; text: string } | null
  /** ┆ Regla del perfil para criterios bounded_preference; null si no aplica. */
  rule: { text: string; satisfied: boolean | null } | null
  /** Dirección y razón sector/Jezero (solo con marsValue). */
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
export { buildMetricViews } from './buildMetricViews'
