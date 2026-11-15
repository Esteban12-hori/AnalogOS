/**
 * Snapshot facts layer (docs/INTEGRATION_PLAN.md §2.3 and §5.2, layer 3). Deterministic facts
 * that have no equivalent in the team's planner: direction relative to
 * Jezero, limiting factor, saturating criterion, shared regional value, criterion with no
 * discrimination, best of N, missing data, checks, and ranking robustness.
 *
 * Every figure arrives already formatted (es-CL) by `buildMetricViews` or by the snapshot; nothing new is
 * computed here. No evidence package or fingerprint (they were removed along with lktron, ADR-012): the team's AI
 * only selects IDs from `MissionEvaluation` (ADR-009).
 *
 * Roles (ADR-008): search candidates carry their global rank; the known reference
 * (REF) is kept separate and never enters "best of N", the ranking gaps, or the robustness analysis.
 * Accepts sites in Chile and Argentina. Pure function: no stores or network.
 */
import type { CandidateSite, CriterionId, MissionProfile } from '../../domain/contracts'
import { CRITERION_IDS, isCriterionId } from '../../domain/criteria'
import { rankMap, splitByRole } from '../../domain/discovery'
import { criterionLabels } from '../../domain/formatting'
import { formatDecimal, formatInteger, formatScore, formatScorePercent, getLocale, withPercent, type Locale } from '../../i18n/core'
import { tReading } from '../../i18n/messages/reading'
import { scienceText } from '../../i18n/science'
import { siteName } from '../../mission/siteName'
import type { MetricView } from '../metrics'
import { PERTURBATION, type RobustnessSummary } from './robustness'
import type { ComparisonFacts, CriterionFact, DirectionFact, FactRef, FactsLayer, RobustnessFacts, SiteFacts } from './types'

export const FACT_TEXT_MAX = 80
export const CHECK_TEXT_MAX = 400
export const MAX_SITES = 12

/** Pilot sites: Chile or Argentina (same pattern as the v3 contract). */
const SITE_ID = /^(cl|ar)-[a-z0-9-]+$/

type TopographicId = 'slope' | 'terrain_roughness' | 'local_relief'

/** Direction phrase relative to Jezero, per topographic criterion (no figures), in a language. */
export function directionPhrase(id: TopographicId, direction: DirectionFact['direction'], locale: Locale = getLocale()): string {
  return tReading.in(locale)(`direction.${id}.${direction}`)
}

/** English direction phrases (tests, tooling). */
export const DIRECTION_PHRASE: Readonly<Record<TopographicId, Readonly<Record<DirectionFact['direction'], string>>>> = Object.fromEntries(
  (['slope', 'terrain_roughness', 'local_relief'] as const).map((id) => [id, Object.fromEntries((['more_demanding', 'less_demanding', 'similar'] as const).map((d) => [d, directionPhrase(id, d, 'en')]))]),
) as Record<TopographicId, Record<DirectionFact['direction'], string>>

function isTopographic(id: CriterionId): id is TopographicId {
  return id === 'slope' || id === 'terrain_roughness' || id === 'local_relief'
}

export interface FactsInput {
  /** Snapshot base profile (criteria, weights, and aggregation): the pipeline weights. */
  base: MissionProfile
  candidates: readonly CandidateSite[]
  /** `buildMetricViews` views per site_id (base profile). */
  views: ReadonlyMap<string, readonly MetricView[]>
  /** Summary of the pipeline sensitivity analysis (analysis-summary.json); null = not available. */
  robustness: RobustnessSummary | null
  robustnessReason?: string | null
  /** Only these sites (e.g. those evaluated in Mission); absent = all. */
  onlySiteIds?: readonly string[] | null
  /** Interface language of the fact texts (the current one by default). Figures and order do not depend on it. */
  locale?: Locale
}

/** Short place name, without the "— sector …" suffix, in the interface language. */
export function siteLabel(name: string, locale: Locale = getLocale()): string {
  return siteName(name, locale).split(' — ')[0]?.trim() || name
}

function pct(value: number, locale: Locale): string {
  return `${formatInteger(value, locale)} %`
}

