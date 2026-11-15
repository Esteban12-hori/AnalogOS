/**
 * DISPLAY of text that comes from deterministic records (ADR-016 records, ADR-017 Spanish presentation).
 *
 * New records are always mission 1.1.0 / geology version 2: English, fingerprinted, exported byte-for-byte the same in
 * both interface languages. In Spanish the interface SHOWS the wording of the frozen Spanish packs (mission 1.0.0,
 * geology version 1) for the same facts, without touching the record:
 *
 *   displayRecordText(result.reason, locale)        // en: unchanged · es: the 1.0.0 wording of the same reason
 *   displayRecordTexts(evaluation.limits, locale)
 *   displayMissionPack(locale).describeEffective(r) // UI formatting of a requirement with the language's pack
 *
 * How it works (pure, no network, no AI, nothing guessed):
 * - Constants: every string of the English pack is paired with the string at the same path of the Spanish pack
 *   (limits, ordering rule, status definitions, scale notes, scope notes, notices, labels…).
 * - Templates: each pack function (observedReason, unmeasuredReason, wouldChange…, purposeText, limits…) is turned into
 *   a template by calling both packs with probe values. A record string is matched against the English template with
 *   backtracking; each hole is converted with a strict converter (user labels and source text are kept verbatim,
 *   numbers are re-formatted en-US → es-CL exactly as the frozen pack prints them, labels are mapped) and the Spanish
 *   template is filled.
 * - Anything that is not recognized is returned UNCHANGED (never translated on the fly). User-authored text and source
 *   evidence therefore stay exactly as written.
 *
 * Correctness is proven by i18n/recordText.test.ts: for representative requests, every text of the 1.1.0 evaluation,
 * verification catalog, explanation view, geology catalog and guidance maps to the corresponding text that the engine
 * itself writes with the Spanish packs (1.0.0 / version 1).
 *
 * Export-only metadata (export description, how-to-read, language notes) is deliberately NOT mapped: it is never shown
 * as interface text and its wording is version-specific.
 */
import { geologyText, type GeologyText, type UnitIdentity } from '../../../../shared/geology/text'
import { EN_TEXT } from '../../../../shared/mission/text/en'
import { ES_TEXT } from '../../../../shared/mission/text/es'
import type { MissionText } from '../../../../shared/mission/text/types'
import type { UnmeasuredRequirement } from '../../../../shared/mission/types'
import { getLocale, type Locale } from './locale'
import { verificationDisplayText } from './sourceText'

const GEO_EN: GeologyText = geologyText(2)
const GEO_ES: GeologyText = geologyText(1)

/** Pack to FORMAT interface text from structured data (requirements, conditions, observed values) in a language. */
export function displayMissionPack(locale: Locale = getLocale()): MissionText {
  return locale === 'es' ? ES_TEXT : EN_TEXT
}

/** Geology pack to format interface text (coverage, scale labels, availability and purpose labels) in a language. */
export function displayGeologyPack(locale: Locale = getLocale()): GeologyText {
  return locale === 'es' ? GEO_ES : GEO_EN
}

// ---- Constants ------------------------------------------------------------------------------------------------------

type Pairs = Map<string, string>

/** Pairs every string leaf of `en` with the leaf at the same path of `es` (objects and arrays); functions are skipped. */
function collectPairs(en: unknown, es: unknown, out: Pairs, conflicts: string[]): void {
  if (typeof en === 'string') {
    if (typeof es !== 'string' || en === es) return
    const seen = out.get(en)
    if (seen !== undefined && seen !== es) conflicts.push(en)
    else out.set(en, es)
    return
  }
  if (Array.isArray(en) && Array.isArray(es)) {
    en.forEach((item, i) => collectPairs(item, es[i], out, conflicts))
    return
  }
  if (en && es && typeof en === 'object' && typeof es === 'object' && !Array.isArray(en)) {
    for (const key of Object.keys(en)) {
      if (Object.prototype.hasOwnProperty.call(es, key)) collectPairs((en as Record<string, unknown>)[key], (es as Record<string, unknown>)[key], out, conflicts)
    }
  }
}

