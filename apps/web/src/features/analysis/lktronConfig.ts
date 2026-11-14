/**
 * Configuración de lktron (ADR-010): un único flag de build, `VITE_LKTRON_URL`. Sin él, la demo
 * no hace ninguna llamada de red de IA.
 *
 * Todo lo `VITE_*` queda dentro del bundle público: por eso la URL NO puede llevar secretos. Se
 * rechaza (y lktron queda desactivado) si trae usuario/contraseña, query o fragmento (donde suele
 * esconderse una clave), o si no es https (salvo localhost para desarrollo). Las peticiones salen
 * sin credenciales ni cookies (`credentials: 'omit'`).
 */

export type LktronConfig =
  | { ok: true; url: string }
  | { ok: false; reason: 'unset' | 'invalid' | 'insecure' | 'credentials' | 'query' }

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function parseLktronUrl(raw: unknown): LktronConfig {
  if (typeof raw !== 'string' || raw.trim() === '') return { ok: false, reason: 'unset' }
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, reason: 'invalid' }
  if (url.protocol === 'http:' && !LOCAL_HOSTS.has(url.hostname)) return { ok: false, reason: 'insecure' }
  if (url.username || url.password) return { ok: false, reason: 'credentials' }
  if (url.search || url.hash || raw.includes('?') || raw.includes('#')) return { ok: false, reason: 'query' }
  return { ok: true, url: `${url.origin}${url.pathname.replace(/\/+$/, '')}` }
}
