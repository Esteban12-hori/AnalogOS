// Valid and invalid fixtures for the redesign's own contracts (◆ catalog) with the
// precompiled Ajv validators. tests/test_contract_fixtures.py tests the same table with
// jsonschema. The lktron contracts (interpretation, package, and analysis) were retired (ADR-012).
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

describe('contract fixtures (precompiled validators)', () => {
  it('every fixture file has a declared expectation', () => {
    for (const contract of Object.keys(VALIDATORS)) {
      const onDisk = readdirSync(resolve(fixtures, contract)).sort()
      expect(onDisk).toEqual(Object.keys(expectations[contract] ?? {}).sort())
    }
  })

  for (const [contract, files] of Object.entries(expectations)) {
    const validate = VALIDATORS[contract]
    for (const [name, expected] of Object.entries(files)) {
      it(`${contract}/${name} → ${expected.valid ? 'valid' : `invalid at ${expected.path} (${expected.keyword})`}`, () => {
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

describe('typed wrapper of the ◆ catalog', () => {
  it('parseReferenceAnalogs returns the list or throws with a readable summary', () => {
    const [catalog] = documents('reference-analog', 'valid.catalog.json')
    expect(parseReferenceAnalogs(catalog).map((analog) => analog.status)).toEqual(['por_calcular', 'por_calcular'])
    const [bad] = documents('reference-analog', 'invalid.with-similarity.json')
    expect(() => parseReferenceAnalogs(bad)).toThrow(/Invalid analog catalog/)
  })
})