/** Search candidates in their global order and, separately, the known references. */
function ordered(input: FactsInput): { ranked: CandidateSite[]; references: CandidateSite[] } {
  const keep = (site: CandidateSite) => SITE_ID.test(site.site_id) && (!input.onlySiteIds || input.onlySiteIds.includes(site.site_id))
  const { ranked, references } = splitByRole(input.candidates)
  return { ranked: ranked.filter(keep).slice(0, MAX_SITES), references: references.filter(keep) }
}

class FactBook {
  readonly facts: Record<string, string> = {}

  /** Registers a fact if its text fits the contract; returns the reference or null. */
  add(id: string, text: string | null | undefined): FactRef | null {
    if (!text) return null
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > FACT_TEXT_MAX) return null
    this.facts[id] = trimmed
    return { id, text: trimmed }
  }
}

export function buildFactsLayer(input: FactsInput): FactsLayer {
  const locale = input.locale ?? getLocale()
  const t = tReading.in(locale)
  const book = new FactBook()
  const { ranked, references } = ordered(input)
  const sites = [...ranked, ...references]
  const baseWeights = new Map(input.base.criteria.map((criterion) => [criterion.id, criterion.weight]))
  const weightOf = (id: string): number => (isCriterionId(id) ? (baseWeights.get(id) ?? 0) : 0)
  const globalRank = rankMap(splitByRole(input.candidates).ranked)
  const rankedTotal = globalRank.size
  const labels = new Map<CriterionId, string>()
  for (const views of input.views.values()) for (const view of views) labels.set(view.criterionId, view.label)
  /** Criterion name: the metric view's in English (unchanged), the Spanish vocabulary in Spanish. */
  const labelOf = (id: CriterionId): string => (locale === 'en' ? labels.get(id) ?? criterionLabels[id] ?? id : t(`criterion.${id}`))
  const viewLabel = (id: CriterionId, view: MetricView): string => (locale === 'en' ? view.label : t(`criterion.${id}`))
  const viewOf = (siteId: string, id: CriterionId): MetricView | undefined => input.views.get(siteId)?.find((view) => view.criterionId === id)
  const robustnessBySite = new Map((input.robustness?.sites ?? []).map((row) => [row.siteId, row]))

  // ---- Mars facts (only once) -----------------------------------------------------
  for (const id of CRITERION_IDS) {
    if (weightOf(id) <= 0) continue
    for (const site of sites) {
      const mars = viewOf(site.site_id, id)?.marsValue
      if (mars) {
        book.add(`mars:${id}`, mars.text)
        break
      }
    }
  }

  // ---- Per place ---------------------------------------------------------------------------
  const factsOf = (site: CandidateSite): SiteFacts => {
    const id = site.site_id
    const reference = site.role === 'reference'
    const similarity = site.similarity
    const insufficient = similarity === null
    const similarityText = similarity !== null ? formatScorePercent(similarity, locale) : t('fact.insufficient')
    const position = globalRank.get(id)
    const rank = reference
      ? book.add(`site:${id}:rank`, t('fact.rankReference'))
      : position !== undefined ? book.add(`site:${id}:rank`, t('fact.rank', { rank: position, total: rankedTotal })) : null
    const confidenceValue = site.confidence
    const stabilityValue = site.stability ?? robustnessBySite.get(id)?.stability ?? null
    const coverageValue = (() => {
      const total = input.base.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)
      const valid = site.score_breakdown.reduce((sum, item) => sum + (item.status === 'valid' ? item.weight : 0), 0)
      return total > 0 ? valid / total : null
    })()

    const directions: DirectionFact[] = []
    const saturates: CriterionFact[] = []
    let limiting: CriterionFact | null = null
    const criterionFact = (criterionId: CriterionId, view: MetricView): CriterionFact => {
      const valid = view.status === 'valid'
      const raw = valid && typeof view.siteValue.raw === 'number' && Number.isFinite(view.siteValue.raw)
        ? book.add(`site:${id}:${criterionId}:raw`, view.siteValue.text)
        : null
      const sim = view.similarity !== null ? book.add(`site:${id}:${criterionId}:sim`, pct(view.similarity, locale)) : null
      const marsText = book.facts[`mars:${criterionId}`]
      return { criterionId, label: viewLabel(criterionId, view), raw, mars: marsText ? { id: `mars:${criterionId}`, text: marsText } : null, sim }
    }

    for (const criterionId of CRITERION_IDS) {
      if (weightOf(criterionId) <= 0) continue
      const view = viewOf(id, criterionId)
      if (!view) continue
      const fact = criterionFact(criterionId, view)
      if (view.isLimiting && view.status === 'valid') limiting = fact
      if (isTopographic(criterionId) && view.vsMars && view.marsValue && view.status === 'valid') {
        const ratio = book.add(`site:${id}:${criterionId}:ratio`, `${formatDecimal(view.vsMars.ratio, locale)}× Jezero`)
        const phrase = book.add(`site:${id}:${criterionId}:vs_mars`, directionPhrase(criterionId, view.vsMars.direction, locale))
        if (ratio && phrase) directions.push({ criterionId, label: viewLabel(criterionId, view), direction: view.vsMars.direction, ratio, phrase, raw: fact.raw, mars: fact.mars })
      }
      if (view.saturates && view.status === 'valid') saturates.push(fact)
    }

    const missing = site.score_breakdown
      .filter((item) => item.status !== 'valid' && isCriterionId(item.criterion_id) && weightOf(item.criterion_id) > 0)
      .map((item) => ({
        criterionId: item.criterion_id as CriterionId,
        label: labelOf(item.criterion_id as CriterionId),
        status: item.status === 'needs_calibration' ? t('fact.missingPending') : item.status === 'excluded' ? t('fact.missingExcluded') : t('fact.missingNoData'),
      }))

    return {
      siteId: id,
      name: siteLabel(site.name, locale),
      reference,
      country: site.country ?? null,
      rank,
      similarity: book.add(`site:${id}:similarity`, similarityText),
      insufficient,
      confidence: confidenceValue !== null ? book.add(`site:${id}:confidence`, formatScore(confidenceValue, locale)) : null,
      stability: stabilityValue !== null ? book.add(`site:${id}:stability`, formatScore(stabilityValue, locale)) : null,
      feasibility: book.add(`site:${id}:feasibility`, t(`feasibility.${site.feasibility}`)),
      coverage: coverageValue !== null && Number.isFinite(coverageValue) ? book.add(`coverage:${id}`, t('fact.coverage', { percent: withPercent(formatInteger(coverageValue * 100, locale), locale) })) : null,
      directions,
      limiting,
      saturates,
      missing,
      checks: site.field_checks.slice(0, 99).map((text, index) => {
        const trimmed = scienceText(text, locale).trim()
        return { ref: `check:${id}:${index + 1}`, text: trimmed.length > CHECK_TEXT_MAX ? `${trimmed.slice(0, CHECK_TEXT_MAX - 1)}…` : trimmed }
      }).filter((check) => check.text.length > 0),
    }
  }
  const siteFacts = ranked.map(factsOf)
  const referenceFacts = references.map(factsOf)

  // ---- Comparison: candidates only (the REF does not compete in "best of N") ---------------------
  const comparison = compare(ranked, book, viewOf, weightOf, locale)

  // ---- Ranking gaps (candidates) ------------------------------------------------------
  const rankedScores = ranked.map((site) => site.similarity).filter((value): value is number => value !== null)
  const gaps: FactRef[] = []
  for (let index = 0; index + 1 < rankedScores.length; index += 1) {
    const a = rankedScores[index] as number
    const b = rankedScores[index + 1] as number
    const gap = book.add(`rank:gap:${index + 1}:${index + 2}`, t('fact.gap', { value: formatScore(a - b, locale) }))
    if (gap) gaps.push(gap)
  }

  // ---- Robustness (pipeline sensitivity over the candidates) ----------------------------
  const robustness = robustnessFacts(input, siteFacts, ranked, book, labelOf, locale)

  return { sites: siteFacts, references: referenceFacts, comparison: { ...comparison, gaps }, robustness }
}

