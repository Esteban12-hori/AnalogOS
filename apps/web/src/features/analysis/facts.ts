/**
 * Capa de hechos del snapshot (docs/INTEGRATION_PLAN.md §2.3 y §5.2, capa 3). Hechos
 * deterministas que no tienen equivalente en el planificador del equipo: dirección frente a
 * Jezero, factor limitante, criterio que satura, valor regional compartido, criterio sin
 * discriminación, mejor de N, datos faltantes, verificaciones y robustez del orden.
 *
 * Toda cifra ya viene formateada (es-CL) por `buildMetricViews` o por el snapshot; aquí no se
 * calcula nada nuevo. Sin paquete de evidencia ni huella (se retiraron con lktron, ADR-012): la IA
 * del equipo solo selecciona IDs de `MissionEvaluation` (ADR-009).
 *
 * Roles (ADR-008): los candidatos de la búsqueda llevan su puesto global; la referencia conocida
 * (REF) va aparte y nunca entra en «mejor de N», en las brechas del orden ni en la robustez.
 * Acepta sitios de Chile y de Argentina. Función pura: sin stores ni red.
 */
import type { CandidateSite, CriterionId, MissionProfile } from '../../domain/contracts'
import { CRITERION_IDS, isCriterionId } from '../../domain/criteria'
import { rankMap, splitByRole } from '../../domain/discovery'
import { criterionLabels, feasibilityLabels, formatRatio, formatScore, formatWhole, shortCandidateName } from '../../domain/formatting'
import type { MetricView } from '../metrics'
import { PERTURBATION, type RobustnessSummary } from './robustness'
import type { ComparisonFacts, CriterionFact, DirectionFact, FactRef, FactsLayer, RobustnessFacts, SiteFacts } from './types'

export const FACT_TEXT_MAX = 80
export const CHECK_TEXT_MAX = 400
export const MAX_SITES = 12

/** Sitios del piloto: Chile o Argentina (mismo patrón que el contrato v3). */
const SITE_ID = /^(cl|ar)-[a-z0-9-]+$/

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

export interface FactsInput {
  /** Perfil base del snapshot (criterios, pesos y agregación): los pesos del pipeline. */
  base: MissionProfile
  candidates: readonly CandidateSite[]
  /** Vistas de `buildMetricViews` por site_id (perfil base). */
  views: ReadonlyMap<string, readonly MetricView[]>
  /** Resumen de la sensibilidad del pipeline (analysis-summary.json); null = no disponible. */
  robustness: RobustnessSummary | null
  robustnessReason?: string | null
  /** Solo estos sitios (p. ej. los evaluados en Misión); ausente = todos. */
  onlySiteIds?: readonly string[] | null
}

/** Nombre corto del lugar, sin el sufijo «— sector …». */
export function siteLabel(name: string): string {
  return shortCandidateName(name).split(' — ')[0]?.trim() || name
}

function pct(value: number): string {
  return `${formatWhole(value)} %`
}

