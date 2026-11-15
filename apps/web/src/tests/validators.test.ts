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

describe('validadores precompilados del snapshot v3 (búsqueda y antecedentes, chunk diferido)', () => {
  const v3 = (file: string) => read(`artifacts/science-v3/${file}`)
  const search = v3('search-results.json') as Record<string, unknown>
  const precedents = v3('precedents.json') as Record<string, unknown>

  it('aceptan v3 y siguen aceptando v2, v1 y demo con los mismos mensajes que shared/domain', async () => {
    const { assertDiscoveryContracts } = await import('../domain/discoveryContracts')
    expect(() => assertSnapshotContracts(v3('candidate-details.json'), v3('manifest.json'), v3('mission-profile.json'))).not.toThrow()
    expect(() => assertDiscoveryContracts(search, precedents)).not.toThrow()
    for (const snapshot of ['demo', 'science-v1', 'science-v2']) {
      expect(() => assertSnapshotContracts(read(`artifacts/${snapshot}/candidate-details.json`), read(`artifacts/${snapshot}/manifest.json`), read(`artifacts/${snapshot}/mission-profile.json`))).not.toThrow()
    }
    expect(() => assertDiscoveryContracts({ ...search, windows: 'nada' }, precedents)).toThrow(/^Resultados de búsqueda inválidos/)
    expect(() => assertDiscoveryContracts(search, { ...precedents, precedents: [{}] })).toThrow(/^Catálogo de antecedentes inválido/)
  })

  it('dan el mismo veredicto que la validación Ajv en runtime del equipo (shared/domain/contracts)', async () => {
    const shared: typeof import('../../../../shared/domain/contracts') = await import('../../../../shared/domain/contracts')
    const local: typeof import('../domain/discoveryContracts') = await import('../domain/discoveryContracts')
    const cases: unknown[] = [search, { ...search, scope_note: 3 }, { ...search, extra: true }]
    for (const item of cases) {
      const a = (() => { try { shared.assertDiscoveryContracts(item, precedents); return 'ok' } catch (error) { return (error as Error).message.split(':')[0] } })()
      const b = (() => { try { local.assertDiscoveryContracts(item, precedents); return 'ok' } catch (error) { return (error as Error).message.split(':')[0] } })()
      expect(b).toBe(a)
    }
  })
})
