/**
 * Marcadores `{{id}}` y filtro del texto de la IA (docs/UX_REDESIGN.md §5.5, puntos 3, 4 y 6).
 *
 * La IA nunca escribe cifras: escribe `{{id}}` y la UI lo reemplaza por el texto que el motor
 * dejó en `facts`. Fuera de los marcadores se rechaza:
 *  - cualquier dígito Unicode (\p{N}: «3», «３», «²», «½», «٣»…) y los signos de porcentaje;
 *  - símbolos numéricos («×», «±», «≈»…);
 *  - números escritos («dos», «veinte», «doscientos», «el doble», «la mitad», «tercio», «veces»…);
 *  - vocabulario de veredicto («seguro», «aprobado», «garantiza», «ideal», «apto», «puntaje»,
 *    «score», «el mejor»…);
 *  - afirmaciones de orden («primero», «segunda», «última», «encabeza», «lidera», «ranking»,
 *    «preferible», «recomendable», «adecuado», «confiable»…): el orden lo fija el motor y solo
 *    se cita con `{{site:…:rank}}` (§0.8, §5.5);
 *  - criterios que no se miden (hielo, mineral, radiación, regolito, química);
 *  - caracteres invisibles o de control (zero-width, bidi) y letras de otros alfabetos
 *    (homóglifos cirílicos o griegos que esquivarían el filtro).
 * Las palabras se comparan normalizadas (NFKC, minúsculas, sin tildes) y completas: «todos» no
 * es «dos» y «unidad» no es «uno».
 */

export type TextIssueCode =
  | 'empty'
  | 'too_long'
  | 'control'
  | 'script'
  | 'digit'
  | 'percent'
  | 'numeric_symbol'
  | 'number_word'
  | 'vocabulary'
  | 'rank'
  | 'unmeasured'
  | 'malformed_marker'
  | 'unknown_ref'
  | 'undeclared_ref'

export interface TextIssue {
  code: TextIssueCode
  /** Lo que disparó el rechazo (palabra, carácter o id), para el aviso y los tests. */
  detail: string
}

export type TokenSegment = { kind: 'text'; text: string } | { kind: 'marker'; id: string }

export const TEXT_MAX = 280

/** Mismo alfabeto que el esquema ai-analysis/1 para el id de un marcador. */
const MARKER_ID = /^[a-z0-9_:.-]+$/

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­؜ᅟᅠ᠎​-‏‪-‮⁠-⁤⁦-⁯ㅤ︀-️﻿ﾠ]/u
const DIGIT = /\p{N}/u
const PERCENT = /[%％٪﹪‰‱]/u
const NUMERIC_SYMBOL = /[×±÷√∑∞≈≤≥⁄∕]/u
const LETTER = /\p{L}/gu
const LATIN = /\p{Script=Latin}/u
const WORD = /\p{L}+/gu

/** Números escritos (español e inglés, normalizados sin tildes). */
const NUMBER_WORD = new RegExp(
  '^(?:' +
    [
      'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
      'once', 'doce', 'trece', 'catorce', 'quince', 'dieci[a-z]+', 'veinte', 'veinti[a-z]+',
      'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa',
      'cien', 'ciento', '[a-z]*cient[oa]s', 'quinient[oa]s', 'mil', 'miles', 'millon(?:es)?', 'millar(?:es)?',
      'billon(?:es)?', 'decenas?', 'docenas?', 'centenas?', 'centenar(?:es)?',
      'mitad(?:es)?', 'doble[a-z]*', 'duplic[a-z]*', 'triple[a-z]*', 'triplic[a-z]*', 'cuadrupl[a-z]*',
      'quintupl[a-z]*', 'tercios?', 'veces', 'porcentajes?', 'porcentual[a-z]*',
      // Cuantificadores: «una vez y media», «medio grado», «un par de grados», «un cuarto».
      'medi[oa]s?', 'par(?:es)?', 'cuart[oa]s?',
      'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'eleven',
      'twelve', 'twenty', 'thirty', 'forty', 'fifty', 'hundreds?', 'thousands?', 'millions?', 'half',
      'twice', 'thrice', 'double', 'percent', 'percentage', 'quarters?', 'pairs?',
    ].join('|') +
    ')$',
)

