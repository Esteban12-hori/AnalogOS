import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertSnapshotContracts, type CandidateSite, type DataManifest, type MissionProfile } from '../domain/contracts'
import { formatArea, formatRawValue, formatScore, shortCandidateName } from '../domain/formatting'

const root = resolve(__dirname, '../../../..')

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8')) as unknown
}

describe('snapshot demo', () => {
  const candidatesData = readJson('artifacts/demo/candidate-details.json')
  const manifestData = readJson('artifacts/demo/manifest.json')
  const profileData = readJson('artifacts/demo/mission-profile.json')

  it('validates candidates, manifest and profile against the shared contracts', () => {
    expect(() => assertSnapshotContracts(candidatesData, manifestData, profileData)).not.toThrow()
  })

  it('keeps the three candidates unambiguously labeled as fixtures', () => {
    assertSnapshotContracts(candidatesData, manifestData, profileData)
    expect(candidatesData).toHaveLength(3)
    expect(candidatesData.every((candidate) => candidate.status === 'fixture')).toBe(true)
    expect(candidatesData.every((candidate) => candidate.limitations[0].includes('FIXTURE'))).toBe(true)
  })

  it('keeps snapshot and profile versions in sync', () => {
    assertSnapshotContracts(candidatesData, manifestData, profileData)
    const manifest = manifestData as DataManifest
    const profile = profileData as MissionProfile
    const candidates = candidatesData as CandidateSite[]
    expect(candidates.every((candidate) => candidate.data_snapshot_version === manifest.snapshot_version)).toBe(true)
    expect(candidates.every((candidate) => candidate.profile_version === profile.version)).toBe(true)
  })

  it('includes complete, partial and insufficient cases to exercise the UI', () => {
    assertSnapshotContracts(candidatesData, manifestData, profileData)
    const candidates = candidatesData as CandidateSite[]
    expect(candidates.some((candidate) => candidate.similarity === null)).toBe(true)
    expect(candidates.some((candidate) => candidate.score_breakdown.some((item) => item.status === 'missing'))).toBe(true)
    expect(candidates.some((candidate) => candidate.score_breakdown.every((item) => item.status === 'valid'))).toBe(true)
  })
})

describe('v2 precision scientific snapshot', () => {
  const candidatesData = readJson('artifacts/science-v2/candidate-details.json')
  const manifestData = readJson('artifacts/science-v2/manifest.json')
  const profileData = readJson('artifacts/science-v2/mission-profile.json')

  it('validates contracts and uses NASADEM, Copernicus and the HLS inventory', () => {
    assertSnapshotContracts(candidatesData, manifestData, profileData)
    const candidates = candidatesData as CandidateSite[]
    const manifest = manifestData as DataManifest
    const ids = manifest.datasets.map((dataset) => dataset.dataset_id)
    expect(ids).toContain('copernicus-sentinel2-l2a-surface-2025-v1')
    expect(ids).toContain('nasa-earthdata-hls-s30-inventory-2025-v1')
    expect(ids.some((id) => id.startsWith('nasadem-'))).toBe(true)
    expect(candidates.every((candidate) => candidate.confidence > 70)).toBe(true)
  })

  it('keeps the v2 ranking reproducible', () => {
    assertSnapshotContracts(candidatesData, manifestData, profileData)
    const candidates = [...candidatesData as CandidateSite[]]
      .sort((a, b) => (b.similarity ?? -1) - (a.similarity ?? -1))
    expect(candidates.map((candidate) => candidate.site_id)).toEqual([
      'cl-pampa-yungay-screening',
      'cl-domeyko-interior-screening',
      'cl-pampa-maria-elena-screening',
    ])
  })
})

describe('preliminary scientific snapshot', () => {
  const candidatesData = readJson('artifacts/science-v1/candidate-details.json')
  const manifestData = readJson('artifacts/science-v1/manifest.json')
  const profileData = readJson('artifacts/science-v1/mission-profile.json')

  it('validates all contracts and keeps versions in sync', () => {
    assertSnapshotContracts(candidatesData, manifestData, profileData)
    const candidates = candidatesData as CandidateSite[]
    const manifest = manifestData as DataManifest
    expect(candidates).toHaveLength(3)
    expect(candidates.every((candidate) => candidate.status === 'candidate')).toBe(true)
    expect(candidates.every((candidate) => candidate.data_snapshot_version === manifest.snapshot_version)).toBe(true)
  })

  it('uses MOLA, SRTM and POWER sources and keeps uncertainty visible', () => {
    assertSnapshotContracts(candidatesData, manifestData, profileData)
    const candidates = candidatesData as CandidateSite[]
    const manifest = manifestData as DataManifest
    const ids = manifest.datasets.map((dataset) => dataset.dataset_id)
    expect(ids).toContain('nasa-pds-mola-meg128-jezero-v1')
    expect(ids).toContain('nasa-power-climatology-points-v1')
    expect(ids.some((id) => id.startsWith('srtm-'))).toBe(true)
    expect(candidates.every((candidate) => candidate.feasibility === 'requires_review')).toBe(true)
    expect(candidates.every((candidate) => candidate.confidence < 70)).toBe(true)
    expect(candidates.every((candidate) => candidate.warnings[0].includes('SCREENING'))).toBe(true)
  })
})

describe('presentation format', () => {
  it('formats scores, areas and units without inventing precision', () => {
    expect(formatScore(null)).toBe('—')
    expect(formatArea(1512.4)).toContain('km²')
    expect(formatRawValue(0.71, 'ratio')).toContain('%')
    expect(formatRawValue(6.5, 'degree')).toContain('°')
    expect(shortCandidateName('Fixture A (sintético, ubicación arbitraria)')).toBe('Fixture A')
  })
})
