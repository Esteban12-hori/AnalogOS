/**
 * Perfil y cifras del lugar para el riel (función pura + hook), ADR-008/009/013.
 *
 *  - Pesos, contribuciones, similitud, confianza, estabilidad y factibilidad son SIEMPRE las del
 *    snapshot (perfil base del pipeline). Misión no recalcula ni repondera: no existe un % de misión.
 *  - En Misión con evaluación se superpone una capa de requisitos: lo exigido, lo observado y
 *    ✓/✕/○ por criterio (vía `METRICS[metric_id].source.criterion_id`), más las filas del sitio
 *    (área, país) y los pedidos no medidos («pendiente · no medido»). Todo sale de
 *    `MissionEvaluation` del equipo; aquí solo se reparte por criterio.
 *  - La REF (referencia conocida) nunca tiene puesto en Explorar.
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
  /** 0–100 del snapshot; null = datos insuficientes. */
  similarity: number | null
  similarityState: 'scored' | 'insufficient' | 'pending'
  confidence: number | null
  /** 0–100; null = sin calcular. */
  stability: number | null
  feasibility: CandidateSite['feasibility']
  /** Fracción del peso del perfil con datos válidos (0–1); null si no se conoce. */
  coverage: number | null
  /** Criterios con dato válido / criterios del desglose. */
  validCount: number
  criterionCount: number
}

/** Capa de requisitos de Misión sobre el riel (solo lectura de la evaluación del equipo). */
export interface MissionLayer {
  status: SiteMissionStatus
  /** Puesto de la evaluación (solo priorizados). */
  rank: number | null
  option: OptionEvaluation | null
  /** Resultados de requisitos medibles por criterio del snapshot. */
  byCriterion: ReadonlyMap<CriterionId, readonly RequirementResult[]>
  /** Requisitos sobre atributos del sitio (área, país): no son criterios del score. */
  siteRows: readonly RequirementResult[]
  /** Pedidos que el snapshot no mide: «pendiente · no medido». */
  unmeasured: readonly RequirementResult[]
  rulesVersion: string
  /** La evaluación ya no corresponde a lo que se está editando (resultados a --o-busy). */
  stale: boolean
}

export interface MetricContext {
  kind: 'base' | 'mission'
  /** «perfil base v3.0.0-…»: siempre el del snapshot. */
  profileLabel: string
  /** Versión de las reglas de la evaluación de Misión; null en Explorar. */
  rulesVersion: string | null
  profileStatus: string
  input: BuildMetricViewsInput
  figures: SiteFigures
  /** site_ids en el orden vigente (candidatos y luego REF; en Misión, el de la evaluación). */
  order: readonly string[]
  /** Explorar: puesto global (REF: null). Misión: puesto de la evaluación (solo priorizados). */
  rank: number | null
  /** Candidatos con puesto en Explorar (el «de 6»; nunca cuenta la REF). */
  rankedCount: number
  role: 'candidate' | 'reference'
  country: CountryCode | null
  mission: MissionLayer | null
  /** minimum_valid_weight del perfil base (0–1). */
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

/** Reparte los resultados de requisitos de una opción entre criterios, sitio y no medidos. */
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
  // Imprescindibles primero dentro de cada criterio (mismo orden que las líneas Tesla).
  for (const list of byCriterion.values()) list.sort((a, b) => Number(b.importance === 'critical') - Number(a.importance === 'critical'))
  return { byCriterion, siteRows, unmeasured }
}

/** Función pura: perfil (siempre el del snapshot), entrada de buildMetricViews, cifras y capa de Misión. */
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
    profileLabel: `perfil base v${profile.version}`,
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

/** Contexto del lugar (se recalcula solo si cambia algo que lo afecta). */
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