/** Vocabulario de veredicto: la postura la fija el motor, nunca la IA. */
const VOCABULARY = new RegExp(
  '^(?:' +
    [
      'segur[oa]s?', 'aprobad[oa]s?', 'aprueba[n]?', 'aprobar', 'garantiz[a-z]*', 'garantias?',
      'ideal(?:es|mente)?', 'apt[oa]s?', 'puntajes?', 'puntua[n]?', 'puntuar', 'puntuacion(?:es)?',
      'scores?', 'scoring', 'optim[oa]s?', 'perfect[oa]s?', 'idone[oa]s?', 'certific[a-z]*',
      'safe', 'approved', 'guarantee[sd]?', 'optimal', 'best',
    ].join('|') +
    ')$',
)

/**
 * Orden y preferencia entre lugares: el motor fija todo orden y toda postura (§0.8, §5.5). La IA
 * cita el puesto con `{{site:…:rank}}`; nunca lo escribe con palabras.
 */
const RANK = new RegExp(
  '^(?:' +
    [
      'primer[oa]?s?', 'segund[oa]s?', 'tercer[oa]?s?', 'quint[oa]s?', 'sext[oa]s?', 'ultim[oa]s?', 'penultim[oa]s?',
      'encabez[a-z]*', 'lider[a-z]*', 'rankings?', 'preferibles?', 'recomendables?', 'adecuad[oa]s?',
      'confiables?', 'aventaj[a-z]*', 'ganador[a-z]*', 'first', 'second', 'third', 'last', 'top', 'leads?', 'ranked',
      'preferable', 'recommended',
    ].join('|') +
    ')$',
)

/** «el mejor», «la mejor», «lo mejor», «los/las mejores». */
const SUPERLATIVE = /^(?:el|la|lo|los|las)$/
const MEJOR = /^mejor(?:es)?$/

/** Lo que el snapshot no mide: solo puede aparecer en `unsupported` (lo que pidió el usuario). */
const UNMEASURED = /^(?:hielos?|mineral(?:es)?|mineralog[a-z]*|radiacion(?:es)?|radiactiv[a-z]*|regolitos?|quimic[oa]s?)$/

/** Minúsculas, NFKC y sin marcas diacríticas («Ｄóble» → «doble»). */
export function normalizeWord(word: string): string {
  return word.normalize('NFKC').normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase()
}

function words(text: string): string[] {
  return (normalizeWord(text).match(WORD) ?? []).map((word) => word)
}

export interface ScanOptions {
  /** Rechazar vocabulario de veredicto (default true). */
  vocabulary?: boolean
  /** Rechazar criterios que no se miden (default true). */
  unmeasured?: boolean
}

/** Primer problema de un tramo de texto SIN marcadores; null si es aceptable. */
export function scanPlainText(text: string, options: ScanOptions = {}): TextIssue | null {
  const control = CONTROL.exec(text)
  if (control) return { code: 'control', detail: `U+${control[0].codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}` }
  const normalized = text.normalize('NFKC')
  for (const candidate of [text, normalized]) {
    const digit = DIGIT.exec(candidate)
    if (digit) return { code: 'digit', detail: digit[0] }
    const percent = PERCENT.exec(candidate)
    if (percent) return { code: 'percent', detail: percent[0] }
    const symbol = NUMERIC_SYMBOL.exec(candidate)
    if (symbol) return { code: 'numeric_symbol', detail: symbol[0] }
  }
  for (const letter of normalized.match(LETTER) ?? []) {
    if (!LATIN.test(letter)) return { code: 'script', detail: letter }
  }
  const list = words(text)
  for (let index = 0; index < list.length; index += 1) {
    const word = list[index] ?? ''
    if (NUMBER_WORD.test(word)) return { code: 'number_word', detail: word }
    if (options.vocabulary !== false) {
      if (VOCABULARY.test(word)) return { code: 'vocabulary', detail: word }
      if (RANK.test(word)) return { code: 'rank', detail: word }
      if (MEJOR.test(word) && index > 0 && SUPERLATIVE.test(list[index - 1] ?? '')) {
        return { code: 'vocabulary', detail: `${list[index - 1]} ${word}` }
      }
    }
    if (options.unmeasured !== false && UNMEASURED.test(word)) return { code: 'unmeasured', detail: word }
    if (word === 'por' && list[index + 1] === 'ciento') return { code: 'number_word', detail: 'por ciento' }
  }
  return null
}

