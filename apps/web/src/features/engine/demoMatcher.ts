/**
 * Matcher «DEMO · sin IA» (docs/UX_REDESIGN.md §0.9, §1.18 y §5.1): interpreta el texto de una
 * misión SIN RED y SIN IA, por palabras clave, y devuelve un `mission-interpretation/1` con
 * `engine: 'demo'`. Solo propone niveles 0–3: los pesos y los % los calcula el motor.
 *
 * Reglas (deterministas, sin dependencias):
 * - Texto plegado a minúsculas sin tildes; se compara palabra a palabra (`*` = prefijo) y gana la
 *   coincidencia más larga.
 * - Una palabra de un criterio lo deja en Clave (3). «secundario» cerca lo deja en Menor (1).
 *   Una exclusión explícita en la misma cláusula («excluir», «no importa», «da igual»…) lo deja
 *   en Excluir (0). Si hay menciones positivas y excluidas, gana la positiva más alta.
 * - Palabras de contexto de movilidad («rover», «navegación», «tracción»…) aplican los niveles del
 *   perfil Movilidad a los criterios no mencionados.
 * - Lo que el snapshot no mide (hielo, radiación, regolito, química…) va a `unsupported`.
 * - Los textos generados no llevan dígitos ni % (lo exige el contrato).
 */
import type { CriterionLevel, MissionInterpretation, UnsupportedReason } from '../../domain/aiContracts'
import type { CriterionId } from '../../domain/contracts'
import { CRITERION_IDS } from '../../domain/criteria'
import { LEVEL_LABELS, MISSION_PRESETS, type BaseProfileRef } from './profiles'
import type { DemoMatch, TextSpan } from './types'

export const DEMO_LABEL = 'DEMO · sin IA'
export const DEMO_MATCHER_VERSION = '1.0.0'
/** Perfil base por defecto; el composer debe pasar el `{ id, version }` del snapshot cargado. */
export const DEFAULT_BASE_PROFILE: BaseProfileRef = Object.freeze({ id: 'mars-rover-screening-v2', version: '2.0.1-preliminary' })

type Entry =
  | { kind: 'criterion'; pattern: readonly string[]; criterionId: CriterionId }
  | { kind: 'context'; pattern: readonly string[] }
  | { kind: 'unsupported'; pattern: readonly string[]; reason: UnsupportedReason }
  | { kind: 'exclusion'; pattern: readonly string[] }
  | { kind: 'minor'; pattern: readonly string[] }

/** «a b_c*» → dos patrones: ['a'] y ['b', 'c*']. */
function patterns(list: string): string[][] {
  return list.split(' ').map((item) => item.split('_'))
}

const CRITERION_WORDS: Readonly<Record<CriterionId, string>> = {
  slope: 'pendiente* inclinacion* inclinad* ladera* cuesta* talud* rampa* subida* bajada* empinad* escarpad*',
  terrain_roughness:
    'rugos* rocos* roca rocas piedra* pedregos* bloque* guijarro* clasto* escombro* irregular* accidentad* obstaculo* canto*_rodado*',
  local_relief:
    'relieve* desnivel* crater* quebrada* barranco* canon canones colina* loma* lomaje* duna* escarpe* acantilad* topografi* ondulad* montan* valle*',
  bare_ground_fraction:
    'suelo_desnud* suelo_expuest* superficie_expuest* superficie_desnud* sin_vegetacion no_vegetad* vegetacion cobertura_vegetal desnud* arena* arenos* grava* gravilla* suelo suelos',
  aridity_context: 'arid* hiperarid* seco seca secos secas sequedad sequia* desierto* desertic* lluvia* precipitacion* humedad',
  surface_temperature_variability: 'termic* temperatura* frio fria frios frias calor caluros* helada* congela* calentamient*',
  geologic_relevance:
    'geolog* litolog* sediment* lacustre* delta deltas deltaic* fluvial* aluvial* paleo* volcan* basalt* estratigraf* afloramiento* evaporita*',
}

const CONTEXT_WORDS =
  'rover* robot* vehiculo* movilidad navegacion navegar autonom* conduccion conducir traccion rueda* locomocion desplazamiento* recorrido* trayectoria*'

const NOT_MEASURED =
  'hielo* permafrost mineral* mineralog* composicion radiacion* regolito* quimic* polvo* magnetic* magnetismo gravedad atmosfer* presion agua_subterranea biofirma* organic* cohesion mecanica_de_suelo* mecanica_del_suelo obstaculo*_a_escala_de_rueda'

const OUT_OF_SCOPE = 'luna lunar* venus asteroide*'

const EXCLUSIONS =
  'excluir* excluy* excluid* ignor* omit* descart* sin_importar sin_importancia irrelevant* es_irrelevant* da_igual me_da_igual nos_da_igual no_importa* no_me_importa* no_nos_importa* no_consider* no_evalu* no_incluir no_incluy*'

