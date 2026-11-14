import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertSnapshotContracts } from '../domain/contracts'

const root = resolve(__dirname, '../../../..')
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const candidates = read('artifacts/science-v2/candidate-details.json') as Record<string, unknown>[]
const manifest = read('artifacts/science-v2/manifest.json') as Record<string, unknown>
const profile = read('artifacts/science-v2/mission-profile.json')

describe('validadores precompilados (Ajv standalone)', () => {
  it('aceptan el snapshot científico real', () => {
    expect(() => assertSnapshotContracts(candidates, manifest, profile)).not.toThrow()
  })

  it('rechazan un candidato con campos inválidos o sobrantes', () => {
    const bad = [{ ...candidates[0], site_id: 'NO-VALIDO' }]
    expect(() => assertSnapshotContracts(bad, manifest, profile)).toThrow(/Candidato 1 inválido/)
    const extra = [{ ...candidates[0], campo_inventado: 1 }]
    expect(() => assertSnapshotContracts(extra, manifest, profile)).toThrow(/Candidato 1 inválido/)
  })

  it('siguen validando formatos (date-time) como el compilador original', () => {
    expect(() => assertSnapshotContracts(candidates, { ...manifest, created_at: 'ayer' }, profile)).toThrow(/Manifest inválido/)
  })

  it('el archivo generado coincide con los esquemas actuales', () => {
    expect(() => execFileSync('node', [resolve(__dirname, '../../scripts/build-validators.mjs'), '--check'])).not.toThrow()
  })
})
