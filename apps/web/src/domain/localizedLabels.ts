/**
 * Label records that follow the interface language (docs/I18N.md §4, ADR-017). Each value is a getter that reads the
 * catalog in the CURRENT language every time it is accessed, so the existing `LABELS[code]` API keeps working for every
 * reader (rail, globe, Reading, planner) and a component subscribed to the language (useLocale/useT) shows the new text
 * on its next render. Codes are never translated; records and exports never read these labels. Pure functions that
 * need a fixed language read the catalog with `t.in(locale)` instead.
 */
export function localizedRecord<K extends string>(codes: readonly K[], read: (code: K) => string): Readonly<Record<K, string>> {
  const record = {} as Record<K, string>
  for (const code of codes) Object.defineProperty(record, code, { enumerable: true, get: () => read(code) })
  return Object.freeze(record)
}
