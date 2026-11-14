// Análisis pregenerado (artifacts/analysis/ai-analysis.default.json): rotulado «no científico»,
// ≤10 KB, cada evento cumple ai-analysis/1 y su texto no trae cifras, números escritos ni
// veredictos. La huella se comprueba contra el paquete real en integration.test.ts.
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkAiAnalysisEvent } from '../../domain/aiContracts'
import { scanPlainText, splitMarkers } from './analysisTokens'
import { parsePregenerated, pickPregenerated, PREGENERATED_PATH } from './pregenerated'
import { REPO_ROOT } from './testSupport'

const path = resolve(REPO_ROOT, 'artifacts', PREGENERATED_PATH)
const file = parsePregenerated(JSON.parse(readFileSync(path, 'utf8')))

describe('ai-analysis.default.json', () => {
  it('tiene la forma esperada, rótulo no científico y cabe en 10 KB (§6.1)', () => {
    expect(file).not.toBeNull()
    expect(file?.label).toMatch(/no científico/)
    expect(statSync(path).size).toBeLessThanOrEqual(10 * 1024)
    expect(file?.analyses.length).toBeGreaterThan(0)
  })

  it('vive fuera de artifacts/science-v2 (no es un artefacto científico)', () => {
    expect(PREGENERATED_PATH.startsWith('science-v2/')).toBe(false)
  })

  it('cada análisis empieza con meta «pregenerated» de su misma huella y termina con done', () => {
    for (const analysis of file?.analyses ?? []) {
      const [first] = analysis.events
      expect(first).toMatchObject({ type: 'meta', engine: 'pregenerated', packet_hash: analysis.packet_hash })
      expect(analysis.events.at(-1)).toMatchObject({ type: 'done' })
      expect(pickPregenerated(file, analysis.packet_hash)).toBe(analysis.events)
    }
    expect(pickPregenerated(file, 'fnv1a64:0000000000000000')).toBeNull()
  })

  it('cada evento cumple el contrato y su texto pasa el filtro fuera de los marcadores', () => {
    for (const analysis of file?.analyses ?? []) {
      for (const event of analysis.events) {
        const checked = checkAiAnalysisEvent(event)
        expect(checked.ok, checked.ok ? '' : `${checked.error} en ${JSON.stringify(event)}`).toBe(true)
        const record = event as { text?: string; why?: string }
        const text = record.text ?? record.why
        if (typeof text !== 'string') continue
        const split = splitMarkers(text)
        expect(split.ok, text).toBe(true)
        if (!split.ok) continue
        const plain = split.segments.map((segment) => (segment.kind === 'text' ? segment.text : ' ')).join('')
        expect(scanPlainText(plain), text).toBeNull()
      }
    }
  })
})