function compare(
  sites: readonly CandidateSite[],
  book: FactBook,
  viewOf: (siteId: string, id: CriterionId) => MetricView | undefined,
  weightOf: (id: string) => number,
  locale: Locale,
): Omit<ComparisonFacts, 'gaps'> {
  const noDiscrimination: Array<ComparisonFacts['noDiscrimination'][number]> = []
  const bestOfN: Array<ComparisonFacts['bestOfN'][number]> = []
  const shared: Array<ComparisonFacts['shared'][number]> = []
  const seenShared = new Set<string>()
  const ids = new Set(sites.map((site) => site.site_id))
  const simRef = (siteId: string, criterionId: CriterionId): FactRef | null => {
    const id = `site:${siteId}:${criterionId}:sim`
    const text = book.facts[id]
    return text ? { id, text } : null
  }

  for (const criterionId of CRITERION_IDS) {
    if (weightOf(criterionId) <= 0) continue
    const rows = sites
      .map((site) => ({ siteId: site.site_id, view: viewOf(site.site_id, criterionId) }))
      .filter((row): row is { siteId: string; view: MetricView } => row.view !== undefined && row.view.status === 'valid' && row.view.similarity !== null)
      .map((row) => ({ ...row, similarity: row.view.similarity as number }))
    const label = locale === 'en' ? rows[0]?.view.label ?? criterionLabels[criterionId] ?? criterionId : tReading.in(locale)(`criterion.${criterionId}`)

    // What is shown is what gets compared: per-criterion similarity as an integer.
    const rounded = rows.map((row) => Math.round(row.similarity))
    if (rows.length >= 2 && rows.length === sites.length && rounded.every((value) => value === rounded[0])) {
      // "Does not distinguish": all valid places with the same displayed similarity.
      noDiscrimination.push({ criterionId, label, sims: rows.flatMap((row) => simRef(row.siteId, criterionId) ?? []) })
    } else if (rows.length >= 2) {
      // "Best of N": only if the first also beats the second in the displayed integer.
      const [first, second] = [...rows].sort((a, b) => b.similarity - a.similarity)
      if (first && second && Math.round(first.similarity) > Math.round(second.similarity)) {
        bestOfN.push({ criterionId, label, siteId: first.siteId, sim: simRef(first.siteId, criterionId) })
      }
    }

    // Shared regional value (e.g. POWER aridity), according to buildMetricViews.
    for (const row of rows) {
      const group = [row.siteId, ...row.view.sharedRegionalWith].filter((siteId) => ids.has(siteId))
      const unique = [...new Set(group)].sort()
      if (unique.length < 2) continue
      const key = `${criterionId}|${unique.join(',')}`
      if (seenShared.has(key)) continue
      seenShared.add(key)
      const rawId = `site:${unique[0]}:${criterionId}:raw`
      const text = book.facts[rawId]
      shared.push({ criterionId, label, siteIds: unique, raw: text ? { id: rawId, text } : null })
    }
  }
  return { noDiscrimination, bestOfN, shared }
}

