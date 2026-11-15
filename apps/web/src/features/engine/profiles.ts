/**
 * Niveles → pesos y perfiles de misión (ADR-009, docs/UX_REDESIGN.md §3.2 y §5.2).
 * Clave 3 · Importante 2 · Menor 1 · Excluir 0. El peso es nivel ÷ suma de niveles y lo calcula
 * el cliente: la IA (o el matcher DEMO) solo propone niveles, nunca cifras.
 */
import type { CriterionLevel, MissionInterpretation } from '../../domain/aiContracts'
import type { CriterionId } from '../../domain/contracts'
import { CRITERION_IDS, isCriterionId } from '../../domain/criteria'
import type { MissionPreset, MissionProfileDraft } from './types'

export type Levels = Readonly<Record<CriterionId, CriterionLevel>>
export type BaseProfileRef = { id: string; version: string }

export const LEVEL_LABELS: Readonly<Record<CriterionLevel, string>> = Object.freeze({
  3: 'Clave',
  2: 'Importante',
  1: 'Menor',
  0: 'Excluir',
})

function isLevel(value: unknown): value is CriterionLevel {
  return value === 0 || value === 1 || value === 2 || value === 3
}

/**
 * Niveles completos y validados en el orden canónico. Un criterio ausente vale 0 («no
 * mencionado»); un valor que no es 0–3 lanza (validación en el límite).
 */
export function normalizeLevels(levels: Readonly<Partial<Record<CriterionId, CriterionLevel>>>): Levels {
  const out = {} as Record<CriterionId, CriterionLevel>
  for (const id of CRITERION_IDS) {
    const level: unknown = levels[id] ?? 0
    if (!isLevel(level)) throw new RangeError(`${id}: nivel inválido ${String(level)} (se espera 0, 1, 2 o 3)`)
    out[id] = level
  }
  return Object.freeze(out)
}

/** Nivel ÷ suma de niveles (0 si se excluye). Si todos son 0, todos los pesos son 0. */
export function levelsToWeights(levels: Readonly<Record<CriterionId, CriterionLevel>>): Record<CriterionId, number> {
  const complete = normalizeLevels(levels)
  let total = 0
  for (const id of CRITERION_IDS) total += complete[id]
  const weights = {} as Record<CriterionId, number>
  for (const id of CRITERION_IDS) weights[id] = total > 0 ? complete[id] / total : 0
  return weights
}

