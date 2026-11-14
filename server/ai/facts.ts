// Hechos de confianza: artefactos versionados del snapshot v3, validados con los contratos al cargar.
// Importaciones estáticas para que Vercel (nft/esbuild) empaquete los JSON con la función.
import candidates from '../../artifacts/science-v3/candidate-details.json'
import manifest from '../../artifacts/science-v3/manifest.json'
import profile from '../../artifacts/science-v3/mission-profile.json'
import { assertSnapshotContracts } from '../../apps/web/src/domain/contracts'
import type { CandidateSite, DataManifest, MissionProfile } from '../../apps/web/src/domain/contracts'
import type { EvidenceBundle } from '../../apps/web/src/mission/types'

let cached: EvidenceBundle | null = null

export function loadTrustedBundle(): EvidenceBundle {
  if (cached) return cached
  const c: unknown = candidates
  const m: unknown = manifest
  const p: unknown = profile
  assertSnapshotContracts(c, m, p)
  cached = { candidates: c as CandidateSite[], manifest: m as DataManifest, profile: p as MissionProfile }
  return cached
}
