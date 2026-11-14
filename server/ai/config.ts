// Configuración solo-servidor. La clave nunca se serializa ni se registra.
export const DEFAULT_MODEL = 'claude-sonnet-5-5'
export const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages' // host fijo: ninguna URL viene del cliente
export const ANTHROPIC_VERSION = '2023-06-01'

export type EnvLike = Record<string, string | undefined>

export interface AiConfig {
  readonly apiKey: string | null
  readonly model: string
  readonly timeoutMs: number
  readonly allowedOrigins: ReadonlySet<string>
  readonly allowedHosts: ReadonlySet<string>
  readonly production: boolean
  readonly keyConfigured: boolean
}

const MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/

function origins(list: string | undefined): string[] {
  return (list ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((s) => {
      try {
        const u = new URL(s)
        return u.protocol === 'https:' || u.protocol === 'http:' ? [u.origin] : []
      } catch {
        return []
      }
    })
}

function host(v: string | undefined): string[] {
  const t = (v ?? '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  return t ? [t.toLowerCase()] : []
}

export function readAiConfig(env: EnvLike): AiConfig {
  const key = (env.ANTHROPIC_API_KEY ?? '').trim()
  const model = (env.ANTHROPIC_MODEL ?? '').trim() || DEFAULT_MODEL
  const timeout = Number.parseInt(env.ANALOGOS_AI_TIMEOUT_MS ?? '', 10)
  const config: AiConfig = {
    apiKey: key && MODEL_RE.test(model) ? key : null, // modelo mal formado => IA no disponible, no se adivina
    model,
    timeoutMs: Number.isFinite(timeout) ? Math.min(Math.max(timeout, 1000), 55_000) : 20_000,
    allowedOrigins: new Set(origins(env.ANALOGOS_AI_ALLOWED_ORIGINS)),
    allowedHosts: new Set([
      ...host(env.VERCEL_URL),
      ...host(env.VERCEL_BRANCH_URL),
      ...host(env.VERCEL_PROJECT_PRODUCTION_URL),
    ]),
    production: env.VERCEL_ENV === 'production',
    keyConfigured: Boolean(key),
  }
  // La clave no debe aparecer en JSON.stringify / console.log accidentales.
  Object.defineProperty(config, 'apiKey', { value: config.apiKey, enumerable: false })
  return config
}