const CONSTANTS: Pairs = new Map()
/** English strings that map to two different Spanish strings: never mapped (the test requires this list to be empty). */
export const CONSTANT_CONFLICTS: string[] = []

/**
 * Short labels (importance, scale, topic) are NOT mapped on their own: “preference” is also an enum code and
 * “Traction” may be a user label. They are only converted inside a recognized template, or formatted from structured
 * data with displayMissionPack(locale).
 */
const LABELS: Pairs = new Map()

{
  // Mission pack: every authored sentence (lang and formatters are not strings at the same path or are functions).
  const { lang: _enLang, scaleLabel: _s1, importanceLabel: _i1, topicLabel: _t1, unknownTopic: _u1, ...missionEn } = EN_TEXT
  const { lang: _esLang, scaleLabel: _s2, importanceLabel: _i2, topicLabel: _t2, unknownTopic: _u2, ...missionEs } = ES_TEXT
  collectPairs(missionEn, missionEs, CONSTANTS, CONSTANT_CONFLICTS)
  const labels = (t: MissionText) => ({ scaleLabel: t.scaleLabel, importanceLabel: t.importanceLabel, topicLabel: t.topicLabel, unknownTopic: t.unknownTopic })
  collectPairs(labels(EN_TEXT), labels(ES_TEXT), LABELS, CONSTANT_CONFLICTS)
  // Geology pack: interface-visible constants only. exportDescription, exportHowToRead and wrapper are export metadata
  // whose wording is version-specific (“export 1.1.0” vs “M8 1.0”), so they are never paired.
  const pick = (g: GeologyText) => ({
    availabilityLabel: g.availabilityLabel, purposeLabel: g.purposeLabel, limits: g.limits, excludedReason: g.excludedReason,
    missingSite: g.missingSite, noFullEvaluation: g.noFullEvaluation, notice: g.notice, scopeNote: g.scopeNote,
  })
  collectPairs(pick(GEO_EN), pick(GEO_ES), CONSTANTS, CONSTANT_CONFLICTS)
  for (const text of CONSTANT_CONFLICTS) CONSTANTS.delete(text)
}

const constant = (text: string): string | null => CONSTANTS.get(text) ?? null

// ---- Converters for template holes -----------------------------------------------------------------------------------

/** Converts the English rendering of a hole to its Spanish rendering, or null when the fragment is not of that kind. */
type Hole = (en: string) => string | null

/** User-authored text or source evidence: kept verbatim (non-empty). */
const keep: Hole = (text) => (text.length > 0 ? text : null)

/** EN fmtNumber output (en-US grouping from 4 digits, decimal point, exponent kept) → frozen ES fmtNumber output. */
export function numberEnToEs(text: string): string | null {
  if (/^-?\d+(?:\.\d+)?e[+-]\d+$/i.test(text)) return text.replace('.', ',')
  const m = /^(-?)(\d{1,3}(?:,\d{3})+|\d{1,3})(?:\.(\d+))?$/.exec(text)
  if (!m) return null
  const int = m[2].replace(/,/g, '')
  const grouped = int.length >= 5 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : int // es-CL groups from 5 digits
  return `${m[1]}${grouped}${m[3] ? `,${m[3]}` : ''}`
}

const UNITS = ['degree', 'meter', 'percent', 'km2', 'ratio', 'iso_alpha2'] as const
/** Unit suffixes of each pack, derived from the packs themselves (fmtQuantity(1, unit) minus the number). */
const SUFFIXES: Array<{ en: string; es: string }> = UNITS
  .map((unit) => ({ en: EN_TEXT.fmtQuantity(1, unit).slice(1), es: ES_TEXT.fmtQuantity(1, unit).slice(1) }))
  .filter((s) => s.en !== '')
  .sort((a, b) => b.en.length - a.en.length)

