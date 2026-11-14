/**
 * Paquete de evidencia `evidence-packet/1` (docs/UX_REDESIGN.md §5.3) y capa de hechos.
 *
 * Es la ÚNICA fuente de la que la IA puede citar: cada cifra ya viene formateada (es-CL) por el
 * motor o el snapshot, y la IA solo puede referirse a ella con `{{id}}`. La misma función arma la
 * capa de hechos que la UI muestra al instante, sin red y sin IA, con los mismos textos: lo que
 * se ve en una ficha es exactamente lo que la IA puede citar.
 *
 * Fuentes de cada cifra:
 *  - por criterio (valor, similitud, Jezero, dirección, limitante, satura, valor compartido):
 *    `buildMetricViews` de features/metrics;
 *  - % del lugar, confianza y cobertura: el snapshot (perfil base) o `scoreMission` del motor
 *    (perfil de misión);
 *  - estabilidad: el snapshot (perfil base) o `sensitivity` del motor (perfil de misión);
 *  - robustez del orden: `summarizeRobustness` sobre `sensitivity` del motor.
 * Función pura: sin stores ni red.
 */
import type { EvidenceFactKind, EvidencePacket, UnsupportedRequest } from '../../domain/aiContracts'
import { CRITERION_IDS, isCriterionId, type CandidateSite, type CriterionId, type MissionProfile } from '../../domain/contracts'
import { criterionLabels, feasibilityLabels, formatRatio, formatScore, formatWhole, shortCandidateName } from '../../domain/formatting'
import { rankCandidates } from '../../domain/scoring'
import type { MissionScoring } from '../engine'
import type { MetricView } from '../metrics'
import { packetHash } from './fnv'
import { PERTURBATION, type RobustnessSummary } from './robustness'
import type { ComparisonFacts, CriterionFact, DirectionFact, FactRef, FactsLayer, RobustnessFacts, SiteFacts } from './types'

export const FACT_TEXT_MAX = 80
export const CHECK_TEXT_MAX = 400
export const MAX_SITES = 12
export const MAX_FACT_KINDS = 64
export const MAX_UNSUPPORTED = 8

const SITE_ID = /^cl-[a-z0-9-]+$/
const SNAPSHOT_ID = /^[a-z0-9.-]+$/
const PLAIN = /^[^0-9%]*$/

type TopographicId = 'slope' | 'terrain_roughness' | 'local_relief'

/** Frase de dirección respecto de Jezero, por criterio topográfico (sin cifras). */
export const DIRECTION_PHRASE: Readonly<Record<TopographicId, Readonly<Record<DirectionFact['direction'], string>>>> = {
  slope: { more_demanding: 'más inclinado que Jezero', less_demanding: 'menos inclinado que Jezero', similar: 'inclinación similar a Jezero' },
  terrain_roughness: { more_demanding: 'más rugoso que Jezero', less_demanding: 'menos rugoso que Jezero', similar: 'rugosidad similar a Jezero' },
  local_relief: { more_demanding: 'más relieve que Jezero', less_demanding: 'menos relieve que Jezero', similar: 'relieve similar a Jezero' },
}

function isTopographic(id: CriterionId): id is TopographicId {
  return id === 'slope' || id === 'terrain_roughness' || id === 'local_relief'
}

export interface EvidenceProfile {
  id: string
  origin: 'snapshot' | 'preset' | 'mission'
  status: 'needs_calibration' | 'validated'
  weights: Readonly<Partial<Record<CriterionId, number>>>
}

export interface EvidenceInput {
  /** `manifest.snapshot_version` (p. ej. «science-screening-v2»). */
  snapshotVersion: string
  /** Perfil base del snapshot (criterios, pesos base y agregación). */
  base: MissionProfile
  candidates: readonly CandidateSite[]
  profile: EvidenceProfile
  missionSummary: string | null
  /** % del motor con el perfil de misión; null = perfil base (cifras del snapshot). */
  scoring: MissionScoring | null
  /** Vistas de `buildMetricViews` por site_id (con los pesos y contribuciones del perfil activo). */
  views: ReadonlyMap<string, readonly MetricView[]>
  /** Resumen de `sensitivity`; null = motor no disponible (robustez «por calcular»). */
  robustness: RobustnessSummary | null
  robustnessReason?: string | null
  unsupported: readonly UnsupportedRequest[]
}

export interface EvidenceResult {
  packet: EvidencePacket
  facts: FactsLayer
}

