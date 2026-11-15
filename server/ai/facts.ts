// Trusted facts: versioned artifacts from the v3 snapshot, validated against the contracts on load.
// Static imports so that Vercel (nft/esbuild) bundles the JSON files with the function.
import candidates from '../../artifacts/science-v3/candidate-details.json'
import manifest from '../../artifacts/science-v3/manifest.json'
import profile from '../../artifacts/science-v3/mission-profile.json'
import { assertSnapshotContracts } from '../../shared/domain/contracts'
import type { CandidateSite, DataManifest, MissionProfile } from '../../shared/domain/contracts'
import type { EvidenceBundle } from '../../shared/mission/types'

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