/** Candidatos de la búsqueda en su orden global y, aparte, las referencias conocidas. */
function ordered(input: FactsInput): { ranked: CandidateSite[]; references: CandidateSite[] } {
  const keep = (site: CandidateSite) => SITE_ID.test(site.site_id) && (!input.onlySiteIds || input.onlySiteIds.includes(site.site_id))
  const { ranked, references } = splitByRole(input.candidates)
  return { ranked: ranked.filter(keep).slice(0, MAX_SITES), references: references.filter(keep) }
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

export function buildFactsLayer(input: FactsInput): FactsLayer {
  const book = new FactBook()
  const { ranked, references } = ordered(input)
  const sites = [...ranked, ...references]
  const baseWeights = new Map(input.base.criteria.map((criterion) => [criterion.id, criterion.weight]))
  const weightOf = (id: string): number => (isCriterionId(id) ? (baseWeights.get(id) ?? 0) : 0)
  const globalRank = rankMap(splitByRole(input.candidates).ranked)
  const rankedTotal = globalRank.size
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
  const factsOf = (site: CandidateSite): SiteFacts => {
    const id = site.site_id
    const reference = site.role === 'reference'
    const similarity = site.similarity
    const insufficient = similarity === null
    const similarityText = similarity !== null ? `${formatScore(similarity)} %` : 'datos insuficientes'
    const position = globalRank.get(id)
    const rank = reference
      ? book.add(`site:${id}:rank`, 'REF · referencia conocida, fuera del ranking')
      : position !== undefined ? book.add(`site:${id}:rank`, `#${position} de ${rankedTotal}`) : null
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
      const sim = view.similarity !== null ? book.add(`site:${id}:${criterionId}:sim`, pct(view.similarity)) : null
      const marsText = book.facts[`mars:${criterionId}`]
      return { criterionId, label: view.label, raw, mars: marsText ? { id: `mars:${criterionId}`, text: marsText } : null, sim }
    }

    for (const criterionId of CRITERION_IDS) {
      if (weightOf(criterionId) <= 0) continue
      const view = viewOf(id, criterionId)
      if (!view) continue
      const fact = criterionFact(criterionId, view)
      if (view.isLimiting && view.status === 'valid') limiting = fact
      if (isTopographic(criterionId) && view.vsMars && view.marsValue && view.status === 'valid') {
        const ratio = book.add(`site:${id}:${criterionId}:ratio`, `${formatRatio(view.vsMars.ratio)}× Jezero`)
        const phrase = book.add(`site:${id}:${criterionId}:vs_mars`, DIRECTION_PHRASE[criterionId][view.vsMars.direction])
        if (ratio && phrase) directions.push({ criterionId, label: view.label, direction: view.vsMars.direction, ratio, phrase, raw: fact.raw, mars: fact.mars })
      }
      if (view.saturates && view.status === 'valid') saturates.push(fact)
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
      reference,
      country: site.country ?? null,
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
  }
  const siteFacts = ranked.map(factsOf)
  const referenceFacts = references.map(factsOf)

  // ---- Comparativa: solo candidatos (la REF no compite en «mejor de N») ---------------------
  const comparison = compare(ranked, book, viewOf, weightOf)

  // ---- Brechas del orden (candidatos) ------------------------------------------------------
  const rankedScores = ranked.map((site) => site.similarity).filter((value): value is number => value !== null)
  const gaps: FactRef[] = []
  for (let index = 0; index + 1 < rankedScores.length; index += 1) {
    const a = rankedScores[index] as number
    const b = rankedScores[index + 1] as number
    const gap = book.add(`rank:gap:${index + 1}:${index + 2}`, `${formatScore(a - b)} puntos`)
    if (gap) gaps.push(gap)
  }

  // ---- Robustez (sensibilidad del pipeline sobre los candidatos) ----------------------------
  const robustness = robustnessFacts(input, siteFacts, ranked, book, labelOf)

  return { sites: siteFacts, references: referenceFacts, comparison: { ...comparison, gaps }, robustness }
}

function compare(
  sites: readonly CandidateSite[],
  book: FactBook,
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
      noDiscrimination.push({ criterionId, label, sims: rows.flatMap((row) => simRef(row.siteId, criterionId) ?? []) })
    } else if (rows.length >= 2) {
      // «Mejor de N»: solo si el primero supera al segundo también en el entero mostrado.
      const [first, second] = [...rows].sort((a, b) => b.similarity - a.similarity)
      if (first && second && Math.round(first.similarity) > Math.round(second.similarity)) {
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
): RobustnessFacts {
  const summary = input.robustness
  const bySite = new Map((summary?.sites ?? []).map((row) => [row.siteId, row]))
  const bars = sites.map((site, index) => {
    const stability = site.stability ?? bySite.get(site.site_id)?.stability ?? null
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
      reason: input.robustnessReason ?? 'Robustez del orden no disponible: el snapshot no trae la sensibilidad del pipeline.',
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
