/**
 * Validación de cada evento `ai-analysis/1` antes de mostrarlo (docs/UX_REDESIGN.md §5.5):
 *  1. esquema (Ajv precompilado, inyectado);
 *  2. el primer evento es `meta` con el motor esperado y la huella del paquete actual; si la
 *     huella no coincide, el contenido queda «Desactualizado» y el stream se cancela;
 *  3. cada `{{id}}` existe en `facts` y está en `refs`; cada `ref` existe;
 *  4. sin dígitos, %, números escritos ni vocabulario de veredicto fuera de los marcadores;
 *  5. el `fact_kind` de un `insight` coincide con una entrada de `fact_kinds` y el texto cita su
 *     propio criterio; sin léxico de orden («primero», «encabeza», «ranking»…): el orden lo
 *     fija el motor (§0.8);
 *  5b. un `summary` o `tradeoff` que compara («más», «mejor», «supera»…) cita un hecho de orden
 *     (`site:…:rank`, `rank:…`) o un criterio en el que el motor estableció `best_of_n`;
 *  6. lugares, verificaciones y análogos existen; topes por tipo.
 * Lo que no pasa se descarta con un motivo neutro; nunca se muestra texto sin validar.
 * Puro: sin red ni stores.
 */
import type { AiAnalysisEvent, ContractCheck, EvidencePacket } from '../../domain/aiContracts'
import type { CriterionId } from '../../domain/contracts'
import { checkTokenText, normalizeWord, type TextIssueCode, type TokenSegment } from './analysisTokens'
import { parseFactId } from './factIds'
import type { DiscardReason, ReadingBlock, ResolvedSegment } from './types'

export const DISCARD_MESSAGE: Readonly<Record<DiscardReason, string>> = {
  schema: 'no cumplía el contrato ai-analysis/1',
  unknown_ref: 'citaba un dato que no existe',
  undeclared_ref: 'citaba un dato sin declararlo',
  digits: 'escribía cifras fuera de los datos del motor',
  number_word: 'escribía un número con palabras',
  vocabulary: 'usaba un veredicto que solo puede fijar el motor',
  rank: 'afirmaba un orden que solo puede fijar el motor',
  rank_fact: 'comparaba lugares sin citar el orden ni un hecho del motor',
  unmeasured: 'mencionaba algo que este snapshot no mide',
  unsafe_text: 'traía caracteres no admitidos',
  malformed_marker: 'tenía un marcador mal formado',
  fact_kind: 'atribuía un hecho que el motor no estableció',
  own_criterion: 'no citaba su propio criterio',
  unknown_site: 'hablaba de un lugar que no está en la comparativa',
  unknown_check: 'citaba una verificación de terreno que no existe',
  unknown_analog: 'hablaba de un análogo fuera del catálogo',
  duplicate: 'repetía un bloque ya recibido',
  cap: 'superaba el máximo de bloques',
  out_of_order: 'llegó fuera de orden',
}

/** Topes (§5.4): 6 insight por lugar y 4 tradeoff; el resto, para acotar el panel. */
export const CAPS = {
  insightPerSite: 6,
  tradeoff: 4,
  testSuggestionPerSite: 2,
  robustnessNote: 3,
  uncertainty: 8,
  analogNote: 8,
  blocks: 64,
} as const

const ISSUE_REASON: Readonly<Record<TextIssueCode, DiscardReason>> = {
  empty: 'schema',
  too_long: 'schema',
  control: 'unsafe_text',
  script: 'unsafe_text',
  digit: 'digits',
  percent: 'digits',
  numeric_symbol: 'digits',
  number_word: 'number_word',
  vocabulary: 'vocabulary',
  rank: 'rank',
  unmeasured: 'unmeasured',
  malformed_marker: 'malformed_marker',
  unknown_ref: 'unknown_ref',
  undeclared_ref: 'undeclared_ref',
}

