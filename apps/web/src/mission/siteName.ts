/**
 * Site names in the interface language (area mission-ui, docs/I18N.md §6). Site names are source evidence (Spanish
 * artifacts): the English interface shows the reviewed English rendering (`shortCandidateName`), the Spanish one the
 * original name. Light on purpose: the composer (main chunk) uses it.
 */
import { shortCandidateName } from '../domain/formatting'
import { getLocale, type Locale } from '../i18n/locale'

/** Fixture suffix that shortCandidateName drops (synthetic demo data, frozen Spanish literal). */
const FIXTURE_SUFFIX = ' (sintético, ubicación arbitraria)'

/** Site name as shown in the interface: the English rendering in `en`, the original name in `es`. */
export function siteName(name: string, locale: Locale = getLocale()): string {
  return locale === 'es' ? name.replace(FIXTURE_SUFFIX, '') : shortCandidateName(name)
}
