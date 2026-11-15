/**
 * Language API WITHOUT React (docs/I18N.md §3): for pure functions and for modules that also run in Node (Vite plugin,
 * content/shell.ts, features/boot/bootModel.ts). Components import from `i18n` (index.ts), which adds the hooks and
 * the selector. Record display (i18n/recordText.ts) and scientific text display (i18n/science.ts) are separate
 * modules so their maps only travel in the chunks that use them.
 */
export {
  DEFAULT_LOCALE,
  detectInitialLocale,
  getLocale,
  INTL_LOCALE,
  LOCALE_NAMES,
  LOCALE_QUERY_PARAM,
  LOCALE_STORAGE_KEY,
  LOCALES,
  parseLocale,
  resolveInitialLocale,
  setLocale,
  subscribeLocale,
  type Locale,
  type SetLocaleOptions,
} from './locale'
export {
  defineMessages,
  interpolate,
  placeholdersOf,
  selectPlural,
  type BoundTranslator,
  type Message,
  type Messages,
  type PluralMessage,
  type Translation,
  type Translator,
  type Vars,
} from './translate'
export {
  compareText,
  formatArea,
  formatDate,
  formatDecimal,
  formatInteger,
  formatList,
  formatMonthYear,
  formatNumber,
  formatPercent,
  formatScore,
  formatScorePercent,
  formatTime,
  MISSING_VALUE,
  withPercent,
} from './format'
