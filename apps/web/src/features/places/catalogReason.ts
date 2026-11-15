/**
 * Unavailability reason of the ◆ catalog in the interface language. The loader keeps the canonical English sentence in
 * its state (referenceAnalogs.ts, analogCatalog.ts); only the fixed sentences are shown translated. A validator detail
 * (technical) is shown as is (docs/I18N.md §11).
 */
import { getLocale, type Locale } from '../../i18n/core'
import { tPlaces } from '../../i18n/messages/places'

const FIXED = ['reason.catalogLoad', 'reason.catalogInvalid'] as const

export function catalogReason(reason: string, locale: Locale = getLocale()): string {
  const english = tPlaces.in('en')
  const key = FIXED.find((candidate) => english(candidate) === reason)
  return key ? tPlaces.in(locale)(key) : reason
}
