/**
 * Interface formatting of snapshot figures and labels (UI only: never exports, records, fingerprints or AI payloads).
 * Numbers delegate to i18n/format (en-US / es-CL); the English output is byte-identical to the previous en-US
 * formatting (i18n/i18n.test.ts). Labels follow the current language (domain/localizedLabels.ts).
 */
import { getLocale, type Locale } from '../i18n/core'
import {
  formatArea as formatAreaIn,
  formatDecimal as formatDecimalIn,
  formatInteger,
  formatPercent as formatPercentIn,
  formatScore as formatScoreIn,
} from '../i18n/format'
import { tCommon } from '../i18n/messages/common'
import { scienceText } from '../i18n/science'
import { CRITERION_IDS, type CriterionId } from './criteria'
import type { CandidateSite, CriterionStatus, ScoreBreakdownItem } from './contracts'
import { localizedRecord } from './localizedLabels'

/** Criterion label in the current language (indexable by any string: unknown ids give undefined). */
export const criterionLabels: Record<string, string> = localizedRecord<CriterionId>(CRITERION_IDS, (id) => tCommon(`criterion.${id}`))

const CRITERION_STATUSES: readonly CriterionStatus[] = ['valid', 'missing', 'needs_calibration', 'excluded']

export const criterionStatusLabels: Record<CriterionStatus, string> = localizedRecord(CRITERION_STATUSES, (code) => tCommon(`criterionStatus.${code}`))

export const ITEM_STATUS_LABEL = criterionStatusLabels

const PROFILE_STATUSES = ['needs_calibration', 'needs_expert_review', 'optional', 'validated', 'deprecated'] as const

export const PROFILE_STATUS_LABEL: Record<string, string> = localizedRecord(PROFILE_STATUSES, (code) => tCommon(`profileStatus.${code}`))

const FEASIBILITY: readonly CandidateSite['feasibility'][] = ['unknown', 'requires_review', 'potentially_feasible', 'excluded']

export const feasibilityLabels: Record<CandidateSite['feasibility'], string> = localizedRecord(FEASIBILITY, (code) => tCommon(`feasibility.${code}`))

/** 0–100 place score (similarity, confidence, stability) with a fixed decimal (en-US 94.9 · es-CL 94,9). */
export function formatScore(value: number | null, locale: Locale = getLocale()): string {
  return formatScoreIn(value, locale)
}

/** Number with up to 1 decimal (no trailing zeros): weights, quality, magnitudes. */
export function formatDecimal(value: number, locale: Locale = getLocale()): string {
  return formatDecimalIn(value, locale)
}

/** Integer: per-criterion similarity (the exact value only in “Method”). */
export function formatWhole(value: number, locale: Locale = getLocale()): string {
  return formatInteger(value, locale)
}

export function formatArea(value: number, locale: Locale = getLocale()): string {
  // ponytail: two significant figures; the polygons are approximate cells, not boundary delineations.
  return formatAreaIn(value, locale)
}

export function formatPercent(value: number, locale: Locale = getLocale()): string {
  return formatPercentIn(value, locale)
}

export function formatRatio(value: number, locale: Locale = getLocale()): string {
  return formatDecimalIn(value, locale)
}

export function formatRawValue(item: Pick<ScoreBreakdownItem, 'raw_value' | 'unit'>, locale?: Locale): string
export function formatRawValue(value: number | string | null, unit: string, locale?: Locale): string
export function formatRawValue(
  valueOrItem: number | string | null | Pick<ScoreBreakdownItem, 'raw_value' | 'unit'>,
  unitOrLocale?: string,
  maybeLocale?: Locale,
): string {
  const isItem = typeof valueOrItem === 'object' && valueOrItem !== null
  const value = isItem ? valueOrItem.raw_value : valueOrItem
  const unit = isItem ? valueOrItem.unit : (unitOrLocale ?? '')
  const locale: Locale = (isItem ? (unitOrLocale as Locale | undefined) : maybeLocale) ?? getLocale()
  const t = tCommon.in(locale)
  if (value === null) return t('raw.none')
  if (typeof value === 'number') {
    const number = formatDecimalIn(value, locale)
    if (unit === 'ratio') return formatPercentIn(value, locale)
    if (unit === 'degree') return `${number}°`
    if (unit === 'meter') return `${number} m`
    if (unit === 'kelvin') return `${number} K`
    if (unit === 'millimeter_per_year') return `${number} ${t('unit.mmPerYear')}`
    return number
  }
  return value
}

/**
 * Display name of a site: drops the synthetic-fixture suffix. English shows the reviewed English rendering
 * (coordinates with a decimal point, W for “O”); Spanish shows the original wording (i18n/science.ts).
 */
export function shortCandidateName(name: string, locale: Locale = getLocale()): string {
  return scienceText(name.replace(' (sintético, ubicación arbitraria)', ''), locale)
}
