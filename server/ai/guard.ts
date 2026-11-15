import type { AiConfig } from './config'

export type HeaderBag = Record<string, string | string[] | undefined>

export function header(h: HeaderBag, name: string): string {
  const v = h[name.toLowerCase()]
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]'])

/**
 * Origen permitido: (a) loopback http (desarrollo/preview local; no en producción),
 * (b) hostnames Vercel del propio entorno (VERCEL_URL, VERCEL_BRANCH_URL, VERCEL_PROJECT_PRODUCTION_URL),
 * (c) orígenes exactos de ANALOGOS_AI_ALLOWED_ORIGINS, (d) mismo origen que el Host de la petición
 * (alias del despliegue). Nunca un comodín como *.vercel.app.
 */
export function isOriginAllowed(originHeader: string, hostHeader: string, config: AiConfig): boolean {
  let url: URL
  try {
    url = new URL(originHeader)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  if (config.allowedOrigins.has(url.origin)) return true
  if (url.protocol === 'http:' && LOOPBACK.has(url.hostname) && !config.production) return true
  if (url.protocol === 'https:' && config.allowedHosts.has(url.host.toLowerCase())) return true
  const reqHost = hostHeader.trim().toLowerCase()
  return url.protocol === 'https:' && reqHost !== '' && url.host.toLowerCase() === reqHost
}

/**
 * Limitador de ventana fija EN MEMORIA: por instancia, no distribuido. En serverless cada
 * instancia tiene su contador y se reinicia en cada arranque en frío; es una protección
 * básica contra pulsaciones repetidas, no una cuota fiable.
 */
export class RateLimiter {
  private readonly hits = new Map<string, { start: number; count: number }>()
  constructor(
    private readonly perKey = 8,
    private readonly windowMs = 60_000,
    private readonly globalMax = 60,
    private readonly maxKeys = 2000,
  ) {}

  check(key: string, now: number): { ok: true } | { ok: false; retryAfterSec: number } {
    if (this.hits.size > this.maxKeys) {
      for (const [k, v] of this.hits) if (now - v.start >= this.windowMs) this.hits.delete(k)
      if (this.hits.size > this.maxKeys) this.hits.clear()
    }
    const entry = (k: string) => {
      const cur = this.hits.get(k)
      if (!cur || now - cur.start >= this.windowMs) {
        const fresh = { start: now, count: 0 }
        this.hits.set(k, fresh)
        return fresh
      }
      return cur
    }
    const mine = entry(key)
    const all = entry('*global*')
    if (mine.count >= this.perKey || all.count >= this.globalMax) {
      const start = mine.count >= this.perKey ? mine.start : all.start
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((start + this.windowMs - now) / 1000)) }
    }
    mine.count += 1
    all.count += 1
    return { ok: true }
  }
}