/** EN fmtQuantity → ES fmtQuantity. Unknown units are printed “ <unit>” by both packs. */
const quantity: Hole = (text) => {
  for (const s of SUFFIXES) {
    if (!text.endsWith(s.en)) continue
    const n = numberEnToEs(text.slice(0, text.length - s.en.length))
    if (n !== null) return `${n}${s.es}`
  }
  const bare = numberEnToEs(text)
  if (bare !== null) return bare
  const other = /^(\S+) ([A-Za-z_][\w]*)$/.exec(text)
  const n = other ? numberEnToEs(other[1]) : null
  return other && n !== null ? `${n} ${other[2]}` : null
}

const number: Hole = numberEnToEs

// ---- Templates ------------------------------------------------------------------------------------------------------

/** Sentinel for hole i: control characters never present in record text. */
const S = (i: number): string => `\u0001${i}\u0002`

interface Template {
  /** English literals around the holes (holes.length + 1 parts). */
  parts: string[]
  /** Hole index (into `holes`) at each position of `parts`. */
  order: number[]
  holes: Hole[]
  /** Spanish output with sentinels S(i). */
  es: string
}

/**
 * Builds a template from two renderings that contain the sentinels S(0)…S(n-1) (directly, or after `probes` replaced a
 * known rendering of a probe value by its sentinel).
 */
function template(enOut: string, esOut: string, holes: Hole[], probes: Array<{ en: string; es: string; hole: number }> = []): Template {
  let en = enOut
  let es = esOut
  for (const p of probes) {
    if (!en.includes(p.en) || !es.includes(p.es)) throw new Error(`recordText: probe “${p.en}” / “${p.es}” not found while building a template.`)
    en = en.split(p.en).join(S(p.hole))
    es = es.split(p.es).join(S(p.hole))
  }
  const parts: string[] = []
  const order: number[] = []
  const re = /\u0001(\d+)\u0002/g
  let last = 0
  for (let m = re.exec(en); m; m = re.exec(en)) {
    parts.push(en.slice(last, m.index))
    order.push(Number(m[1]))
    last = m.index + m[0].length
  }
  parts.push(en.slice(last))
  return { parts, order, holes, es }
}

/** Backtracking match of `text` against a template; returns the filled Spanish text or null. */
function apply(t: Template, text: string): string | null {
  if (!text.startsWith(t.parts[0])) return null
  if (t.order.length === 0) return text === t.parts[0] ? t.es : null
  const values = new Map<number, string>()
  const go = (k: number, pos: number): boolean => {
    const hole = t.order[k]
    const lit = t.parts[k + 1]
    const convert = t.holes[hole]
    const tryFrag = (end: number, next: number, final: boolean): boolean => {
      const converted = convert(text.slice(pos, end))
      if (converted === null) return false
      const previous = values.get(hole)
      if (previous !== undefined && previous !== converted) return false
      values.set(hole, converted)
      if (final || go(k + 1, next)) return true
      if (previous === undefined) values.delete(hole)
      return false
    }
    if (k === t.order.length - 1) {
      return text.endsWith(lit) && text.length - lit.length >= pos && tryFrag(text.length - lit.length, text.length, true)
    }
    for (let at = text.indexOf(lit, pos); at !== -1; at = at >= text.length ? -1 : text.indexOf(lit, at + 1)) {
      if (tryFrag(at, at + lit.length, false)) return true
    }
    return false
  }
  if (!go(0, t.parts[0].length)) return null
  return t.es.replace(/\u0001(\d+)\u0002/g, (_, i: string) => values.get(Number(i)) ?? '')
}

const firstMatch = (templates: readonly Template[], text: string): string | null => {
  for (const t of templates) {
    const out = apply(t, text)
    if (out !== null) return out
  }
  return null
}

