/**
 * Mission pack used to FORMAT interface text from structured data (conditions, observed values, importance and scale
 * labels) in the interface language (ADR-017): the 1.1.0 English pack in `en`, the frozen 1.0.0 Spanish pack in `es`.
 * Display only: records are always built with the pack of their own version (1.1.0). Deferred chunks only (mission,
 * Reading): it carries the frozen Spanish pack.
 */
import { EN_TEXT } from '../../../../shared/mission/text/en'
import { ES_TEXT } from '../../../../shared/mission/text/es'
import type { MissionText } from '../../../../shared/mission/text/types'
import { getLocale, type Locale } from '../i18n/locale'

export function uiPack(locale: Locale = getLocale()): MissionText {
  return locale === 'es' ? ES_TEXT : EN_TEXT
}
