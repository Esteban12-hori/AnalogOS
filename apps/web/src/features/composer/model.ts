/**
 * Modelo puro de la misión en el cliente (sin stores ni React). Lo usan el orquestador y la
 * tarjeta «Tu misión», ambos en el chunk diferido de misión.
 *
 * Nada aquí inventa cifras: los % y el orden vienen de `MissionScoring` (motor determinista),
 * los pesos de `MissionProfileDraft.weights` (nivel ÷ suma de niveles) y las similitudes base
 * del snapshot (pipeline).
 */
import type { CriterionLevel, MissionInterpretRequest, MissionInterpretation } from '../../domain/aiContracts'
import { CRITERION_IDS, isCriterionId, type CandidateSite, type CriterionId, type MissionProfile } from '../../domain/contracts'
import { criterionLabels, formatScore, formatWhole, shortCandidateName } from '../../domain/formatting'
import { rankCandidates } from '../../domain/scoring'
import type { MissionProfileDraft, MissionScoring } from '../engine'
import type { MissionError, MissionSource } from '../../state/mission'
import type { DemoHighlight } from './composerStore'
import type { Levels } from './history'

/** Clave 3 · Importante 2 · Menor 1 · Excluir 0 (§3.2). */
export const LEVEL_LABEL: Readonly<Record<CriterionLevel, string>> = { 3: 'Clave', 2: 'Importante', 1: 'Menor', 0: 'Excluir' }
/** Rótulo corto para el control segmentado del panel de 360 px. */
export const LEVEL_SHORT: Readonly<Record<CriterionLevel, string>> = { 3: 'Clave', 2: 'Imp.', 1: 'Menor', 0: 'Excl.' }
export const LEVELS_DESC: readonly CriterionLevel[] = [3, 2, 1, 0]

/** Procedencia del perfil: la IA y el modo DEMO solo proponen niveles. */
export const SOURCE_LABEL: Readonly<Record<MissionSource, string>> = {
  lktron: 'Interpretación de IA',
  demo: 'DEMO · sin IA',
  preset: 'Perfil predefinido',
}

export type LevelsResult =
  | { ok: true; levels: Levels; mentioned: CriterionId[] }
  | { ok: false; error: MissionError }

/**
 * Niveles de una interpretación ya validada por esquema (§5.2): ids sin repetir y del perfil
 * base; los ausentes valen 0 («no mencionado»). Sin criterios de terreno → «insufficient».
 */
export function interpretationLevels(interpretation: Pick<MissionInterpretation, 'criteria' | 'status'>): LevelsResult {
  const levels = Object.fromEntries(CRITERION_IDS.map((id) => [id, 0])) as Record<CriterionId, CriterionLevel>
  const mentioned: CriterionId[] = []
  for (const criterion of interpretation.criteria) {
    if (!isCriterionId(criterion.id)) {
      return { ok: false, error: { code: 'invalid', message: 'La interpretación nombra un criterio que no existe en el perfil base.' } }
    }
    if (mentioned.includes(criterion.id)) {
      return { ok: false, error: { code: 'invalid', message: 'La interpretación repite un criterio: se descartó por no cumplir el contrato.' } }
    }
    mentioned.push(criterion.id)
    levels[criterion.id] = criterion.level
  }
  if (interpretation.status === 'no_terrain_criteria' || !CRITERION_IDS.some((id) => levels[id] > 0)) {
    return {
      ok: false,
      error: {
        code: 'insufficient',
        message: 'No reconocimos criterios de terreno en el texto. Prueba con pendiente, rugosidad, relieve, suelo expuesto o aridez, o elige un perfil predefinido.',
      },
    }
  }
  return { ok: true, levels, mentioned }
}

/** ¿Algún sector del snapshot trae una similitud válida para el criterio? */
export function criterionHasData(candidates: readonly CandidateSite[], id: CriterionId): boolean {
  return candidates.some((candidate) =>
    candidate.score_breakdown.some((item) => item.criterion_id === id && item.status === 'valid' && item.normalized_similarity !== null),
  )
}

/** Petición mission-interpret-request/1 para lktron (§5.2). `current` se usa al refinar. */
export function buildInterpretRequest(
  text: string,
  snapshot: { candidates: readonly CandidateSite[]; profile: MissionProfile },
  current: Levels | null,
): MissionInterpretRequest {
  const statusOf = (id: CriterionId) => snapshot.profile.criteria.find((criterion) => criterion.id === id)?.status ?? 'missing'
  return {
    text,
    locale: 'es-CL',
    catalog: CRITERION_IDS.map((id) => ({
      id,
      label: criterionLabels[id] ?? id,
      has_data: criterionHasData(snapshot.candidates, id),
      status: statusOf(id),
    })),
    base_profile_id: snapshot.profile.id,
    current_profile: current,
  }
}

/** Nombre corto del lugar («Pampa Yungay», sin «— sector de screening»). */
export function placeName(name: string): string {
  return shortCandidateName(name).split(' — ')[0] ?? name
}