// Observed values: “—”, a code such as CL, a quantity, or a fraction with its percentage.
const RATIO_PROBE = 0.123
const RATIO = template(EN_TEXT.fmtObserved(RATIO_PROBE, 'ratio'), ES_TEXT.fmtObserved(RATIO_PROBE, 'ratio'), [number, number], [
  { en: EN_TEXT.fmtNumber(RATIO_PROBE), es: ES_TEXT.fmtNumber(RATIO_PROBE), hole: 0 },
  { en: EN_TEXT.fmtNumber(12.3), es: ES_TEXT.fmtNumber(12.3), hole: 1 },
])
const observed: Hole = (text) => {
  if (text === EN_TEXT.fmtObserved(null, null)) return ES_TEXT.fmtObserved(null, null)
  if (/^[A-Z]{2,3}$/.test(text)) return text
  return apply(RATIO, text) ?? quantity(text)
}

// Conditions: “one of CL, AR”, “between 1 and 5 m”, “≤ 2.3°”, “≥ 95%”.
const CONDITIONS: Template[] = [
  template(EN_TEXT.describeCondition({ operator: 'in', value: [S(0)], unit: 'iso_alpha2' }), ES_TEXT.describeCondition({ operator: 'in', value: [S(0)], unit: 'iso_alpha2' }), [keep]),
  template(EN_TEXT.describeCondition({ operator: 'between', value: [1.25, 2.75], unit: 'degree' }), ES_TEXT.describeCondition({ operator: 'between', value: [1.25, 2.75], unit: 'degree' }), [number, quantity], [
    { en: EN_TEXT.fmtQuantity(2.75, 'degree'), es: ES_TEXT.fmtQuantity(2.75, 'degree'), hole: 1 },
    { en: EN_TEXT.fmtNumber(1.25), es: ES_TEXT.fmtNumber(1.25), hole: 0 },
  ]),
  ...(['<=', '>='] as const).map((operator) => template(
    EN_TEXT.describeCondition({ operator, value: 1.25, unit: 'degree' }), ES_TEXT.describeCondition({ operator, value: 1.25, unit: 'degree' }), [quantity],
    [{ en: EN_TEXT.fmtQuantity(1.25, 'degree'), es: ES_TEXT.fmtQuantity(1.25, 'degree'), hole: 0 }],
  )),
]
const condition: Hole = (text) => firstMatch(CONDITIONS, text)

// Effective condition: “≤ 2.3° · Full window (~20 km)” or “Not measured — detail”.
const label = (text: string): string | null => LABELS.get(text) ?? null
const scaleLabel: Hole = (text) => (Object.values(EN_TEXT.scaleLabel).includes(text) ? label(text) : null)
const unmeasured = (detail: string): UnmeasuredRequirement => ({ kind: 'unmeasured', detail, requirement_id: '', label: '', importance: 'critical', origin: 'user', confirmed: true, source_quote: null, topic_id: '' })
const EFFECTIVE: Template[] = [
  template(`${S(0)} · ${S(1)}`, `${S(0)} · ${S(1)}`, [condition, scaleLabel]),
  template(EN_TEXT.describeEffective(unmeasured(S(0))), ES_TEXT.describeEffective(unmeasured(S(0))), [keep]),
  template(EN_TEXT.describeEffective(unmeasured('')), ES_TEXT.describeEffective(unmeasured('')), []),
]
const effective: Hole = (text) => firstMatch(EFFECTIVE, text)

const ofMap = (map: Readonly<Record<string, string>>, pairs: (text: string) => string | null): Hole => (text) => (Object.values(map).includes(text) ? pairs(text) : null)
const topic: Hole = (text) => (text === EN_TEXT.unknownTopic ? ES_TEXT.unknownTopic : ofMap(EN_TEXT.topicLabel, label)(text))
const importance: Hole = ofMap(EN_TEXT.importanceLabel, label)
const metricScaleNote: Hole = ofMap(EN_TEXT.metricScaleNote, constant)
const availability: Hole = ofMap(GEO_EN.availabilityLabel, constant)
/** A nested record text (for example the reason inside “what would change”). */
const nested: Hole = (text) => translateRecordText(text)

