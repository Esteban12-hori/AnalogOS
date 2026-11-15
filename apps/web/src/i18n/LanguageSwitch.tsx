/**
 * EN | ES language selector of the top bar (docs/I18N.md §2, ADR-017). Two toggle buttons (`aria-pressed`) in a named
 * group: Tab reaches each one, Enter/Space chooses. Each option carries `lang` (its accessible name, “English” or
 * “Español”, is read in its own language). The buttons are not unmounted when the language changes, so focus stays
 * where it was. The change is announced in the single announcement region, already in the new language. The pre-React
 * static HTML draws the same box (content/shell.ts, `data-lang-option`).
 */
import { announce } from '../shell/announce'
import { LOCALE_NAMES, LOCALES, setLocale } from './locale'
import { tShell } from './messages/shell'
import { useLocale } from './react'
import './language-switch.css'

export function LanguageSwitch() {
  const locale = useLocale()
  return (
    <div className="lang-switch" role="group" aria-label={tShell.in(locale)('lang.group')}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          className="lang-option"
          lang={option}
          aria-pressed={option === locale}
          aria-label={LOCALE_NAMES[option]}
          title={LOCALE_NAMES[option]}
          onClick={() => {
            if (option === locale) return
            setLocale(option)
            announce(tShell.in(option)('lang.changed', { name: LOCALE_NAMES[option] }))
          }}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
