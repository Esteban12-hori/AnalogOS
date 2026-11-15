/**
 * MapLibre UI strings in the interface language (docs/I18N.md §4.5). MapLibre names its focusable canvas
 * (`role="region"`) with 'Map.Title' only when the map is built, so CandidateFlatMap passes these strings to the
 * constructor and re-applies the name when the language changes. The other MapLibre strings belong to controls this
 * map does not use. Kept apart from CandidateFlatMap so that it can be tested without loading MapLibre.
 */
import type { Locale } from '../../i18n/core'
import { tGlobeMarkers } from '../../i18n/messages/globeMarkers'

export function mapUiStrings(locale: Locale): { 'Map.Title': string } {
  return { 'Map.Title': tGlobeMarkers.in(locale)('flat.canvas') }
}
