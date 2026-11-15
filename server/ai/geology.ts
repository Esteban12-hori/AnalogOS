// Carga del paquete geológico OFICIAL en el servidor (M10). Nunca se aceptan geodatos ni IDs del cliente:
// el servidor lee el archivo empaquetado, lo valida con el mismo validador que la web (shared/geology) contra
// los candidatos del snapshot, y comprueba el SHA-256 de los bytes originales de candidate-details.json.
// Ausente = canal geológico no disponible (M8 intacto). Presente pero inválido/divergente = estado «invalid»,
// que NO se confunde con ausente.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseGeologyContext, type GeologyContext } from '../../shared/geology/context'
import { fingerprint } from '../../shared/mission/fingerprint'
import type { EvidenceBundle } from '../../shared/mission/types'

export const GEOLOGY_REL = join('artifacts', 'geology-context-v1', 'index.json')
export const CANDIDATES_REL = join('artifacts', 'science-v3', 'candidate-details.json')
export const GEOLOGY_MAX_BYTES = 2 * 1024 * 1024

export type ServerGeology =
  | { status: 'ready'; context: GeologyContext; fingerprint: string }
  | { status: 'absent' }
  | { status: 'invalid'; reason: string }

/** Raíces candidatas: función Vercel (cwd/LAMBDA_TASK_ROOT), servidor local de Vite (cwd = apps/web) y relativo al módulo. */
function roots(only?: string): string[] {
  // Con raíz explícita (pruebas, verificación aislada) solo se mira ahí: nunca se cae al repositorio real.
  if (only !== undefined) return [resolve(only)] // incluida la cadena vacía (= cwd): el aislamiento es real
  const out: string[] = []
  // Primero lo relativo al paquete desplegado (así un cwd con el repositorio completo no enmascara un archivo faltante).
  if (process.env.LAMBDA_TASK_ROOT) out.push(process.env.LAMBDA_TASK_ROOT)
  if (typeof __dirname === 'string') out.push(resolve(__dirname, '..'), resolve(__dirname, '..', '..'), resolve(__dirname, '..', '..', '..'))
  out.push(process.cwd(), resolve(process.cwd(), '..', '..'))
  return [...new Set(out)]
}

// El bundle de runtime es inmutable (módulo cargado una vez); la clave incluye su identidad por si se llama con otro (tests/API).
let cached: { key: string; bundle: EvidenceBundle; value: ServerGeology } | null = null

/** Solo se cachea el estado «ready»; ausente/inválido se recalcula (barato) para no fijar un fallo transitorio. */
export function loadTrustedGeology(bundle: EvidenceBundle, opts: { root?: string } = {}): ServerGeology {
  if (cached && cached.bundle === bundle && cached.key === (opts.root ?? '\u0000')) return cached.value
  const found = roots(opts.root).find((r) => existsSync(join(r, GEOLOGY_REL)) || existsSync(join(r, CANDIDATES_REL)))
  if (!found || !existsSync(join(found, GEOLOGY_REL))) return { status: 'absent' }
  const invalid = (reason: string): ServerGeology => ({ status: 'invalid', reason })
  try {
    const file = join(found, GEOLOGY_REL)
    if (statSync(file).size > GEOLOGY_MAX_BYTES) return invalid('El paquete geológico excede el tamaño permitido.')
    const candidatesFile = join(found, CANDIDATES_REL)
    if (!existsSync(candidatesFile)) return invalid('Falta el archivo de candidatos para verificar el paquete geológico.')
    const context = parseGeologyContext(JSON.parse(readFileSync(file, 'utf8')) as unknown, bundle.candidates)
    const sha = createHash('sha256').update(readFileSync(candidatesFile)).digest('hex')
    if (sha !== context.candidates_sha256) return invalid('El paquete geológico no corresponde a los bytes del snapshot de candidatos.')
    const value: ServerGeology = { status: 'ready', context, fingerprint: fingerprint(context) }
    cached = { key: opts.root ?? '\u0000', bundle, value }
    return value
  } catch {
    return invalid('El paquete geológico no es válido.')
  }
}

export function resetGeologyCache(): void {
  cached = null
}