/** Nombre corto del lugar, sin el sufijo «— sector …». */
export function siteLabel(name: string): string {
  return shortCandidateName(name).split(' — ')[0]?.trim() || name
}

function pct(value: number): string {
  return `${formatWhole(value)} %`
}

function ordered(input: EvidenceInput): CandidateSite[] {
  const byId = new Map(input.candidates.map((candidate) => [candidate.site_id, candidate]))
  const sequence = input.scoring
    ? input.scoring.sites.map((site) => byId.get(site.siteId)).filter((site): site is CandidateSite => site !== undefined)
    : rankCandidates(input.candidates)
  return sequence.filter((site) => SITE_ID.test(site.site_id)).slice(0, MAX_SITES)
}

class FactBook {
  readonly facts: Record<string, string> = {}

  /** Registra un hecho si su texto cabe en el contrato; devuelve la referencia o null. */
  add(id: string, text: string | null | undefined): FactRef | null {
    if (!text) return null
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > FACT_TEXT_MAX) return null
    this.facts[id] = trimmed
    return { id, text: trimmed }
  }
}

export function buildEvidencePacket(input: EvidenceInput): EvidenceResult {
  const book = new FactBook()
  const sites = ordered(input)
  const siteIds = sites.map((site) => site.site_id)
  const weightOf = (id: string): number => (isCriterionId(id) ? (input.profile.weights[id] ?? 0) : 0)
  const scored = new Map((input.scoring?.sites ?? []).map((site) => [site.siteId, site]))
  const labels = new Map<CriterionId, string>()
  for (const views of input.views.values()) for (const view of views) labels.set(view.criterionId, view.label)
  const labelOf = (id: CriterionId): string => labels.get(id) ?? criterionLabels[id] ?? id
  const viewOf = (siteId: string, id: CriterionId): MetricView | undefined => input.views.get(siteId)?.find((view) => view.criterionId === id)
  const robustnessBySite = new Map((input.robustness?.sites ?? []).map((row) => [row.siteId, row]))

  // ---- Hechos de Marte (una sola vez) -----------------------------------------------------
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

  // ---- Por lugar ---------------------------------------------------------------------------
  const kinds: EvidenceFactKind[] = []
  const similarityOf = (site: CandidateSite): number | null => (input.scoring ? (scored.get(site.site_id)?.similarity ?? null) : site.similarity)
  const rankedCount = sites.filter((site) => similarityOf(site) !== null).length
  let position = 0
  const siteFacts: SiteFacts[] = sites.map((site) => {
    const id = site.site_id
    const motor = scored.get(id)
    const similarity = similarityOf(site)
    const porCalcular = input.scoring !== null && (motor === undefined || motor.status === 'por_calcular')
    const insufficient = similarity === null
    const similarityText = similarity !== null ? `${formatScore(similarity)} %` : porCalcular ? 'por calcular' : 'datos insuficientes'
    const rank = similarity !== null ? book.add(`site:${id}:rank`, `#${(position += 1)} de ${rankedCount}`) : null
    const confidenceValue = input.scoring ? (motor?.confidence ?? null) : site.confidence
    const stabilityValue = input.scoring ? (robustnessBySite.get(id)?.stability ?? null) : site.stability
    const coverageValue = input.scoring
      ? porCalcular ? null : (motor?.coverage ?? null)
      : (() => {
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
      const sim = view.similarity !== null ? book.add(`site:${id}:${criterionId}:sim`, pct(view.similarity)) : null
      const marsText = book.facts[`mars:${criterionId}`]
      return { criterionId, label: view.label, raw, mars: marsText ? { id: `mars:${criterionId}`, text: marsText } : null, sim }
    }

    for (const criterionId of CRITERION_IDS) {
      if (weightOf(criterionId) <= 0) continue
      const view = viewOf(id, criterionId)
      if (!view) continue
      const fact = criterionFact(criterionId, view)
      if (view.isLimiting && view.status === 'valid') {
        limiting = fact
        kinds.push({ kind: 'limiting_factor', site_id: id, criterion_id: criterionId })
      }
      if (isTopographic(criterionId) && view.vsMars && view.marsValue && view.status === 'valid') {
        const ratio = book.add(`site:${id}:${criterionId}:ratio`, `${formatRatio(view.vsMars.ratio)}× Jezero`)
        const phrase = book.add(`site:${id}:${criterionId}:vs_mars`, DIRECTION_PHRASE[criterionId][view.vsMars.direction])
        if (ratio && phrase) {
          directions.push({ criterionId, label: view.label, direction: view.vsMars.direction, ratio, phrase, raw: fact.raw, mars: fact.mars })
          kinds.push({ kind: 'direction_vs_mars', site_id: id, criterion_id: criterionId, direction: view.vsMars.direction })
        }
      }
      if (view.saturates && view.status === 'valid') {
        saturates.push(fact)
        kinds.push({ kind: 'saturates_rule', site_id: id, criterion_id: criterionId })
      }
    }

    const missing = site.score_breakdown
      .filter((item) => item.status !== 'valid' && isCriterionId(item.criterion_id) && weightOf(item.criterion_id) > 0)
      .map((item) => ({
        criterionId: item.criterion_id as CriterionId,
        label: labelOf(item.criterion_id as CriterionId),
        status: item.status === 'needs_calibration' ? 'por calcular' : item.status === 'excluded' ? 'excluido' : 'sin dato',
      }))

    return {
      siteId: id,
      name: siteLabel(site.name),
      rank,
      similarity: book.add(`site:${id}:similarity`, similarityText),
      insufficient,
      confidence: confidenceValue !== null ? book.add(`site:${id}:confidence`, formatScore(confidenceValue)) : null,
      stability: stabilityValue !== null ? book.add(`site:${id}:stability`, formatScore(stabilityValue)) : null,
      feasibility: book.add(`site:${id}:feasibility`, feasibilityLabels[site.feasibility]),
      coverage: coverageValue !== null && Number.isFinite(coverageValue) ? book.add(`coverage:${id}`, `${formatWhole(coverageValue * 100)} % del peso`) : null,
      directions,
      limiting,
      saturates,
      missing,
      checks: site.field_checks.slice(0, 99).map((text, index) => {
        const trimmed = text.trim()
        return { ref: `check:${id}:${index + 1}`, text: trimmed.length > CHECK_TEXT_MAX ? `${trimmed.slice(0, CHECK_TEXT_MAX - 1)}…` : trimmed }
      }).filter((check) => check.text.length > 0),
    }
  })

  // ---- Comparativa ---------------------------------------------------------------------------
  const comparison = compare(sites, book, kinds, viewOf, weightOf)

  // ---- Brechas del orden -------------------------------------------------------------------
  const rankedScores = sites.map(similarityOf).filter((value): value is number => value !== null)
  const gaps: FactRef[] = []
  for (let index = 0; index + 1 < rankedScores.length; index += 1) {
    const a = rankedScores[index] as number
    const b = rankedScores[index + 1] as number
    const gap = book.add(`rank:gap:${index + 1}:${index + 2}`, `${formatScore(a - b)} puntos`)
    if (gap) gaps.push(gap)
  }

  // ---- Robustez ----------------------------------------------------------------------------
  const robustness = robustnessFacts(input, siteFacts, sites, book, labelOf)

  const unsupported = input.unsupported
    .filter((item) => item.phrase.trim().length > 0 && item.phrase.length <= 120 && PLAIN.test(item.phrase))
    .slice(0, MAX_UNSUPPORTED)
    .map((item) => ({ phrase: item.phrase, reason: item.reason }))
  const missionSummary = input.missionSummary && input.missionSummary.length <= 280 && PLAIN.test(input.missionSummary) ? input.missionSummary : null

  const checks: Record<string, string> = {}
  for (const site of siteFacts) for (const check of site.checks) checks[check.ref] = check.text

  const weights: Partial<Record<CriterionId, number>> = {}
  for (const id of CRITERION_IDS) {
    const weight = input.profile.weights[id]
    if (typeof weight === 'number' && Number.isFinite(weight)) weights[id] = Math.min(1, Math.max(0, weight))
  }

  const body: Omit<EvidencePacket, 'packet_hash'> = {
    schema: 'evidence-packet/1',
    snapshot: SNAPSHOT_ID.test(input.snapshotVersion) ? input.snapshotVersion : 'snapshot-desconocido',
    profile: { id: input.profile.id, origin: input.profile.origin, status: input.profile.status, weights },
    mission_summary: missionSummary,
    sites: siteIds,
    facts: book.facts,
    fact_kinds: kinds.slice(0, MAX_FACT_KINDS),
    checks,
    unsupported,
  }
  const packet: EvidencePacket = { ...body, packet_hash: packetHash(body as unknown as Record<string, unknown>) }

  return {
    packet,
    facts: {
      sites: siteFacts,
      comparison: { ...comparison, gaps },
      robustness,
      unsupported,
      missionSummary,
    },
  }
}

function compare(
  sites: readonly CandidateSite[],
  book: FactBook,
  kinds: EvidenceFactKind[],
  viewOf: (siteId: string, id: CriterionId) => MetricView | undefined,
  weightOf: (id: string) => number,
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
    const label = rows[0]?.view.label ?? criterionLabels[criterionId] ?? criterionId

    // Se compara lo que se muestra: la similitud por criterio en entero.
    const rounded = rows.map((row) => Math.round(row.similarity))
    if (rows.length >= 2 && rows.length === sites.length && rounded.every((value) => value === rounded[0])) {
      // «No distingue»: todos los lugares válidos con la misma similitud mostrada.
      kinds.push({ kind: 'no_discrimination', criterion_id: criterionId })
      noDiscrimination.push({ criterionId, label, sims: rows.flatMap((row) => simRef(row.siteId, criterionId) ?? []) })
    } else if (rows.length >= 2) {
      // «Mejor de N»: solo si el primero supera al segundo también en el entero mostrado.
      const [first, second] = [...rows].sort((a, b) => b.similarity - a.similarity)
      if (first && second && Math.round(first.similarity) > Math.round(second.similarity)) {
        kinds.push({ kind: 'best_of_n', site_id: first.siteId, criterion_id: criterionId })
        bestOfN.push({ criterionId, label, siteId: first.siteId, sim: simRef(first.siteId, criterionId) })
      }
    }

    // Valor regional compartido (p. ej. aridez POWER), según buildMetricViews.
    for (const row of rows) {
      const group = [row.siteId, ...row.view.sharedRegionalWith].filter((siteId) => ids.has(siteId))
      const unique = [...new Set(group)].sort()
      if (unique.length < 2) continue
      const key = `${criterionId}|${unique.join(',')}`
      if (seenShared.has(key)) continue
      seenShared.add(key)
      kinds.push({ kind: 'shared_regional_value', criterion_id: criterionId, site_ids: unique })
      const rawId = `site:${unique[0]}:${criterionId}:raw`
      const text = book.facts[rawId]
      shared.push({ criterionId, label, siteIds: unique, raw: text ? { id: rawId, text } : null })
    }
  }
  return { noDiscrimination, bestOfN, shared }
}

