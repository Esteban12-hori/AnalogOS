// Fixtures válidos e inválidos de los contratos de UX_REDESIGN §5 con los validadores
// Ajv precompilados. tests/test_ai_contracts.py prueba la misma tabla con jsonschema.
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ErrorObject } from 'ajv'
import { describe, expect, it } from 'vitest'
import { parseReferenceAnalogs } from '../domain/referenceAnalogContract'
import { checkAiAnalysisEvent, checkEvidencePacket, checkMissionInterpretation } from '../domain/aiContracts'
import { validateReferenceAnalogs } from '../domain/validators.analogs.generated.js'
import type { StandaloneValidator } from '../domain/validators.generated'
import { validateMissionInterpretation } from '../domain/validators.interpretation.generated.js'
import { validateAiAnalysisEvent, validateEvidencePacket } from '../domain/validators.mission.generated.js'

const fixtures = resolve(__dirname, '../../../../tests/fixtures/contracts')
type Expectation = { valid: true } | { valid: false; path: string; keyword: string }
const expectations = JSON.parse(readFileSync(resolve(fixtures, 'expectations.json'), 'utf8')) as Record<string, Record<string, Expectation>>

const VALIDATORS: Record<string, StandaloneValidator> = {
  'reference-analog': validateReferenceAnalogs,
  'mission-interpretation': validateMissionInterpretation,
  'evidence-packet': validateEvidencePacket,
  'ai-analysis': validateAiAnalysisEvent,
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

describe('envoltorios tipados de los contratos', () => {
  it('parseReferenceAnalogs devuelve la lista o lanza con un resumen legible', () => {
    const [catalog] = documents('reference-analog', 'valid.catalog.json')
    expect(parseReferenceAnalogs(catalog).map((analog) => analog.status)).toEqual(['por_calcular', 'por_calcular'])
    const [bad] = documents('reference-analog', 'invalid.with-similarity.json')
    expect(() => parseReferenceAnalogs(bad)).toThrow(/Catálogo de análogos inválido/)
  })

  it('las funciones check* devuelven ok o un error con el nombre del contrato', () => {
    const [interpretation] = documents('mission-interpretation', 'valid.rover-rocky.json')
    expect(checkMissionInterpretation(interpretation)).toMatchObject({ ok: true })
    const [packet] = documents('evidence-packet', 'invalid.bad-hash.json')
    const result = checkEvidencePacket(packet)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/^evidence-packet\/1: \/packet_hash/)
    const [event] = documents('ai-analysis', 'invalid.digit-outside-marker.json')
    expect(checkAiAnalysisEvent(event).ok).toBe(false)
  })

  it('un marcador {{id}} admite dígitos dentro, pero no fuera', () => {
    const base = { type: 'robustness_note', refs: ['rank:gap:1:2'] }
    expect(validateAiAnalysisEvent({ ...base, text: 'La brecha es {{rank:gap:1:2}}.' })).toBe(true)
    expect(validateAiAnalysisEvent({ ...base, text: 'La brecha es 4 puntos.' })).toBe(false)
    expect(validateAiAnalysisEvent({ ...base, text: 'Marcador {{sin cerrar.' })).toBe(false)
  })
})