// Geology formats: honest coverage boundaries and scale labels.
/** EN coverage (“0%”, “<0.1%”, “43.2%”, “>99.9%”, “100%”) → frozen ES coverage (“0 %”, “<0,1 %”, “43,2 %”…). */
export const coverageEnToEs: Hole = (text) => {
  const m = /^([<>]?)(\d{1,3})(?:\.(\d))?%$/.exec(text)
  return m ? `${m[1]}${m[2]}${m[3] ? `,${m[3]}` : ''} %` : null
}
const scale: Hole = (text) => {
  const m = /^1:(\d{1,3}(?:,\d{3})*)$/.exec(text)
  return m ? GEO_ES.formatScaleLabel(Number(m[1].replace(/,/g, ''))) : null
}
const count: Hole = (text) => (/^\d+$/.test(text) ? text : null)
/** Unit name inside a guidance text: kept verbatim; the generic “unnamed unit” fallback is the pack's own wording. */
const UNNAMED_EN = /“(.*)”/.exec(GEO_EN.purposeText('confirmar_descripcion_ausente', { name: null, code: null }, { gapFraction: 0, unitCount: 0, scaleDenominator: 1 }))?.[1] ?? ''
const UNNAMED_ES = /«(.*)»/.exec(GEO_ES.purposeText('confirmar_descripcion_ausente', { name: null, code: null }, { gapFraction: 0, unitCount: 0, scaleDenominator: 1 }))?.[1] ?? ''
const unitName: Hole = (text) => (text === UNNAMED_EN ? UNNAMED_ES : keep(text))

const PURPOSES = ['verificar_hueco_cartografico', 'resolver_ambiguedad', 'confirmar_descripcion_ausente', 'correspondencia_mapa_terreno', 'caracterizar_material_superficial', 'diversidad_litologica_muestreo', 'contrastar_escala'] as const
const COVERAGE_PROBE = 0.4321
const COUNT_PROBE = 9731
const SCALE_PROBE = 7654321

/** Guidance texts: one template per purpose, with and without a unit code. Holes: 0 name, 1 code, 2 coverage, 3 count, 4 scale. */
function purposeTemplates(): Template[] {
  const out: Template[] = []
  const ctx = { gapFraction: COVERAGE_PROBE, unitCount: COUNT_PROBE, scaleDenominator: SCALE_PROBE }
  for (const purpose of PURPOSES) {
    for (const withCode of [true, false]) {
      const unit: UnitIdentity = { name: S(0), code: withCode ? S(1) : null, fraction_in_ambiguity: COVERAGE_PROBE }
      const en = GEO_EN.purposeText(purpose, unit, ctx)
      const es = GEO_ES.purposeText(purpose, unit, ctx)
      const probes = [
        { en: GEO_EN.formatCoverage(COVERAGE_PROBE), es: GEO_ES.formatCoverage(COVERAGE_PROBE), hole: 2 },
        { en: GEO_EN.formatScaleLabel(SCALE_PROBE), es: GEO_ES.formatScaleLabel(SCALE_PROBE), hole: 4 },
        { en: String(COUNT_PROBE), es: String(COUNT_PROBE), hole: 3 },
      ].filter((p) => en.includes(p.en))
      // A purpose without a unit renders the same with and without a code: keep a single template.
      if (!withCode && !en.includes(S(0))) continue
      out.push(template(en, es, [unitName, keep, coverageEnToEs, count, scale], probes))
    }
  }
  return out
}

const fn1 = (en: (a: string) => string, es: (a: string) => string, hole: Hole): Template => template(en(S(0)), es(S(0)), [hole])

