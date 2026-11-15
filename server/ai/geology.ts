// Loading of the OFFICIAL geological package on the server (M10). Client-supplied geodata or IDs are never accepted:
// the server reads the packaged file, validates it with the same validator as the web app (shared/geology) against
// the snapshot candidates, and checks the SHA-256 of the original bytes of candidate-details.json.
// Absent = geological channel unavailable (M8 intact). Present but invalid/divergent = "invalid" state,
// which is NOT confused with absent.
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

/** Candidate roots: Vercel function (cwd/LAMBDA_TASK_ROOT), local Vite server (cwd = apps/web), and relative to the module. */
function roots(only?: string): string[] {
  // With an explicit root (tests, isolated verification) only that location is checked: it never falls back to the real repository.
  if (only !== undefined) return [resolve(only)] // including the empty string (= cwd): the isolation is real
  const out: string[] = []
  // First, what is relative to the deployed package (so a cwd containing the full repository does not mask a missing file).
  if (process.env.LAMBDA_TASK_ROOT) out.push(process.env.LAMBDA_TASK_ROOT)
  if (typeof __dirname === 'string') out.push(resolve(__dirname, '..'), resolve(__dirname, '..', '..'), resolve(__dirname, '..', '..', '..'))
  out.push(process.cwd(), resolve(process.cwd(), '..', '..'))
  return [...new Set(out)]
}

// The runtime bundle is immutable (module loaded once); the key includes its identity in case it is called with a different one (tests/API).
let cached: { key: string; bundle: EvidenceBundle; value: ServerGeology } | null = null

/** Only the "ready" state is cached; absent/invalid is recomputed (cheap) so as not to pin a transient failure. */
export function loadTrustedGeology(bundle: EvidenceBundle, opts: { root?: string } = {}): ServerGeology {
  if (cached && cached.bundle === bundle && cached.key === (opts.root ?? '\u0000')) return cached.value
  const found = roots(opts.root).find((r) => existsSync(join(r, GEOLOGY_REL)) || existsSync(join(r, CANDIDATES_REL)))
  if (!found || !existsSync(join(found, GEOLOGY_REL))) return { status: 'absent' }
  const invalid = (reason: string): ServerGeology => ({ status: 'invalid', reason })
  try {
    const file = join(found, GEOLOGY_REL)
    if (statSync(file).size > GEOLOGY_MAX_BYTES) return invalid('The geology package exceeds the allowed size.')
    const candidatesFile = join(found, CANDIDATES_REL)
    if (!existsSync(candidatesFile)) return invalid('The candidates file needed to verify the geology package is missing.')
    const context = parseGeologyContext(JSON.parse(readFileSync(file, 'utf8')) as unknown, bundle.candidates)
    const sha = createHash('sha256').update(readFileSync(candidatesFile)).digest('hex')
    if (sha !== context.candidates_sha256) return invalid('The geology package does not match the bytes of the candidates snapshot.')
    const value: ServerGeology = { status: 'ready', context, fingerprint: fingerprint(context) }
    cached = { key: opts.root ?? '\u0000', bundle, value }
    return value
  } catch {
    return invalid('The geology package is not valid.')
  }
}

export function resetGeologyCache(): void {
  cached = null
}