function robustnessFacts(
  input: FactsInput,
  siteFacts: readonly SiteFacts[],
  sites: readonly CandidateSite[],
  book: FactBook,
  labelOf: (id: CriterionId) => string,
  locale: Locale,
): RobustnessFacts {
  const t = tReading.in(locale)
  const summary = input.robustness
  const bySite = new Map((summary?.sites ?? []).map((row) => [row.siteId, row]))
  const bars = sites.map((site, index) => {
    const stability = site.stability ?? bySite.get(site.site_id)?.stability ?? null
    return { siteId: site.site_id, name: siteFacts[index]?.name ?? siteLabel(site.name, locale), stability, text: stability === null ? null : formatScore(stability, locale) }
  })
  if (!summary) {
    return {
      status: 'por_calcular',
      perturbation: null,
      scenarios: null,
      flips: null,
      topFlips: null,
      mostSensitive: null,
      sites: bars,
      reason: input.robustnessReason ?? t('fact.robustnessUnavailable'),
    }
  }
  const mostSensitive = summary.mostSensitive ? book.add('sens:most_sensitive', labelOf(summary.mostSensitive)) : null
  if (summary.status === 'insufficient') {
    return { status: 'insufficient', perturbation: null, scenarios: null, flips: null, topFlips: null, mostSensitive, sites: bars, reason: t('fact.robustnessInsufficient') }
  }
  const total = summary.scenarios
  return {
    status: 'ready',
    perturbation: book.add('sens:perturbation', t('fact.perturbation', { percent: withPercent(formatInteger(PERTURBATION * 100, locale), locale) })),
    scenarios: book.add('sens:scenarios', t('fact.scenarios', { count: total })),
    flips: book.add('sens:flips', summary.flips === 0 ? t('fact.flipsNone') : t('fact.flips', { flips: summary.flips, total })),
    topFlips: book.add('sens:top_flips', summary.topFlips === 0 ? t('fact.topFlipsNone') : t('fact.topFlips', { flips: summary.topFlips, total })),
    mostSensitive,
    sites: bars,
    reason: null,
  }
}
