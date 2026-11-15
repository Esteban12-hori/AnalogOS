/**
 * Solo para tests del motor (Node): lee el snapshot real y el fixture de paridad desde disco.
 * No lo importa ningún código de la app.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CandidateSite, MissionProfile } from '../../domain/contracts'
import { assertSnapshotContracts } from '../../domain/snapshotContracts'

export const REPO_ROOT = resolve(__dirname, '../../../../..')

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, path), 'utf8')) as unknown
}

/** Snapshot v2 validado con los mismos contratos que la app (artifacts/science-v2). */
export function loadSnapshotV2(): { candidates: CandidateSite[]; profile: MissionProfile } {
  const candidates = readJson('artifacts/science-v2/candidate-details.json')
  const manifest = readJson('artifacts/science-v2/manifest.json')
  const profile = readJson('artifacts/science-v2/mission-profile.json')
  assertSnapshotContracts(candidates, manifest, profile)
  return { candidates, profile: profile as MissionProfile }
}

export function readRepoJson<T>(path: string): T {
  return readJson(path) as T
}
