/**
 * Puntuación de los sectores con un perfil de misión (ADR-009). Solo usa del snapshot
 * `normalized_similarity`, `quality` y `status` por criterio: no recalcula similitudes por
 * criterio ni rangos planetarios. El orden lo pone `rankCandidates`, igual que en Explorar.
 */
import { CRITERION_IDS, isCriterionId, type CandidateSite, type CriterionId, type MissionProfile } from '../../domain/contracts'
import { rankCandidates } from '../../domain/scoring'
import { aggregate } from './aggregate'
import { pyRound, pySum } from './pyMath'
import type {
  AggregateCriterion,
  AggregateInput,
  MissionInputs,
  MissionProfileDraft,
  MissionScoring,
  ScoredSite,
  ScoreMissionInput,
} from './types'
import { ENGINE_VERSION } from './version'

/** ¿El perfil base trae lo mínimo para agregar? (validación en el límite: nunca se inventa). */
export function isUsableBase(base: unknown): base is MissionProfile {
  if (typeof base !== 'object' || base === null) return false
  const candidate = base as Partial<MissionProfile>
  const aggregation = candidate.aggregation
  return (
    typeof candidate.id === 'string' &&
    Array.isArray(candidate.criteria) &&
    candidate.criteria.length > 0 &&
    candidate.criteria.every((criterion) => typeof criterion?.id === 'string' && typeof criterion.unit === 'string') &&
    typeof aggregation === 'object' &&
    aggregation !== null &&
    Number.isFinite(aggregation.epsilon) &&
    Number.isFinite(aggregation.minimum_valid_weight)
  )
}

function weightOf(profile: MissionProfileDraft, id: string): number {
  return isCriterionId(id) ? (profile.weights[id] ?? 0) : 0
}

/**
 * Insumos exactos de `aggregate`/`sensitivity` para un sector con el perfil de misión. Un
 * criterio en Excluir (peso 0) entra como `excluded`: no aporta similitud, calidad ni limitante.
 * `features/analysis` debe usar esta función para que su robustez coincida con el %.
 */
export function buildMissionInputs({
  profile,
  candidate,
  base,
}: {
  profile: MissionProfileDraft
  candidate: CandidateSite
  base: MissionProfile
}): MissionInputs {
  const criteria: AggregateCriterion[] = base.criteria.map((criterion) => ({
    id: criterion.id,
    weight: weightOf(profile, criterion.id),
    unit: criterion.unit,
  }))
  const inputs: Record<string, AggregateInput> = {}
  for (const item of candidate.score_breakdown ?? []) {
    inputs[item.criterion_id] = {
      similarity: item.normalized_similarity,
      quality: item.quality,
      status: weightOf(profile, item.criterion_id) === 0 ? 'excluded' : item.status,
    }
  }
  return {
    criteria,
    inputs,
    epsilon: base.aggregation.epsilon,
    minimumValidWeight: base.aggregation.minimum_valid_weight,
  }
}

/** Criterio con la contribución más negativa; empate → el primero en el orden del perfil base. */
export function limitingCriterion(
  contributions: Readonly<Record<string, number | null>>,
  order: readonly string[],
): CriterionId | null {
  let best: CriterionId | null = null
  let bestValue = 0
  for (const id of order) {
    const value = contributions[id]
    if (value === null || value === undefined || !isCriterionId(id)) continue
    if (value < bestValue) {
      best = id
      bestValue = value
    }
  }
  return best
}

function porCalcular(
  profile: MissionProfileDraft,
  candidates: readonly CandidateSite[],
  reason: NonNullable<MissionScoring['reason']>,
  minimumValidWeight?: number,
): MissionScoring {
  const sites: ScoredSite[] = rankCandidates(candidates.map((candidate) => ({ ...candidate, similarity: null }))).map((candidate) => ({
    siteId: candidate.site_id,
    similarity: null,
    rank: null,
    status: 'por_calcular',
    coverage: 0,
    confidence: null,
    contributions: {},
    limitingCriterionId: null,
  }))
  return {
    profileId: profile.id,
    engineVersion: ENGINE_VERSION,
    sites,
    reason,
    ...(minimumValidWeight === undefined ? {} : { minimumValidWeight }),
  }
}

/**
 * Puntúa todos los sectores con un perfil de misión y los ordena con `rankCandidates`.
 * Nunca inventa: sin perfil base utilizable, con otro perfil base o con todos los niveles en
 * Excluir, cada sector queda «por calcular» y `reason` explica por qué.
 */
export function scoreMission({ profile, candidates, base }: ScoreMissionInput): MissionScoring {
  if (!isUsableBase(base)) return porCalcular(profile, candidates, 'base_unavailable')
  const minimumValidWeight = base.aggregation.minimum_valid_weight
  if (profile.baseProfileId !== base.id) return porCalcular(profile, candidates, 'base_mismatch', minimumValidWeight)
  const totalWeight = pySum(CRITERION_IDS.map((id) => profile.weights[id] ?? 0))
  if (!(totalWeight > 0)) return porCalcular(profile, candidates, 'empty_profile', minimumValidWeight)

  const order = base.criteria.map((criterion) => criterion.id)
  const scoredByCopy = new Map<CandidateSite, Omit<ScoredSite, 'rank'>>()
  const copies = candidates.map((candidate) => {
    const { criteria, inputs, epsilon } = buildMissionInputs({ profile, candidate, base })
    const result = aggregate(criteria, inputs, epsilon, minimumValidWeight)
    const contributions: Partial<Record<CriterionId, number | null>> = {}
    for (const criterion of criteria) {
      if (isCriterionId(criterion.id)) contributions[criterion.id] = result.contributions[criterion.id] ?? null
    }
    const copy: CandidateSite = { ...candidate, similarity: result.similarity }
    scoredByCopy.set(copy, {
      siteId: candidate.site_id,
      similarity: result.similarity,
      status: result.similarity === null ? 'insufficient_data' : 'scored',
      coverage: pyRound(Math.min(1, result.validWeight / totalWeight), 6),
      confidence: result.confidence,
      contributions,
      limitingCriterionId: limitingCriterion(result.contributions, order),
    })
    return copy
  })

  let position = 0
  const sites = rankCandidates(copies).map((copy): ScoredSite => {
    const scored = scoredByCopy.get(copy)
    if (!scored) throw new Error(`scoreMission: sector perdido al ordenar (${copy.site_id})`)
    return { ...scored, rank: scored.similarity === null ? null : (position += 1) }
  })
  return { profileId: profile.id, engineVersion: ENGINE_VERSION, sites, minimumValidWeight }
}
