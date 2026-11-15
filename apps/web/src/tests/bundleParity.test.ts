// The web app and the AI function must evaluate EXACTLY the same bundle (ADR-009/013): if the
// snapshot were filtered or transformed before `evaluateMission`, every Anthropic explanation
// would end up as "does not correspond to the current calculation" (different fingerprints).
import { describe, expect, it } from 'vitest'
import { loadTrustedBundle } from '../../../../server/ai/facts'
import { canonicalJson, evaluateMission, evaluationFingerprint, fingerprint } from '../mission'
import { evaluateExample, v3Bundle } from './v3Support'

describe('web ↔ server bundle parity', () => {
  it('the bundle registered by the web app is byte for byte the one the function loads', () => {
    const server = loadTrustedBundle()
    expect(canonicalJson(v3Bundle)).toBe(canonicalJson(server))
    expect(fingerprint(v3Bundle)).toBe(fingerprint(server))
  })

  it('the same request gives the same evaluation and the same fingerprint on both sides', () => {
    const { request, evaluation } = evaluateExample()
    const server = evaluateMission(request, loadTrustedBundle())
    expect(server.request_fingerprint).toBe(evaluation.request_fingerprint)
    expect(evaluationFingerprint(server)).toBe(evaluationFingerprint(evaluation))
  })
})