/** Palabras con las que un texto «nombra» su criterio (normalizadas, sin tildes). */
const CRITERION_WORDS: Readonly<Record<CriterionId, RegExp>> = {
  slope: /^(?:pendientes?|inclinacion(?:es)?|inclinad[oa]s?|laderas?)$/,
  terrain_roughness: /^(?:rugosidad(?:es)?|rugos[oa]s?|asperez[a-z]*)$/,
  local_relief: /^(?:relieves?|desnivel(?:es)?)$/,
  bare_ground_fraction: /^(?:suelos?|vegetacion|vegetad[oa]s?|desnud[oa]s?|expuest[oa]s?)$/,
  aridity_context: /^(?:aridez|arid[oa]s?|lluvias?|precipitacion(?:es)?|secos?|secas?)$/,
  surface_temperature_variability: /^(?:termic[oa]s?|temperaturas?|amplitud(?:es)?)$/,
  geologic_relevance: /^(?:geologi[a-z]*|litologi[a-z]*|afloramientos?|rocas?)$/,
}

export type GateOutcome =
  | { kind: 'meta'; model: string }
  | { kind: 'stage'; stage: 'selecting_facts' | 'writing' }
  | { kind: 'block'; block: ReadingBlock }
  | { kind: 'discard'; reason: DiscardReason; message: string }
  | { kind: 'done' }
  | { kind: 'error'; code: 'timeout' | 'invalid' | 'unavailable' }
  /** La huella no coincide: el contenido corresponde a otros datos. Cancelar el stream. */
  | { kind: 'stale' }
  /** El stream no es utilizable (no empezó con meta, motor equivocado…). Cancelar. */
  | { kind: 'fatal'; reason: string }

export interface GateOptions {
  packet: EvidencePacket
  expectedEngine: 'lktron' | 'pregenerated'
  /** ids del catálogo de ◆; null = catálogo no disponible (se descartan las notas de análogos). */
  analogIds: ReadonlySet<string> | null
  /** Validador de forma (Ajv precompilado): `checkAiAnalysisEvent`. */
  checkSchema: (raw: unknown) => ContractCheck<AiAnalysisEvent>
}

export interface EventGate {
  accept(raw: unknown): GateOutcome
}

export { parseFactId }

function resolve(segments: readonly TokenSegment[], facts: Readonly<Record<string, string>>): ResolvedSegment[] {
  return segments.map((segment) => {
    if (segment.kind === 'text') return { kind: 'text', text: segment.text }
    const { siteId, criterionId } = parseFactId(segment.id)
    return { kind: 'fact', id: segment.id, text: facts[segment.id] ?? '', criterionId, siteId }
  })
}

function mentionsCriterion(text: string, criterionId: CriterionId): boolean {
  const pattern = CRITERION_WORDS[criterionId]
  return (normalizeWord(text).match(/\p{L}+/gu) ?? []).some((word) => pattern.test(word))
}

/** Léxico comparativo: el texto pone un lugar por delante de otro o de Jezero. */
const COMPARATIVE = /^(?:mas|menos|mejor(?:es)?|peor(?:es)?|mayor(?:es)?|menor(?:es)?|supera[n]?|superior(?:es)?|delante|detras)$/

function compares(text: string): boolean {
  return (normalizeWord(text).match(/\p{L}+/gu) ?? []).some((word) => COMPARATIVE.test(word))
}

function citesCriterion(ids: readonly string[], criterionId: CriterionId): boolean {
  return ids.some((id) => parseFactId(id).criterionId === criterionId)
}