const MINOR = 'secundari* es_secundari* menos_importante* poco_importante* menor_importancia de_menor_importancia'

const ENTRIES: readonly Entry[] = [
  ...patterns(NOT_MEASURED).map((pattern): Entry => ({ kind: 'unsupported', pattern, reason: 'not_measured' })),
  ...patterns(OUT_OF_SCOPE).map((pattern): Entry => ({ kind: 'unsupported', pattern, reason: 'out_of_scope' })),
  ...patterns(EXCLUSIONS).map((pattern): Entry => ({ kind: 'exclusion', pattern })),
  ...patterns(MINOR).map((pattern): Entry => ({ kind: 'minor', pattern })),
  ...CRITERION_IDS.flatMap((criterionId) =>
    patterns(CRITERION_WORDS[criterionId]).map((pattern): Entry => ({ kind: 'criterion', pattern, criterionId })),
  ),
  ...patterns(CONTEXT_WORDS).map((pattern): Entry => ({ kind: 'context', pattern })),
]

/** Palabras que abren una cláusula nueva aunque no haya puntuación. */
const CLAUSE_WORDS = new Set(['pero', 'aunque', 'mientras', 'salvo', 'excepto'])
const CLAUSE_PUNCTUATION = /[,;.:!?¿¡()\n]/
const WORD = /[\p{L}\p{M}\p{N}]+/gu
const NO_DIGITS = /^[^0-9%]+$/
/** Ventanas (en palabras) alrededor de una mención para exclusiones y «secundario». */
const BEFORE = 3
const MINOR_BEFORE = 2

interface Token {
  folded: string
  start: number
  end: number
  clause: number
}

interface Match {
  entry: Entry
  first: number
  last: number // exclusivo
  start: number
  end: number
  clause: number
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase()
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let clause = 0
  let previousEnd = 0
  for (const found of text.matchAll(WORD)) {
    const start = found.index ?? 0
    const folded = fold(found[0])
    if (tokens.length > 0 && (CLAUSE_PUNCTUATION.test(text.slice(previousEnd, start)) || CLAUSE_WORDS.has(folded))) clause += 1
    tokens.push({ folded, start, end: start + found[0].length, clause })
    previousEnd = start + found[0].length
  }
  return tokens
}

function wordMatches(token: string, pattern: string): boolean {
  return pattern.endsWith('*') ? token.startsWith(pattern.slice(0, -1)) : token === pattern
}

function entryLengthAt(tokens: readonly Token[], index: number, entry: Entry): number {
  const { pattern } = entry
  if (index + pattern.length > tokens.length) return 0
  for (let offset = 0; offset < pattern.length; offset += 1) {
    const token = tokens[index + offset]
    const word = pattern[offset]
    if (!token || word === undefined || !wordMatches(token.folded, word)) return 0
  }
  // Una frase no cruza cláusulas.
  const first = tokens[index]
  const last = tokens[index + pattern.length - 1]
  return first && last && first.clause === last.clause ? pattern.length : 0
}

function findMatches(tokens: readonly Token[]): Match[] {
  const matches: Match[] = []
  let index = 0
  while (index < tokens.length) {
    let best: Entry | null = null
    let bestLength = 0
    for (const entry of ENTRIES) {
      const length = entryLengthAt(tokens, index, entry)
      if (length > bestLength) {
        best = entry
        bestLength = length
      }
    }
    const first = tokens[index]
    const last = tokens[index + bestLength - 1]
    if (best && first && last) {
      matches.push({ entry: best, first: index, last: index + bestLength, start: first.start, end: last.end, clause: first.clause })
      index += bestLength
    } else {
      index += 1
    }
  }
  return matches
}

function quoted(text: string, match: Match, fallback: string): string {
  const slice = text.slice(match.start, match.end)
  return NO_DIGITS.test(slice) && slice.length <= 60 ? slice : fallback
}

function nearby(markers: readonly Match[], target: Match, before: number): boolean {
  return markers.some(
    (marker) =>
      marker.clause === target.clause &&
      ((marker.last <= target.first && marker.last >= target.first - before) || marker.first === target.last),
  )
}

