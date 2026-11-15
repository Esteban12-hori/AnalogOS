/**
 * Vitest setup (vite.config.ts → test.setupFiles). The app starts in English and the existing tests check English
 * text: every file starts in 'en' and every test restores it when it finishes, without touching localStorage or the
 * URL. Spanish tests switch explicitly (setLocale('es', { persist: false, updateUrl: false })) or use `t.in('es')` and
 * the `locale` parameter of pure functions.
 */
import { afterEach } from 'vitest'
import { setLocale } from './locale'

const quiet = { persist: false, updateUrl: false } as const

setLocale('en', quiet)
afterEach(() => setLocale('en', quiet))
