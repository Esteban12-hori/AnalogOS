// La web y la función de IA deben evaluar EXACTAMENTE el mismo bundle (ADR-009/013): si el
// snapshot se filtrara o transformara antes de `evaluateMission`, toda explicación de Anthropic
// terminaría en «no corresponde al cálculo vigente» (huellas distintas).
import { describe, expect, it } from 'vitest'
import { loadTrustedBundle } from '../../../../server/ai/facts'
import { canonicalJson, evaluateMission, evaluationFingerprint, fingerprint } from '../mission'
import { evaluateExample, v3Bundle } from './v3Support'

describe('paridad del bundle web ↔ servidor', () => {
  it('el bundle que registra la web es byte a byte el que carga la función', () => {
    const server = loadTrustedBundle()
    expect(canonicalJson(v3Bundle)).toBe(canonicalJson(server))
    expect(fingerprint(v3Bundle)).toBe(fingerprint(server))
  })

  it('la misma solicitud da la misma evaluación y la misma huella en ambos lados', () => {
    const { request, evaluation } = evaluateExample()
    const server = evaluateMission(request, loadTrustedBundle())
    expect(server.request_fingerprint).toBe(evaluation.request_fingerprint)
    expect(evaluationFingerprint(server)).toBe(evaluationFingerprint(evaluation))
  })
})