function nameOf(candidates: readonly CandidateSite[], siteId: string): string {
  const candidate = candidates.find((item) => item.site_id === siteId)
  return candidate ? placeName(candidate.name) : siteId
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * El ÚNICO anuncio de resultados (§2.3 D): «3 lugares ordenados para tu misión. Primero:
 * ‹nombre›, ‹%› de similitud». El % y el orden son del motor; nunca de la IA.
 */
export function resultAnnouncement(scoring: MissionScoring, candidates: readonly CandidateSite[]): string {
  const ranked = scoring.sites.filter((site) => site.rank !== null && site.similarity !== null)
  const insufficient = scoring.sites.filter((site) => site.status === 'insufficient_data').length
  const first = ranked[0]
  if (!first || first.similarity === null) {
    return insufficient > 0
      ? `Datos insuficientes para este perfil: ${plural(insufficient, 'lugar queda', 'lugares quedan')} sin %.`
      : 'Perfil listo, pero el motor dejó cada lugar por calcular: no hay % para este perfil.'
  }
  const tail = insufficient > 0 ? ` ${plural(insufficient, 'lugar', 'lugares')} con datos insuficientes.` : ''
  return `${plural(ranked.length, 'lugar ordenado', 'lugares ordenados')} para tu misión. Primero: ${nameOf(candidates, first.siteId)}, ${formatScore(first.similarity)} % de similitud.${tail}`
}

/** Línea corta de resultado bajo el composer. */
export function resultLineText(scoring: MissionScoring, candidates: readonly CandidateSite[]): string {
  const ranked = scoring.sites.filter((site) => site.rank !== null && site.similarity !== null)
  const first = ranked[0]
  if (!first || first.similarity === null) return `Sin % para este perfil · motor ${scoring.engineVersion}`
  return `${plural(ranked.length, 'lugar ordenado', 'lugares ordenados')} por el motor ${scoring.engineVersion} · #1 ${nameOf(candidates, first.siteId)} ${formatScore(first.similarity)} %`
}

/** Anuncio al volver al perfil base: el % y el orden son los del pipeline (snapshot). */
export function baseAnnouncement(candidates: readonly CandidateSite[]): string {
  const first = rankCandidates(candidates)[0]
  if (!first || first.similarity === null) return 'Perfil base del snapshot.'
  return `Perfil base del snapshot. Primero: ${placeName(first.name)}, ${formatScore(first.similarity)} % de similitud.`
}

export function activeCount(levels: Levels): number {
  return CRITERION_IDS.filter((id) => levels[id] > 0).length
}

export interface WeightRow {
  id: CriterionId
  label: string
  /** null = perfil base (sin niveles). */
  level: CriterionLevel | null
  /** 0–1: peso del perfil activo (nivel ÷ suma) o del perfil base. */
  weight: number
  baseWeight: number | null
  /** Respecto del perfil base del snapshot. */
  direction: 'up' | 'down' | 'same' | null
  /** El snapshot no trae datos válidos para el criterio (p. ej. geología por calcular). */
  pending: boolean
  /** Mencionado por la interpretación; false = «no mencionado»; null = no aplica. */
  mentioned: boolean | null
}

function baseWeightOf(base: MissionProfile | null, id: CriterionId): number | null {
  const found = base?.criteria.find((criterion) => criterion.id === id)
  return found ? found.weight : null
}

/** Filas de «Tu misión» en el orden canónico de los 7 criterios. */
export function weightRows(
  profile: MissionProfileDraft | null,
  base: MissionProfile | null,
  candidates: readonly CandidateSite[],
  mentioned: readonly CriterionId[] | null,
): WeightRow[] {
  return CRITERION_IDS.map((id) => {
    const baseWeight = baseWeightOf(base, id)
    const weight = profile ? (profile.weights[id] ?? 0) : (baseWeight ?? 0)
    // Comparación al punto porcentual entero que se muestra: evita flechas por ruido de redondeo.
    const shown = Math.round(weight * 100)
    const shownBase = baseWeight === null ? null : Math.round(baseWeight * 100)
    return {
      id,
      label: criterionLabels[id] ?? id,
      level: profile ? (profile.levels[id] ?? 0) : null,
      weight,
      baseWeight,
      direction: !profile || shownBase === null ? null : shown > shownBase ? 'up' : shown < shownBase ? 'down' : 'same',
      pending: !criterionHasData(candidates, id),
      mentioned: profile && mentioned ? mentioned.includes(id) : null,
    }
  })
}

/** «27 %» (entero: el valor exacto solo en «Método»). */
export function formatWeight(weight: number): string {
  return `${formatWhole(weight * 100)} %`
}

export interface CoverageSummary {
  /** Cobertura mínima y máxima entre los sectores (fracción del peso con datos válidos). */
  min: number
  max: number
  insufficient: number
  minimumValidWeight: number | null
}

export function coverageSummary(scoring: MissionScoring | null, base: MissionProfile | null): CoverageSummary | null {
  if (!scoring || scoring.sites.length === 0) return null
  const scored = scoring.sites.filter((site) => site.status !== 'por_calcular')
  if (scored.length === 0) return null
  const values = scored.map((site) => site.coverage)
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    insufficient: scoring.sites.filter((site) => site.status === 'insufficient_data').length,
    minimumValidWeight: base?.aggregation.minimum_valid_weight ?? null,
  }
}

export interface TextSegment {
  text: string
  criterionId: CriterionId | null
}

/** Parte el texto en tramos resaltados por criterio (modo DEMO); ignora tramos inválidos o solapados. */
export function highlightSegments(text: string, highlights: readonly DemoHighlight[] | null): TextSegment[] {
  if (!highlights || highlights.length === 0) return [{ text, criterionId: null }]
  const sorted = [...highlights]
    .filter((item) => Number.isInteger(item.start) && Number.isInteger(item.end) && item.start >= 0 && item.end <= text.length && item.start < item.end)
    .sort((a, b) => a.start - b.start)
  const out: TextSegment[] = []
  let cursor = 0
  for (const item of sorted) {
    if (item.start < cursor) continue
    if (item.start > cursor) out.push({ text: text.slice(cursor, item.start), criterionId: null })
    out.push({ text: text.slice(item.start, item.end), criterionId: item.criterionId })
    cursor = item.end
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), criterionId: null })
  return out
}

/** Primer sector con posición 1 (el que queda en vista previa). */
export function firstRanked(scoring: MissionScoring | null): string | null {
  return scoring?.sites.find((site) => site.rank === 1)?.siteId ?? null
}
