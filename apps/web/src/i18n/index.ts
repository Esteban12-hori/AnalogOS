/**
 * Public language API for components (docs/I18N.md §3): the React-free core plus hooks and the EN | ES selector.
 * Modules that run in Node (no React) import `i18n/core`.
 */
export * from './core'
export { liveTextIn, useLiveText, useLocale, useT, type LiveText } from './react'
export { LanguageSwitch } from './LanguageSwitch'
