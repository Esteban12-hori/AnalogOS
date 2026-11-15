/**
 * Display of the scientific text carried by the artifacts (ADR-016 §3, ADR-017). The artifacts are Spanish evidence
 * and are never modified:
 * - English interface: the reviewed English rendering of i18n/sourceText.ts (or the original when there is none) and
 *   the labeled English glosses of i18n/geologyGloss.ts, exactly as before ADR-017.
 * - Spanish interface: the ORIGINAL wording, without going through the English map, without glosses and without the
 *   “original Spanish wording” mark (the page itself is Spanish).
 *
 * The maps themselves (sourceText.ts, geologyGloss.ts) belong to the ai-science area (docs/I18N.md §7); this module is
 * the locale-aware entry point that components use instead of calling displaySource directly.
 */
import { unitDescriptionEn, unitNameEn } from './geologyGloss'
import { getLocale, type Locale } from './locale'
import { displaySource, ORIGINAL_WORDING_MARK } from './sourceText'

/** Artifact text as shown in a language: English rendering in `en`, the original in `es`. */
export function scienceText(original: string, locale: Locale = getLocale()): string {
  return locale === 'es' ? original : displaySource(original)
}

export function scienceTexts(items: readonly string[], locale: Locale = getLocale()): string[] {
  return items.map((item) => scienceText(item, locale))
}

/**
 * `lang` attribute for an artifact text whose Spanish provenance is KNOWN (an official unit description, a Spanish
 * bibliographic title) and that is shown in its original wording: `es` inside the English interface, nothing in the
 * Spanish one (it inherits `<html lang="es">`). Never use it to guess the language of unknown text.
 */
export function knownSpanishLang(locale: Locale = getLocale()): 'es' | undefined {
  return locale === 'es' ? undefined : 'es'
}

/** Mark appended to known-Spanish text left untranslated in the English interface; empty in Spanish. */
export function originalWordingMark(locale: Locale = getLocale()): string {
  return locale === 'es' ? '' : ORIGINAL_WORDING_MARK
}

/** Labeled English gloss of an official unit name (English interface only); null in Spanish or without a gloss. */
export function unitNameGloss(name: string | null, locale: Locale = getLocale()): string | null {
  return locale === 'es' ? null : unitNameEn(name)
}

/** Labeled English gloss of an official unit description (English interface only); null in Spanish or without one. */
export function unitDescriptionGloss(description: string | null, locale: Locale = getLocale()): string | null {
  return locale === 'es' ? null : unitDescriptionEn(description)
}
