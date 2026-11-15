/**
 * Site profile and figures for the rail (pure function + hook), ADR-008/009/013.
 *
 *  - Weights, contributions, similarity, confidence, stability and feasibility are ALWAYS those of the
 *    snapshot (the pipeline's base profile). Mission does not recalculate or reweight: there is no mission %.
 *  - In Mission with an evaluation, a requirements layer is overlaid: what is required, what is observed and
 *    ✓/✕/○ per criterion (via `METRICS[metric_id].source.criterion_id`), plus the site rows
 *    (area, country) and the requests that were not measured ("pending · not measured"). Everything comes from
 *    the team's `MissionEvaluation`; here it is only distributed by criterion.
 *  - The REF (known reference) never has a rank in Explore.
 */
import { useMemo } from 'react'
import type { CandidateSite, CountryCode, CriterionId, MissionProfile } from '../../domain/contracts'
import { isCriterionId } from '../../domain/criteria'
import { rankMap, splitByRole } from '../../domain/discovery'
import type { MarsReference } from '../../domain/marsReference'
import { missionOrder, missionSiteViews, type SiteMissionStatus } from '../../domain/missionView'
import { validWeight } from '../../domain/scoring'
import { METRICS, RULES_VERSION } from '../../mission/catalog'
import type { MissionEvaluation, MissionRequest, OptionEvaluation, RequirementResult } from '../../mission/types'
import type { AppData } from '../../shell/public'
import { useMission } from '../../state/mission'
import { useUi, type UiMode } from '../../state/ui'
import type { BuildMetricViewsInput } from './index'

export interface SiteFigures {
  /** 0–100 of the snapshot; null = insufficient data. */
  similarity: number | null
  similarityState: 'scored' | 'insufficient' | 'pending'
  confidence: number | null
  /** 0–100; null = not calculated. */
  stability: number | null
  feasibility: CandidateSite['feasibility']
  /** Fraction of the profile weight with valid data (0–1); null if unknown. */
  coverage: number | null
  /** Criteria with valid data / criteria in the breakdown. */
  validCount: number
  criterionCount: number
}

/** Mission requirements layer over the rail (read-only view of the team's evaluation). */
export interface MissionLayer {
  status: SiteMissionStatus
  /** Rank in the evaluation (prioritized only). */
  rank: number | null
  option: OptionEvaluation | null
  /** Results of measurable requirements per snapshot criterion. */
  byCriterion: ReadonlyMap<CriterionId, readonly RequirementResult[]>
  /** Requirements on site attributes (area, country): they are not score criteria. */
  siteRows: readonly RequirementResult[]
  /** Requests that the snapshot does not measure: "pending · not measured". */
  unmeasured: readonly RequirementResult[]
  rulesVersion: string
  /** The evaluation no longer corresponds to what is being edited (results to --o-busy). */
  stale: boolean
}

export interface MetricContext {
  kind: 'base' | 'mission'
  /** "base profile v3.0.0-…": always that of the snapshot. */
  profileLabel: string
  /** Version of the Mission evaluation rules; null in Explore. */
  rulesVersion: string | null
  profileStatus: string
  input: BuildMetricViewsInput
  figures: SiteFigures
  /** site_ids in the current order (candidates and then REF; in Mission, that of the evaluation). */
  order: readonly string[]
  /** Explore: global rank (REF: null). Mission: rank in the evaluation (prioritized only). */
  rank: number | null
  /** Candidates with a rank in Explore (the "of 6"; never counts the REF). */
  rankedCount: number
  role: 'candidate' | 'reference'
  country: CountryCode | null
  mission: MissionLayer | null
  /** minimum_valid_weight of the base profile (0–1). */
  minimumValidWeight: number
}

export interface ResolveMetricContextArgs {
  site: CandidateSite
  candidates: readonly CandidateSite[]
  profile: MissionProfile
  marsReference: MarsReference | null
  mode: UiMode
  evaluation: MissionEvaluation | null
  request: MissionRequest | null
  stale?: boolean
}