function joinEs(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

/** Rótulos en minúscula para el resumen (mismos términos que domain/formatting, sin arrastrar Intl). */
const LABELS: Readonly<Record<CriterionId, string>> = {
  slope: 'pendiente',
  terrain_roughness: 'rugosidad',
  local_relief: 'relieve local',
  bare_ground_fraction: 'suelo expuesto',
  aridity_context: 'aridez',
  surface_temperature_variability: 'rango térmico',
  geologic_relevance: 'geología',
}

function lowerLabel(id: CriterionId): string {
  return LABELS[id]
}

const MOBILITY_LEVELS = MISSION_PRESETS.find((preset) => preset.id === 'preset-movilidad')?.levels

interface Mention {
  level: CriterionLevel
  rationale: string
}

/**
 * Interpreta el texto por palabras clave. null si el texto está vacío. Sin criterios de terreno
 * reconocibles devuelve `status: 'no_terrain_criteria'` con `criteria: []`.
 */
export function matchMissionDemo(text: string, base: BaseProfileRef = DEFAULT_BASE_PROFILE): DemoMatch | null {
  if (typeof text !== 'string' || text.trim() === '') return null
  const matches = findMatches(tokenize(text))
  const exclusions = matches.filter((match) => match.entry.kind === 'exclusion')
  const minors = matches.filter((match) => match.entry.kind === 'minor')
  const context = matches.filter((match) => match.entry.kind === 'context')

  const mentions = new Map<CriterionId, Mention>()
  const highlights: Array<{ start: number; end: number; criterionId: CriterionId }> = []
  const unsupported: MissionInterpretation['unsupported'] = []
  const unsupportedHighlights: Array<TextSpan & { reason: UnsupportedReason }> = []
  const seenUnsupported = new Set<string>()

  for (const match of matches) {
    const { entry } = match
    if (entry.kind === 'unsupported') {
      unsupportedHighlights.push({ start: match.start, end: match.end, reason: entry.reason })
      const phrase = quoted(text, match, entry.pattern.join(' ').replace(/\*/g, ''))
      const key = fold(phrase)
      if (!seenUnsupported.has(key) && unsupported.length < 8) {
        seenUnsupported.add(key)
        unsupported.push({ phrase, reason: entry.reason })
      }
      continue
    }
    if (entry.kind !== 'criterion') continue
    highlights.push({ start: match.start, end: match.end, criterionId: entry.criterionId })
    const word = quoted(text, match, lowerLabel(entry.criterionId))
    const level: CriterionLevel = nearby(exclusions, match, BEFORE) ? 0 : nearby(minors, match, MINOR_BEFORE) ? 1 : 3
    const rationale =
      level === 0
        ? `Excluido en el texto: «${word}».`
        : level === 1
          ? `Mencionado como secundario: «${word}».`
          : `Mencionado en el texto: «${word}».`
    const previous = mentions.get(entry.criterionId)
    // Gana la mención positiva más alta; una exclusión solo vale si no hay menciones positivas.
    if (!previous || (previous.level === 0 && level > 0) || level > previous.level) {
      mentions.set(entry.criterionId, { level, rationale })
    }
  }

  const contextWord = context[0] ? quoted(text, context[0], 'rover') : null
  const criteria: MissionInterpretation['criteria'] = []
  for (const id of CRITERION_IDS) {
    const mention = mentions.get(id)
    if (mention) {
      criteria.push({ id, level: mention.level, rationale: mention.rationale })
      continue
    }
    const fallback = contextWord && MOBILITY_LEVELS ? MOBILITY_LEVELS[id] : 0
    if (fallback > 0) {
      criteria.push({
        id,
        level: fallback,
        rationale: `Contexto de movilidad («${contextWord}»): nivel ${LEVEL_LABELS[fallback]} del perfil Movilidad.`,
      })
    }
  }

  const ok = criteria.some((criterion) => criterion.level > 0)
  const groups = ([3, 2, 1] as const)
    .map((level) => ({ level, ids: criteria.filter((criterion) => criterion.level === level).map((criterion) => criterion.id) }))
    .filter((group) => group.ids.length > 0)
    .map((group) => `${LEVEL_LABELS[group.level].toLowerCase()} ${joinEs(group.ids.map(lowerLabel))}`)
  const summary = ok
    ? `Misión DEMO por palabras clave${contextWord ? ', en contexto de movilidad de rover' : ''}: ${groups.join('; ')}.`
    : 'Texto sin criterios de terreno reconocibles'

  const assumptions = ['Interpretación DEMO por palabras clave, sin IA: revisa los niveles antes de usar el orden.']
  if (contextWord) assumptions.push('Se parte del perfil Movilidad por el contexto de rover y se ajusta con las palabras del texto.')
  if (criteria.some((criterion) => criterion.id === 'geologic_relevance' && criterion.level > 0)) {
    assumptions.push('La relevancia geológica sigue por calcular en el snapshot: resta cobertura al perfil.')
  }

  const interpretation: MissionInterpretation = {
    schema: 'mission-interpretation/1',
    engine: 'demo',
    model: 'keywords',
    prompt_version: DEMO_MATCHER_VERSION,
    base_profile: { id: base.id, version: base.version },
    status: ok ? 'ok' : 'no_terrain_criteria',
    mission_summary: summary.slice(0, 280),
    criteria,
    assumptions,
    unsupported,
  }
  return {
    interpretation,
    highlights,
    label: DEMO_LABEL,
    contextHighlights: context.map((match) => ({ start: match.start, end: match.end })),
    unsupportedHighlights,
    exclusionHighlights: exclusions.map((match) => ({ start: match.start, end: match.end })),
  }
}
