/**
 * features/metrics — metric rail (MetricRail), pure model `buildMetricViews` and S1 content
 * on mobile (increment 5, docs/UX_REDESIGN.md §3.6).
 * Slots: `rail.metrics` (≥1100, 340–380 px rail), `full.metrics` ("Metrics" tab
 * of the full sheet, 520 px or S2) and `sheet.s1` (<1100).
 *
 * STABLE INTERFACE: types and signatures of this file. Only optional fields have been ADDED
 * (`MetricView.measure`, `MetricView.rule.consistent`) and new exports (`resolveMetricContext`,
 * `useMetricViews`, `limitingView`, catalog constants); nothing was removed or had its type changed.
 *
 * Implementation: `MetricRail` (main chunk) instantly renders the site's figures
 * (similarity, confidence, stability and feasibility, always kept separate) and lazy-loads
 * the per-criterion detail (accordion in the rail, cards in the sheet, carousel in S1).
 */
import type { CandidateSite, CriterionId, CriterionStatus, MissionProfile } from '../../domain/contracts'
import type { MarsReference } from '../../domain/marsReference'
import type { AppData } from '../../shell/public'

export interface MetricRailProps {
  data: AppData
  /** Lugar evaluado seleccionado (ui.selection.kind === 'evaluated'). */
  site: CandidateSite
  /** 'rail' = compact rail; 'full' = Metrics tab of the full sheet; 'sheet' = S1. */
  variant: 'rail' | 'full' | 'sheet'
  /** Requests "view the sector on the 2D map" (the shell frames the scene). */
  onShowOnMap?: () => void
}

/** A metric ready to be drawn. Every figure comes from the snapshot or the engine; nothing is invented. */
export interface MetricView {
  criterionId: CriterionId
  label: string
  /** What the criterion measures, in one line (optional: added in increment 5). */
  measure?: string
  /** Weight of the active profile (0–1); 0 = excluded. */
  weight: number
  /** Weight of the snapshot's base profile (0–1). */
  baseWeight: number
  /** Status of the data in the snapshot (does not change with the profile; the 0 weight indicates "excluded"). */
  status: CriterionStatus
  /** Similarity of the criterion 0–100 (integer when displayed); null = no data. */
  similarity: number | null
  /** Sector value: raw number, unit and already formatted text (es-CL). */
  siteValue: { raw: number | string | null; unit: string; text: string }
  /** ■ Jezero: only slope, roughness and relief (MOLA). null for the rest: never invented. */
  marsValue: { raw: number; unit: string; text: string } | null
  /**
   * ┆ Profile rule for bounded_preference criteria; null if not applicable.
   * `satisfied` = the rule reached its cap ("meets the rule"); null if no data or unverified.
   * `consistent` = the rule reproduces the snapshot's similarity (null = no known rule).
   */
  rule: { text: string; satisfied: boolean | null; consistent?: boolean | null } | null
  /** Direction and sector/Jezero ratio (only with marsValue). `ratio` = sector ÷ Jezero. */
  vsMars: { direction: 'more_demanding' | 'less_demanding' | 'similar'; ratio: number } | null
  /** Limiting factor = most negative contribution (`contribution` field of the pipeline or the engine). */
  isLimiting: boolean
  contribution: number | null
  /** "saturates" / "meets the rule · does not mean equal to Mars". */
  saturates: boolean
  /** Other site_ids with the same regional value (e.g., shared POWER aridity). */
  sharedRegionalWith: readonly string[]
  quality: number
  datasetId: string
}

export interface BuildMetricViewsInput {
  site: CandidateSite
  /** All evaluated sectors (for shared regional values and "best of N"). */
  sites: readonly CandidateSite[]
  profile: MissionProfile
  /** Weights of the active mission profile; null = snapshot base profile. */
  weights: Readonly<Partial<Record<CriterionId, number>>> | null
  /** Contributions from the TS engine with a mission profile; null = use the snapshot's `contribution`. */
  contributions: Readonly<Partial<Record<CriterionId, number | null>>> | null
  marsReference: MarsReference | null
}

export { MetricRail } from './MetricRail'
// The pure model (`buildMetricViews`, `limitingView`, catalog constants) and `useMetricViews`
// are imported DIRECTLY from './buildMetricViews' and './useMetricViews' in deferred code: if this
// index re-exported them, they would travel in the main chunk (§6.1).
export { resolveMetricContext, type MetricContext, type SiteFigures } from './metricContext'