export function createEventGate(options: GateOptions): EventGate {
  const { packet, expectedEngine, analogIds, checkSchema } = options
  const sites = new Set(packet.sites)
  const checks = packet.checks
  let state: 'start' | 'open' | 'closed' = 'start'
  let order = 0
  const counts = new Map<string, number>()
  const seen = new Set<string>()

  const discard = (reason: DiscardReason): GateOutcome => ({ kind: 'discard', reason, message: DISCARD_MESSAGE[reason] })
  const bump = (key: string, cap: number): boolean => {
    const next = (counts.get(key) ?? 0) + 1
    if (next > cap) return false
    counts.set(key, next)
    return true
  }
  /**
   * Un resumen o contrapeso que compara lugares debe apoyarse en el orden del motor: cita un
   * puesto (`site:…:rank`, `rank:…`) o un hecho de un criterio donde el motor fijó `best_of_n`.
   */
  const groundsComparison = (markers: readonly string[]): boolean =>
    markers.some((id) => {
      if (id.startsWith('rank:') || /^site:[^:]+:rank$/.test(id)) return true
      const { siteId, criterionId } = parseFactId(id)
      return (
        siteId !== null &&
        criterionId !== null &&
        packet.fact_kinds.some((fact) => fact.kind === 'best_of_n' && fact.site_id === siteId && fact.criterion_id === criterionId)
      )
    })
  const refExists = (ref: string): boolean =>
    Object.prototype.hasOwnProperty.call(packet.facts, ref) || Object.prototype.hasOwnProperty.call(checks, ref)

  /** Texto + refs: devuelve los tramos resueltos o el motivo del descarte. */
  const text = (value: string, refs: readonly string[]): { ok: true; segments: ResolvedSegment[]; markers: string[] } | { ok: false; reason: DiscardReason } => {
    if (!refs.every(refExists)) return { ok: false, reason: 'unknown_ref' }
    const result = checkTokenText(value, { facts: packet.facts, refs })
    if (!result.ok) return { ok: false, reason: ISSUE_REASON[result.issue.code] }
    return { ok: true, segments: resolve(result.segments, packet.facts), markers: result.markers }
  }

  const block = (partial: Omit<ReadingBlock, 'order' | 'siteIds' | 'criterionId' | 'factKind' | 'checkRef' | 'analogId'> & Partial<ReadingBlock>): GateOutcome => {
    if (order >= CAPS.blocks) return discard('cap')
    const full: ReadingBlock = {
      siteIds: [],
      criterionId: null,
      factKind: null,
      checkRef: null,
      analogId: null,
      ...partial,
      order: order++,
    }
    return { kind: 'block', block: full }
  }

  return {
    accept(raw: unknown): GateOutcome {
      const checked = checkSchema(raw)
      if (state === 'start') {
        if (!checked.ok) return { kind: 'fatal', reason: 'El análisis no empezó con un encabezado válido.' }
        const event = checked.value
        if (event.type === 'error') {
          state = 'closed'
          return { kind: 'error', code: event.code }
        }
        if (event.type !== 'meta') return { kind: 'fatal', reason: 'El análisis no empezó con su encabezado (meta).' }
        if (event.engine !== expectedEngine) return { kind: 'fatal', reason: 'El análisis no viene del motor esperado.' }
        if (event.packet_hash !== packet.packet_hash) {
          state = 'closed'
          return { kind: 'stale' }
        }
        state = 'open'
        return { kind: 'meta', model: event.model }
      }
      if (state === 'closed') return discard('out_of_order')
      if (!checked.ok) return discard('schema')
      const event = checked.value

      switch (event.type) {
        case 'meta':
          return discard('duplicate')
        case 'stage':
          return { kind: 'stage', stage: event.stage }
        case 'done':
          state = 'closed'
          return { kind: 'done' }
        case 'error':
          state = 'closed'
          return { kind: 'error', code: event.code }
        case 'summary': {
          if (event.site_id !== null && !sites.has(event.site_id)) return discard('unknown_site')
          const key = `summary:${event.site_id ?? '*'}`
          if (seen.has(key)) return discard('duplicate')
          const resolved = text(event.text, event.refs)
          if (!resolved.ok) return discard(resolved.reason)
          if (compares(event.text) && !groundsComparison(resolved.markers)) return discard('rank_fact')
          seen.add(key)
          return block({ key, type: 'summary', siteId: event.site_id, segments: resolved.segments })
        }
        case 'insight': {
          if (!sites.has(event.site_id)) return discard('unknown_site')
          const key = `insight:${event.id}`
          if (seen.has(key)) return discard('duplicate')
          const matches = packet.fact_kinds.some((fact) => {
            if (fact.kind !== event.fact_kind || fact.criterion_id !== event.criterion_id) return false
            if (fact.kind === 'no_discrimination') return true
            if (fact.kind === 'shared_regional_value') return fact.site_ids.includes(event.site_id)
            return fact.site_id === event.site_id
          })
          if (!matches) return discard('fact_kind')
          const resolved = text(event.text, event.refs)
          if (!resolved.ok) return discard(resolved.reason)
          if (!citesCriterion([...resolved.markers, ...event.refs], event.criterion_id) && !mentionsCriterion(event.text, event.criterion_id)) {
            return discard('own_criterion')
          }
          if (!bump(`insight:${event.site_id}`, CAPS.insightPerSite)) return discard('cap')
          seen.add(key)
          return block({ key, type: 'insight', siteId: event.site_id, criterionId: event.criterion_id, factKind: event.fact_kind, segments: resolved.segments })
        }
        case 'test_suggestion': {
          if (!sites.has(event.site_id)) return discard('unknown_site')
          const resolved = text(event.text, event.refs)
          if (!resolved.ok) return discard(resolved.reason)
          if (!bump(`test:${event.site_id}`, CAPS.testSuggestionPerSite)) return discard('cap')
          return block({ key: `test:${event.site_id}:${order}`, type: 'test_suggestion', siteId: event.site_id, segments: resolved.segments })
        }
        case 'tradeoff': {
          if (!event.site_ids.every((siteId) => sites.has(siteId))) return discard('unknown_site')
          const resolved = text(event.text, event.refs)
          if (!resolved.ok) return discard(resolved.reason)
          if (compares(event.text) && !groundsComparison(resolved.markers)) return discard('rank_fact')
          if (!bump('tradeoff', CAPS.tradeoff)) return discard('cap')
          return block({ key: `tradeoff:${order}`, type: 'tradeoff', siteId: null, siteIds: [...event.site_ids], segments: resolved.segments })
        }
        case 'robustness_note': {
          const resolved = text(event.text, event.refs)
          if (!resolved.ok) return discard(resolved.reason)
          if (!bump('robustness', CAPS.robustnessNote)) return discard('cap')
          return block({ key: `robustness:${order}`, type: 'robustness_note', siteId: null, segments: resolved.segments })
        }
        case 'uncertainty': {
          if (event.resolves_check !== undefined && !Object.prototype.hasOwnProperty.call(checks, event.resolves_check)) return discard('unknown_check')
          const resolved = text(event.text, event.refs)
          if (!resolved.ok) return discard(resolved.reason)
          if (!bump('uncertainty', CAPS.uncertainty)) return discard('cap')
          const siteId = event.resolves_check ? (event.resolves_check.split(':')[1] ?? null) : null
          return block({ key: `uncertainty:${order}`, type: 'uncertainty', siteId, checkRef: event.resolves_check ?? null, segments: resolved.segments })
        }
        case 'field_priority': {
          if (!sites.has(event.site_id)) return discard('unknown_site')
          if (!Object.prototype.hasOwnProperty.call(checks, event.check_ref) || !event.check_ref.startsWith(`check:${event.site_id}:`)) return discard('unknown_check')
          const key = `priority:${event.check_ref}`
          if (seen.has(key)) return discard('duplicate')
          const resolved = text(event.why, event.refs)
          if (!resolved.ok) return discard(resolved.reason)
          seen.add(key)
          return block({ key, type: 'field_priority', siteId: event.site_id, checkRef: event.check_ref, segments: resolved.segments })
        }
        case 'analog_note': {
          if (!analogIds || !analogIds.has(event.analog_id)) return discard('unknown_analog')
          const key = `analog:${event.analog_id}`
          if (seen.has(key)) return discard('duplicate')
          const resolved = text(event.text, [])
          if (!resolved.ok) return discard(resolved.reason)
          if (!bump('analog', CAPS.analogNote)) return discard('cap')
          seen.add(key)
          return block({ key, type: 'analog_note', siteId: null, analogId: event.analog_id, segments: resolved.segments })
        }
        default:
          return discard('schema')
      }
    },
  }
}