function robustnessFacts(
  input: EvidenceInput,
  siteFacts: readonly SiteFacts[],
  sites: readonly CandidateSite[],
  book: FactBook,
  labelOf: (id: CriterionId) => string,
): RobustnessFacts {
  const summary = input.robustness
  const bySite = new Map((summary?.sites ?? []).map((row) => [row.siteId, row]))
  const bars = sites.map((site, index) => {
    const stability = input.scoring ? (bySite.get(site.site_id)?.stability ?? null) : site.stability
    return { siteId: site.site_id, name: siteFacts[index]?.name ?? siteLabel(site.name), stability, text: stability === null ? null : formatScore(stability) }
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
      reason: input.robustnessReason ?? 'Robustez del orden por calcular: el motor de misión no está disponible.',
    }
  }
  const mostSensitive = summary.mostSensitive ? book.add('sens:most_sensitive', labelOf(summary.mostSensitive)) : null
  if (summary.status === 'insufficient') {
    return { status: 'insufficient', perturbation: null, scenarios: null, flips: null, topFlips: null, mostSensitive, sites: bars, reason: 'Menos de dos lugares con %: no hay orden que comparar.' }
  }
  const total = summary.scenarios
  return {
    status: 'ready',
    perturbation: book.add('sens:perturbation', `±${formatWhole(PERTURBATION * 100)} % por peso`),
    scenarios: book.add('sens:scenarios', `${total} escenarios`),
    flips: book.add('sens:flips', summary.flips === 0 ? 'ningún escenario cambia el orden' : `${summary.flips} de ${total} escenarios cambian el orden`),
    topFlips: book.add('sens:top_flips', summary.topFlips === 0 ? 'ningún escenario cambia el primer lugar' : `${summary.topFlips} de ${total} escenarios cambian el primer lugar`),
    mostSensitive,
    sites: bars,
    reason: null,
  }
}
