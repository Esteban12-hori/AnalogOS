// Fixtures válidos e inválidos de los contratos propios del rediseño (catálogo de ◆) con los
// validadores Ajv precompilados. tests/test_contract_fixtures.py prueba la misma tabla con
// jsonschema. Los contratos lktron (interpretación, paquete y análisis) se retiraron (ADR-012).
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ErrorObject } from 'ajv'
import { describe, expect, it } from 'vitest'
import { parseReferenceAnalogs } from '../domain/referenceAnalogContract'
import { validateReferenceAnalogs } from '../domain/validators.analogs.generated.js'
import type { StandaloneValidator } from '../domain/validators.generated'

const fixtures = resolve(__dirname, '../../../../tests/fixtures/contracts')
type Expectation = { valid: true } | { valid: false; path: string; keyword: string }
const expectations = JSON.parse(readFileSync(resolve(fixtures, 'expectations.json'), 'utf8')) as Record<string, Record<string, Expectation>>

const VALIDATORS: Record<string, StandaloneValidator> = {
  'reference-analog': validateReferenceAnalogs,
}

function documents(contract: string, name: string): unknown[] {
  const text = readFileSync(resolve(fixtures, contract, name), 'utf8')
  if (name.endsWith('.ndjson')) return text.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line) as unknown)
  return [JSON.parse(text) as unknown]
}

const pointer = (error: ErrorObject) => error.instancePath || '/'

describe('fixtures de contrato (validadores precompilados)', () => {
  it('cada archivo de fixture tiene una expectativa declarada', () => {
    for (const contract of Object.keys(VALIDATORS)) {
      const onDisk = readdirSync(resolve(fixtures, contract)).sort()
      expect(onDisk).toEqual(Object.keys(expectations[contract] ?? {}).sort())
    }
  })

  for (const [contract, files] of Object.entries(expectations)) {
    const validate = VALIDATORS[contract]
    for (const [name, expected] of Object.entries(files)) {
      it(`${contract}/${name} → ${expected.valid ? 'válido' : `inválido en ${expected.path} (${expected.keyword})`}`, () => {
        expect(validate).toBeDefined()
        if (!validate) return
        for (const document of documents(contract, name)) {
          const ok = validate(document)
          expect(ok).toBe(expected.valid)
          if (!expected.valid) {
            const found = (validate.errors ?? []).map((error) => `${pointer(error)} ${error.keyword}`)
            expect(found).toContain(`${expected.path} ${expected.keyword}`)
          }
        }
      })
    }
  }
})

describe('envoltorio tipado del catálogo de ◆', () => {
  it('parseReferenceAnalogs devuelve la lista o lanza con un resumen legible', () => {
    const [catalog] = documents('reference-analog', 'valid.catalog.json')
    expect(parseReferenceAnalogs(catalog).map((analog) => analog.status)).toEqual(['por_calcular', 'por_calcular'])
    const [bad] = documents('reference-analog', 'invalid.with-similarity.json')
    expect(() => parseReferenceAnalogs(bad)).toThrow(/Catálogo de análogos inválido/)
  })
})
