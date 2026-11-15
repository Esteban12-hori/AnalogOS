/**
 * Display helpers of the mission interface for records and evidence (area mission-ui, docs/I18N.md §5–§6, ADR-017).
 * Deferred chunks only (mission, reading): it carries the Spanish record packs through i18n/recordText.
 *
 * Records keep their canonical text (English 1.1.0 record text, Spanish artifact text, user text as typed). These pure
 * functions only decide how it is SHOWN in the interface language; nothing here is stored, exported or fingerprinted.
 */
import { getLocale, type Locale } from '../i18n/locale'
import { tMission } from '../i18n/messages/mission'
import { displayRecordText } from '../i18n/recordText'
import { displaySource } from '../i18n/sourceText'
import type { MetricId } from './types'

export { displayMissionMessage, displayMissionMessages } from './messages'
export { uiPack } from './pack'
export { siteName } from './siteName'

/**
 * Text that may be either record text (English pack) or source evidence (Spanish artifact): evidence claims, planned
 * source products and snapshot scale notes. English keeps the reviewed rendering of the source (displaySource);
 * Spanish maps the record wording to the frozen Spanish pack and leaves the source text in its original wording.
 */
export function mixedText(text: string, locale: Locale = getLocale()): string {
  return locale === 'es' ? displayRecordText(text, 'es') : displaySource(text)
}

/** Name of a snapshot metric in the interface language. */
export function metricLabel(id: MetricId, locale: Locale = getLocale()): string {
  return tMission.in(locale)(`metric.${id}`)
}

/** Country name of a code (Chile/Argentina); other codes are shown as they are. */
export function countryName(code: string | null, locale: Locale = getLocale()): string {
  if (code === 'CL' || code === 'AR') return tMission.in(locale)(`country.${code}`)
  return code ?? '—'
}
