/**
 * Compile-time proof that catalogs cannot drift (checked by `tsc --noEmit` in `npm run build`; never imported by the
 * app). Each `@ts-expect-error` fails the build if the corresponding mistake ever starts compiling.
 */
import { defineMessages } from './translate'

export const parityOk = defineMessages({
  en: { a: 'A', n: { one: '{count} item', other: '{count} items' } },
  es: { a: 'A (es)', n: { one: '{count} elemento', other: '{count} elementos' } },
})

export const missingKey = defineMessages({
  en: { a: 'A', b: 'B' },
  // @ts-expect-error Spanish must have every English key.
  es: { a: 'A (es)' },
})

export const extraKey = defineMessages({
  en: { a: 'A' },
  // @ts-expect-error Spanish cannot add keys that English does not have.
  es: { a: 'A (es)', b: 'B (es)' },
})

export const wrongShape = defineMessages({
  en: { n: { one: '{count} item', other: '{count} items' } },
  // @ts-expect-error A plural in English must be a plural in Spanish.
  es: { n: '{count} elementos' },
})

// @ts-expect-error Unknown keys do not compile.
parityOk('missing')
// @ts-expect-error A plural needs { count }.
parityOk('n')
parityOk('n', { count: 2 })