/**
 * Separa texto y marcadores. Una llave suelta, un marcador vacío o con caracteres fuera del
 * alfabeto de ids hacen el texto inválido (no se adivina qué quiso citar).
 */
export function splitMarkers(text: string): { ok: true; segments: TokenSegment[] } | { ok: false; issue: TextIssue } {
  const segments: TokenSegment[] = []
  let rest = text
  while (rest.length > 0) {
    const open = rest.indexOf('{{')
    const stray = rest.search(/[{}]/)
    if (open === -1) {
      if (stray !== -1) return { ok: false, issue: { code: 'malformed_marker', detail: rest.slice(stray, stray + 12) } }
      segments.push({ kind: 'text', text: rest })
      break
    }
    if (stray !== -1 && stray < open) return { ok: false, issue: { code: 'malformed_marker', detail: rest.slice(stray, stray + 12) } }
    if (open > 0) segments.push({ kind: 'text', text: rest.slice(0, open) })
    const close = rest.indexOf('}}', open + 2)
    if (close === -1) return { ok: false, issue: { code: 'malformed_marker', detail: rest.slice(open, open + 12) } }
    const id = rest.slice(open + 2, close)
    if (!MARKER_ID.test(id)) return { ok: false, issue: { code: 'malformed_marker', detail: `{{${id}}}` } }
    segments.push({ kind: 'marker', id })
    rest = rest.slice(close + 2)
  }
  return { ok: true, segments }
}

export interface TokenTextContext {
  /** Hechos citables del paquete (id → texto del motor). */
  facts: Readonly<Record<string, string>>
  /** `refs` declarados por el evento. */
  refs: readonly string[]
}

export type TokenTextResult = { ok: true; segments: TokenSegment[]; markers: string[] } | { ok: false; issue: TextIssue }

/**
 * Valida un texto con marcadores: largo, forma de cada marcador, que cada `{{id}}` exista en
 * `facts` y esté en `refs`, y el filtro sobre todo lo que queda fuera de los marcadores.
 */
export function checkTokenText(text: string, context: TokenTextContext, options: ScanOptions = {}): TokenTextResult {
  if (text.trim().length === 0) return { ok: false, issue: { code: 'empty', detail: '' } }
  if (text.length > TEXT_MAX) return { ok: false, issue: { code: 'too_long', detail: String(text.length) } }
  const split = splitMarkers(text)
  if (!split.ok) return split
  const markers: string[] = []
  for (const segment of split.segments) {
    if (segment.kind === 'marker') {
      if (!Object.prototype.hasOwnProperty.call(context.facts, segment.id)) return { ok: false, issue: { code: 'unknown_ref', detail: segment.id } }
      if (!context.refs.includes(segment.id)) return { ok: false, issue: { code: 'undeclared_ref', detail: segment.id } }
      markers.push(segment.id)
    }
  }
  // El filtro se aplica al texto sin marcadores unido por un espacio: una palabra partida por
  // un marcador no se recompone, y un número escrito no puede esconderse junto a uno.
  const plain = split.segments.map((segment) => (segment.kind === 'text' ? segment.text : ' ')).join('')
  const issue = scanPlainText(plain, options)
  if (issue) return { ok: false, issue }
  return { ok: true, segments: split.segments, markers }
}