/** FNV-1a de 32 bits sobre UTF-16 (estable, sin crypto.subtle: funciona desde file://). */
export function fnv1a32(text: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Forma canónica de un perfil: el mismo perfil base y los mismos niveles dan el mismo id. */
function canonicalLevels(levels: Levels, base: BaseProfileRef): string {
  return `${base.id}@${base.version}|${CRITERION_IDS.map((id) => `${id}=${levels[id]}`).join(',')}`
}

/** Perfil de misión desde niveles, con id `mission:<fnv1a32>` y estado needs_calibration. */
export function profileFromLevels(
  levels: Readonly<Record<CriterionId, CriterionLevel>>,
  base: BaseProfileRef,
  label?: string,
): MissionProfileDraft {
  const complete = normalizeLevels(levels)
  return {
    id: `mission:${fnv1a32(canonicalLevels(complete, base))}`,
    origin: 'mission',
    label: label?.trim() || 'Perfil de misión',
    status: 'needs_calibration',
    levels: complete,
    weights: Object.freeze(levelsToWeights(complete)),
    baseProfileId: base.id,
    baseProfileVersion: base.version,
  }
}

/** Perfil desde un predefinido: conserva el id del preset y queda needs_calibration. */
export function profileFromPreset(preset: MissionPreset, base: BaseProfileRef): MissionProfileDraft {
  const complete = normalizeLevels(preset.levels)
  return {
    id: preset.id,
    origin: 'preset',
    label: preset.label,
    status: 'needs_calibration',
    levels: complete,
    weights: Object.freeze(levelsToWeights(complete)),
    baseProfileId: base.id,
    baseProfileVersion: base.version,
  }
}

/**
 * Niveles de una interpretación ya validada (mission-interpretation/1). Los criterios ausentes
 * valen 0 («no mencionado», editable). Lanza si un id no existe o se repite (§5.2).
 */
export function levelsFromInterpretation(interpretation: Pick<MissionInterpretation, 'criteria'>): Levels {
  const levels: Partial<Record<CriterionId, CriterionLevel>> = {}
  for (const criterion of interpretation.criteria) {
    if (!isCriterionId(criterion.id)) throw new RangeError(`criterio desconocido: ${String(criterion.id)}`)
    if (levels[criterion.id] !== undefined) throw new RangeError(`criterio repetido: ${criterion.id}`)
    levels[criterion.id] = criterion.level
  }
  return normalizeLevels(levels)
}

/** ¿Quedó algún criterio con nivel > 0? (si no, el perfil está vacío y no hay nada que puntuar). */
export function hasAnyCriterion(levels: Readonly<Record<CriterionId, CriterionLevel>>): boolean {
  return CRITERION_IDS.some((id) => (levels[id] ?? 0) > 0)
}

function preset(
  id: string,
  label: string,
  description: string,
  levels: Record<CriterionId, CriterionLevel>,
  partial: boolean,
): MissionPreset {
  return Object.freeze({ id, label, description, levels: Object.freeze(levels), status: 'needs_calibration', partial })
}

/**
 * Perfiles predefinidos: funcionan sin red y sin IA. Todos son needs_calibration: el paso de un
 * objetivo de misión a niveles es una propuesta de producto, sin validación experta (ADR-009).
 * Ninguno usa la relevancia geológica, que sigue por calcular en el snapshot v2.
 * Cada uno debe tener su caso en tests/test_engine_parity.py (LEVEL_SETS): parity.test.ts lo exige.
 */
export const MISSION_PRESETS: readonly MissionPreset[] = Object.freeze([
  preset(
    'preset-movilidad',
    'Movilidad y autonomía',
    'Pendiente y rugosidad como claves; relieve local y suelo expuesto importantes; aridez como contexto. Aproxima por niveles el perfil base de movilidad, sin el rango térmico ni la geología por calcular.',
    {
      slope: 3,
      terrain_roughness: 3,
      local_relief: 2,
      bare_ground_fraction: 2,
      aridity_context: 1,
      surface_temperature_variability: 0,
      geologic_relevance: 0,
    },
    false,
  ),
  preset(
    'preset-navegacion',
    'Percepción y navegación',
    'Rugosidad y relieve local como claves, pendiente importante y suelo expuesto menor. La topografía se compara a escala MOLA: no describe obstáculos a escala de rueda.',
    {
      slope: 2,
      terrain_roughness: 3,
      local_relief: 3,
      bare_ground_fraction: 1,
      aridity_context: 0,
      surface_temperature_variability: 0,
      geologic_relevance: 0,
    },
    true,
  ),
  preset(
    'preset-traccion',
    'Tracción en pendiente',
    'Pendiente como clave; rugosidad y suelo expuesto importantes; relieve local menor. No mide cohesión ni mecánica de suelo.',
    {
      slope: 3,
      terrain_roughness: 2,
      local_relief: 1,
      bare_ground_fraction: 2,
      aridity_context: 0,
      surface_temperature_variability: 0,
      geologic_relevance: 0,
    },
    true,
  ),
  preset(
    'preset-superficie',
    'Superficie expuesta y aridez',
    'Continuidad de superficie no vegetada como clave, aridez importante y rugosidad menor. La clasificación satelital de superficie no mide composición mineral.',
    {
      slope: 0,
      terrain_roughness: 1,
      local_relief: 0,
      bare_ground_fraction: 3,
      aridity_context: 2,
      surface_temperature_variability: 0,
      geologic_relevance: 0,
    },
    true,
  ),
])
