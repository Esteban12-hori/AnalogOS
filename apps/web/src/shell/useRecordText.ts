/**
 * Record text (engine output) shown in the interface language, for components of the MAIN chunk (docs/I18N.md §5).
 *
 * `i18n/recordText` carries the frozen Spanish packs (~15 KB) and must not enter the initial chunk: it is loaded here on
 * demand, only when the interface is (or becomes) Spanish. English never loads it: the record text is already English
 * and the English pack is the one the UI already uses. Until the module arrives (a few ms, and always before any
 * Mission result exists) the record wording is shown as is. The record itself is never touched.
 */
import { useEffect, useState } from 'react'
import { EN_TEXT } from '../../../../shared/mission/text/en'
import type { MissionText } from '../../../../shared/mission/text/types'
import { getLocale, subscribeLocale, type Locale } from '../i18n/core'
import { useLocale } from '../i18n/react'

type RecordTextModule = typeof import('../i18n/recordText')

let loaded: RecordTextModule | null = null
let pending: Promise<RecordTextModule | null> | null = null
const listeners = new Set<() => void>()

/** Loads the Spanish display layer once (also used to preload it). Never rejects. */
export function loadRecordText(): Promise<RecordTextModule | null> {
  if (loaded) return Promise.resolve(loaded)
  pending ??= import('../i18n/recordText')
    .then((module) => {
      loaded = module
      for (const listener of [...listeners]) listener()
      return module
    })
    .catch(() => {
      pending = null
      return null
    })
  return pending
}

// A Spanish interface (from the URL, storage or the selector) preloads the layer before any result is shown.
if (typeof window !== 'undefined') {
  if (getLocale() === 'es') void loadRecordText()
  subscribeLocale(() => {
    if (getLocale() === 'es') void loadRecordText()
  })
}

export interface RecordText {
  locale: Locale
  /** Record-authored sentence (reason, required, note, limit…) in the interface language. */
  text: (text: string) => string
  /** Mission pack of the interface language for UI formatting of structured data (fmtObserved, importanceLabel…). */
  pack: MissionText
}

const ENGLISH: RecordText = { locale: 'en', text: (text) => text, pack: EN_TEXT }
const SPANISH = new WeakMap<RecordTextModule, RecordText>()

/** Pure: the display functions for a language with the module already loaded (or English until it is). Stable identity. */
export function recordTextFor(locale: Locale, module: RecordTextModule | null = loaded): RecordText {
  if (locale === 'en' || !module) return ENGLISH
  let spanish = SPANISH.get(module)
  if (!spanish) {
    spanish = { locale: 'es', text: (text) => module.displayRecordText(text, 'es'), pack: module.displayMissionPack('es') }
    SPANISH.set(module, spanish)
  }
  return spanish
}

/** Hook: subscribed to the language and to the arrival of the Spanish layer. */
export function useRecordText(): RecordText {
  const locale = useLocale()
  const [module, setModule] = useState<RecordTextModule | null>(loaded)
  useEffect(() => {
    if (locale !== 'es' || module) return
    let active = true
    const update = () => {
      if (active && loaded) setModule(loaded)
    }
    listeners.add(update)
    void loadRecordText().then(update)
    return () => {
      active = false
      listeners.delete(update)
    }
  }, [locale, module])
  return recordTextFor(locale, module)
}
