/**
 * Number and date formatting for the INTERFACE ONLY, by language (en-US: 94.9 · es-CL: 94,9). Never used for JSON
 * exports, contracts, fingerprints, record text or AI payloads: those keep the exact number, the canonical unit and
 * the wording of their record version (ADR-016). No extra rounding: each function states its decimals.
 *
 * The English output is byte-identical to the en-US formatting the UI already uses (domain/formatting.ts), so an
 * owner can delegate to these functions without changing a single English string. Spanish reproduces the es-CL
 * formatting the product used before ADR-016 (git 273e5f8), including the space before “%”.
 *
 * No React. Every function takes an explicit `locale` as its last argument (static HTML, tests); by default it uses
 * the current language.
 */
import { getLocale, INTL_LOCALE, type Locale } from './locale'

const numberFormats = new Map<string, Intl.NumberFormat>()
const dateFormats = new Map<string, Intl.DateTimeFormat>()
const collators = new Map<Locale, Intl.Collator>()
const listFormats = new Map<string, Intl.ListFormat>()

function numberFormat(locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let format = numberFormats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(INTL_LOCALE[locale], options)
    numberFormats.set(key, format)
  }
  return format
}

function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let format = dateFormats.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(INTL_LOCALE[locale], options)
    dateFormats.set(key, format)
  }
  return format
}

/** Dash for a missing value: the same in both languages. */
export const MISSING_VALUE = '—'

/** Number with explicit Intl options. */
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}, locale: Locale = getLocale()): string {
  return numberFormat(locale, options).format(value)
}

/** 0–100 score (similarity, confidence, stability): FIXED 1 decimal (49.99 → “50.0” / “50,0”). */
export function formatScore(value: number | null, locale: Locale = getLocale()): string {
  return value === null ? MISSING_VALUE : formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }, locale)
}

/** Up to 1 decimal, no trailing zeros: weights, quality, magnitudes (1,234.6 / 1.234,6). */
export function formatDecimal(value: number, locale: Locale = getLocale()): string {
  return formatNumber(value, { maximumFractionDigits: 1 }, locale)
}

/** Integer with the language's grouping (do not use for years: “2,024” in English). */
export function formatInteger(value: number, locale: Locale = getLocale()): string {
  return formatNumber(value, { maximumFractionDigits: 0 }, locale)
}

/** Appends % with the language's typography: en “94.9%”, es “94,9 %”. */
export function withPercent(text: string, locale: Locale = getLocale()): string {
  return locale === 'es' ? `${text} %` : `${text}%`
}

/** 0–1 fraction as a percentage with up to 1 decimal: 0.949 → “94.9%” / “94,9 %”. */
export function formatPercent(fraction: number, locale: Locale = getLocale()): string {
  return withPercent(formatDecimal(fraction * 100, locale), locale)
}

/** 0–100 score with 1 fixed decimal and %: 94.87 → “94.9%” / “94,9 %”. */
export function formatScorePercent(value: number | null, locale: Locale = getLocale()): string {
  return value === null ? MISSING_VALUE : withPercent(formatScore(value, locale), locale)
}

/** Approximate area with two significant figures: cells are not boundaries (“≈ 450 km²”, “≈ 1,200 km²” / “≈ 1.200 km²”). */
export function formatArea(km2: number, locale: Locale = getLocale()): string {
  return `≈ ${formatInteger(Number(km2.toPrecision(2)), locale)} km²`
}

type DateInput = Date | string | number

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

/** Date with explicit Intl options; an invalid date returns the dash. */
export function formatDate(value: DateInput, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }, locale: Locale = getLocale()): string {
  const date = toDate(value)
  return Number.isNaN(date.getTime()) ? MISSING_VALUE : dateFormat(locale, options).format(date)
}

/** Local time “2:05 PM” (en) / “14:05” (es). */
export function formatTime(value: DateInput, locale: Locale = getLocale()): string {
  return formatDate(value, { hour: '2-digit', minute: '2-digit' }, locale)
}

/** Month and year in UTC (“Mar 2025” / “mar 2025”): monthly series of the artifacts. */
export function formatMonthYear(value: DateInput, locale: Locale = getLocale()): string {
  return formatDate(value, { month: 'short', year: 'numeric', timeZone: 'UTC' }, locale)
}

/** Natural list: “A, B, and C” / “A, B y C”. */
export function formatList(items: readonly string[], locale: Locale = getLocale(), type: 'conjunction' | 'disjunction' = 'conjunction'): string {
  const key = `${locale}|${type}`
  let format = listFormats.get(key)
  if (!format) {
    format = new Intl.ListFormat(INTL_LOCALE[locale], { style: 'long', type })
    listFormats.set(key, format)
  }
  return format.format(items)
}

/**
 * Alphabetical order of the language, ignoring case and accents. ONLY for alphabetical UI lists: never replace the
 * comparisons that decide place order, ranking or ties (they must not depend on the language).
 */
export function compareText(a: string, b: string, locale: Locale = getLocale()): number {
  let collator = collators.get(locale)
  if (!collator) {
    collator = new Intl.Collator(INTL_LOCALE[locale], { sensitivity: 'base' })
    collators.set(locale, collator)
  }
  return collator.compare(a, b)
}