const TEMPLATES: readonly Template[] = [
  // Mission records (evaluate.ts, explanation.ts, geometry notes).
  template(EN_TEXT.snapshotScaleNote(S(0), S(1)), ES_TEXT.snapshotScaleNote(S(0), S(1)), [metricScaleNote, keep]),
  template(EN_TEXT.observedReason(S(0), true, S(1)), ES_TEXT.observedReason(S(0), true, S(1)), [observed, condition]),
  template(EN_TEXT.observedReason(S(0), false, S(1)), ES_TEXT.observedReason(S(0), false, S(1)), [observed, condition]),
  fn1(EN_TEXT.unmeasuredReason, ES_TEXT.unmeasuredReason, topic),
  template(EN_TEXT.wouldChangeFailed(S(0), S(1)), ES_TEXT.wouldChangeFailed(S(0), S(1)), [keep, observed]),
  template(EN_TEXT.wouldChangeMeasure(S(0), S(1), S(2)), ES_TEXT.wouldChangeMeasure(S(0), S(1), S(2)), [keep, importance, nested]),
  fn1(EN_TEXT.scopeNotes.sectorMissing, ES_TEXT.scopeNotes.sectorMissing, keep),
  fn1(EN_TEXT.verification.confirmFailure, ES_TEXT.verification.confirmFailure, keep),
  fn1(EN_TEXT.verification.measure, ES_TEXT.verification.measure, keep),
  // Geology records (guidance.ts).
  template(GEO_EN.limits.regional(S(0), S(1)), GEO_ES.limits.regional(S(0), S(1)), [scale, keep]),
  fn1(GEO_EN.limits.status, GEO_ES.limits.status, availability),
  fn1(GEO_EN.limits.unmapped, GEO_ES.limits.unmapped, coverageEnToEs),
  fn1(GEO_EN.limits.ambiguous, GEO_ES.limits.ambiguous, coverageEnToEs),
  fn1(GEO_EN.limits.unusable, GEO_ES.limits.unusable, coverageEnToEs),
  fn1(GEO_EN.limits.withoutDescription, GEO_ES.limits.withoutDescription, coverageEnToEs),
  ...purposeTemplates(),
  // Generic shapes last: “<label>: <effective condition>” (RequirementResult.required) and a bare effective condition.
  template(`${S(0)}: ${S(1)}`, `${S(0)}: ${S(1)}`, [keep, effective]),
  ...EFFECTIVE.slice(1),
]

/** Spanish wording of an English record text, or null when it is not a record text this layer knows. */
export function translateRecordText(text: string): string | null {
  return constant(text) ?? firstMatch(TEMPLATES, text)
}

/**
 * Text of a deterministic record as it must be SHOWN in a language. English (the record language) is returned
 * unchanged; Spanish returns the frozen Spanish pack wording of the same fact, or the original when the text is not a
 * known record text (user-authored text, source evidence, IDs).
 */
export function displayRecordText(text: string, locale: Locale = getLocale()): string {
  return locale === 'es' ? (translateRecordText(text) ?? text) : text
}

export function displayRecordTexts(items: readonly string[], locale: Locale = getLocale()): string[] {
  return items.map((item) => displayRecordText(item, locale))
}

/**
 * Display text of a verification item in a language. Snapshot field checks (`<site_id>|fc|<n>`) are source evidence:
 * English rendering in `en`, the original in `es`. Generated instructions (`<site_id>|req|<requirement_id>`) are record
 * text: unchanged in `en`, the Spanish pack wording in `es` (the user's label stays exactly as written).
 */
export function displayVerificationText(item: { id: string; site_id: string; text: string }, locale: Locale = getLocale()): string {
  if (locale === 'en') return verificationDisplayText(item)
  const fieldCheck = item.id.startsWith(`${item.site_id}|fc|`) && /^\d+$/.test(item.id.slice(item.site_id.length + 4))
  return fieldCheck ? item.text : displayRecordText(item.text, locale)
}