/** Distributes an option's requirement results among criteria, site and not measured. */
export function requirementLayer(option: OptionEvaluation | null, request: MissionRequest | null): Pick<MissionLayer, 'byCriterion' | 'siteRows' | 'unmeasured'> {
  const byCriterion = new Map<CriterionId, RequirementResult[]>()
  const siteRows: RequirementResult[] = []
  const unmeasured: RequirementResult[] = []
  const metricOf = new Map((request?.requirements ?? []).flatMap((requirement) => (requirement.kind === 'measurable' ? [[requirement.requirement_id, requirement.metric_id] as const] : [])))
  for (const result of option?.requirement_results ?? []) {
    if (result.kind === 'unmeasured') {
      unmeasured.push(result)
      continue
    }
    const metric = metricOf.get(result.requirement_id)
    const source = metric ? METRICS[metric].source : null
    if (source?.kind === 'criterion' && isCriterionId(source.criterion_id)) {
      const list = byCriterion.get(source.criterion_id) ?? []
      list.push(result)
      byCriterion.set(source.criterion_id, list)
    } else {
      siteRows.push(result)
    }
  }
  // Essential ones first within each criterion (same order as the Tesla lines).
  for (const list of byCriterion.values()) list.sort((a, b) => Number(b.importance === 'critical') - Number(a.importance === 'critical'))
  return { byCriterion, siteRows, unmeasured }
}

/** Pure function: profile (always that of the snapshot), buildMetricViews input, figures and Mission layer. */
export function resolveMetricContext(args: ResolveMetricContextArgs): MetricContext {
  const { site, candidates, profile, marsReference, mode, evaluation, request, stale = false } = args
  const sites = candidates.some((candidate) => candidate.site_id === site.site_id) ? candidates : [...candidates, site]
  const breakdown = site.score_breakdown
  const validCount = breakdown.filter((item) => item.status === 'valid').length
  const totalWeight = profile.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)
  const role = site.role === 'reference' ? 'reference' : 'candidate'
  const { ranked, references } = splitByRole(sites)
  const ranks = rankMap(ranked)
  const figures: SiteFigures = {
    similarity: site.similarity,
    similarityState: site.similarity === null ? 'insufficient' : 'scored',
    confidence: site.confidence,
    stability: site.stability,
    feasibility: site.feasibility,
    coverage: totalWeight > 0 ? validWeight(breakdown) / totalWeight : null,
    validCount,
    criterionCount: breakdown.length,
  }
  const base = {
    profileLabel: `base profile v${profile.version}`,
    profileStatus: profile.status,
    input: { site, sites, profile, weights: null, contributions: null, marsReference },
    figures,
    rankedCount: ranked.length,
    role,
    country: site.country ?? null,
    minimumValidWeight: profile.aggregation.minimum_valid_weight,
  } as const

  if (mode === 'mision' && evaluation) {
    const ids = sites.map((candidate) => candidate.site_id)
    const view = missionSiteViews(evaluation, ids).get(site.site_id)
    return {
      ...base,
      kind: 'mission',
      rulesVersion: evaluation.rules_version || RULES_VERSION,
      order: missionOrder(evaluation, ids),
      rank: view?.rank ?? null,
      mission: {
        status: view?.status ?? 'fuera_de_alcance',
        rank: view?.rank ?? null,
        option: view?.option ?? null,
        ...requirementLayer(view?.option ?? null, request),
        rulesVersion: evaluation.rules_version || RULES_VERSION,
        stale,
      },
    }
  }

  return {
    ...base,
    kind: 'base',
    rulesVersion: null,
    order: [...ranked, ...references].map((candidate) => candidate.site_id),
    rank: role === 'reference' ? null : ranks.get(site.site_id) ?? null,
    mission: null,
  }
}

/** Site context (recalculated only if something that affects it changes). */
export function useMetricContext(data: AppData, site: CandidateSite | null): MetricContext | null {
  const mode = useUi((state) => state.mode)
  const evaluation = useMission((state) => state.evaluation)
  const request = useMission((state) => state.evaluatedRequest)
  const stale = useMission((state) => state.stale)
  const snapshot = data.snapshot
  return useMemo(() => {
    if (!site || !snapshot) return null
    return resolveMetricContext({ site, candidates: snapshot.candidates, profile: snapshot.profile, marsReference: snapshot.marsReference, mode, evaluation, request, stale })
  }, [site, snapshot, mode, evaluation, request, stale])
}
