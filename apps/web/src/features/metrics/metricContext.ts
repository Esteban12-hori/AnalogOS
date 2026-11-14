/**
 * Qué perfil está activo para el riel y con qué cifras del lugar (función pura + hook).
 *
 *  - Explorar, o Misión sin resultados del motor → perfil base del snapshot: pesos y
 *    contribuciones del pipeline; similitud, confianza y estabilidad del snapshot.
 *  - Misión con resultados (scoring del mismo perfil que state/mission.profile) → pesos del
 *    perfil de misión y contribuciones del motor TS. Lo que el motor no entrega (estabilidad,
 *    y la confianza si viene null) queda «por calcular con tu perfil»: nunca se toma del perfil
 *    base para mezclarlo con un % de misión.
 *  - La factibilidad no depende del perfil: siempre es la del snapshot.
 */
import { useMemo } from 'react'
import type { CandidateSite, CriterionId, MissionProfile } from '../../domain/contracts'
import type { MarsReference } from '../../domain/marsReference'
import { rankCandidates, validWeight } from '../../domain/scoring'
import type { MissionProfileDraft, MissionScoring, ScoredSite } from '../engine'
import type { AppData } from '../../shell/public'
import { useMission } from '../../state/mission'
import { useUi, type UiMode } from '../../state/ui'
import type { BuildMetricViewsInput } from './index'

export interface SiteFigures {
  /** 0–100; null = datos insuficientes o por calcular (ver `similarityState`). */
  similarity: number | null
  similarityState: 'scored' | 'insufficient' | 'pending'
  /** 0–100; null = por calcular con tu perfil. */
  confidence: number | null
  /** 0–100; null = sin calcular (base) o por calcular con tu perfil (misión). */
  stability: number | null
  feasibility: CandidateSite['feasibility']
  /** Fracción del peso del perfil con datos válidos (0–1); null si no se conoce. */
  coverage: number | null
  /** Criterios con dato válido / criterios del desglose. */
  validCount: number
  criterionCount: number
}

export interface MetricContext {
  kind: 'base' | 'mission'
  /** «perfil base v2.0.1-preliminary» o el rótulo del perfil de misión. */
  profileLabel: string
  /** Versión del motor que rotula los % de misión; null con el perfil base. */
  engineVersion: string | null
  /** Estado del perfil activo (un perfil de misión siempre es needs_calibration). */
  profileStatus: string
  input: BuildMetricViewsInput
  figures: SiteFigures
  /** site_ids en el orden vigente (rankCandidates o el del motor). */
  order: readonly string[]
  /** Posición 1..n del lugar; null si no tiene orden (datos insuficientes o por calcular). */
  rank: number | null
  /** minimum_valid_weight del perfil base (0–1). */
  minimumValidWeight: number
}

export interface ResolveMetricContextArgs {
  site: CandidateSite
  candidates: readonly CandidateSite[]
  profile: MissionProfile
  marsReference: MarsReference | null
  mode: UiMode
  missionProfile: MissionProfileDraft | null
  scoring: MissionScoring | null
}

function baseOrder(candidates: readonly CandidateSite[]): string[] {
  return rankCandidates(candidates).map((candidate) => candidate.site_id)
}

/** Función pura: perfil activo, entrada de buildMetricViews y cifras del lugar. */
export function resolveMetricContext(args: ResolveMetricContextArgs): MetricContext {
  const { site, candidates, profile, marsReference, mode, missionProfile, scoring } = args
  const sites = candidates.some((candidate) => candidate.site_id === site.site_id) ? candidates : [...candidates, site]
  const breakdown = site.score_breakdown
  const validCount = breakdown.filter((item) => item.status === 'valid').length
  const common = {
    feasibility: site.feasibility,
    validCount,
    criterionCount: breakdown.length,
  }

  const mission = mode === 'mision' && missionProfile !== null && scoring !== null && scoring.profileId === missionProfile.id
  if (mission) {
    const scored: ScoredSite | null = scoring.sites.find((item) => item.siteId === site.site_id) ?? null
    const weights: Partial<Record<CriterionId, number>> = { ...missionProfile.weights }
    const order = scoring.sites.map((item) => item.siteId)
    return {
      kind: 'mission',
      profileLabel: missionProfile.label,
      engineVersion: scoring.engineVersion,
      profileStatus: missionProfile.status,
      // Contribuciones SIEMPRE del motor (vacías si aún no las hay): las del snapshot se
      // calcularon con otros pesos y darían un limitante falso.
      input: { site, sites, profile, weights, contributions: scored?.contributions ?? {}, marsReference },
      figures: {
        ...common,
        similarity: scored?.similarity ?? null,
        similarityState: scored === null || scored.status === 'por_calcular' ? 'pending' : scored.similarity === null ? 'insufficient' : 'scored',
        confidence: scored?.confidence ?? null,
        stability: null,
        coverage: scored ? scored.coverage : null,
      },
      order,
      rank: scored?.rank ?? null,
      minimumValidWeight: profile.aggregation.minimum_valid_weight,
    }
  }

  const order = baseOrder(sites)
  const totalWeight = profile.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)
  return {
    kind: 'base',
    profileLabel: `perfil base v${profile.version}`,
    engineVersion: null,
    profileStatus: profile.status,
    input: { site, sites, profile, weights: null, contributions: null, marsReference },
    figures: {
      ...common,
      similarity: site.similarity,
      similarityState: site.similarity === null ? 'insufficient' : 'scored',
      confidence: site.confidence,
      stability: site.stability,
      coverage: totalWeight > 0 ? validWeight(breakdown) / totalWeight : null,
    },
    order,
    rank: site.similarity === null ? null : order.indexOf(site.site_id) + 1,
    minimumValidWeight: profile.aggregation.minimum_valid_weight,
  }
}

/** Contexto del lugar con el perfil activo (se recalcula solo si cambia algo que lo afecta). */
export function useMetricContext(data: AppData, site: CandidateSite | null): MetricContext | null {
  const mode = useUi((state) => state.mode)
  const missionProfile = useMission((state) => state.profile)
  const scoring = useMission((state) => state.scoring)
  const snapshot = data.snapshot
  return useMemo(() => {
    if (!site || !snapshot) return null
    return resolveMetricContext({
      site,
      candidates: snapshot.candidates,
      profile: snapshot.profile,
      marsReference: snapshot.marsReference,
      mode,
      missionProfile,
      scoring,
    })
  }, [site, snapshot, mode, missionProfile, scoring])
}
