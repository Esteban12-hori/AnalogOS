// Prueba REAL contra Anthropic: omitida por defecto (los tests automáticos no usan red).
// Ejecutar: ANALOGOS_LIVE_AI=1 npx vitest run src/tests/aiLive.test.ts   (desde apps/web)
// Solo este programa lee ANTHROPIC_* del .env ignorado (loadEnv filtrado por prefijo); no se imprime ningún secreto.
import { resolve } from 'node:path'
import { loadEnv } from 'vite'
import { describe, expect, it } from 'vitest'
import { readAiConfig } from '../../../../server/ai/config'
import { RateLimiter } from '../../../../server/ai/guard'
import { handleAiRequest, type AiDeps } from '../../../../server/ai/handler'
import { loadTrustedBundle } from '../../../../server/ai/facts'
import { buildMissionExport, composeExplanation, evaluateMission, evaluationFingerprint, fingerprint, validateMissionExport, validateMissionRequest, type DraftProposal, type MissionRequest, type Requirement } from '../mission'

const live = process.env.ANALOGOS_LIVE_AI === '1'
const ORIGIN = 'http://127.0.0.1:5173'

describe.skipIf(!live)('Anthropic real (borrador + explicación)', () => {
  const env = loadEnv('test', resolve(__dirname, '../../../..'), ['ANTHROPIC_', 'ANALOGOS_AI_'])
  const deps: AiDeps = { config: readAiConfig(env), fetchImpl: fetch, now: Date.now, limiter: new RateLimiter(), bundle: loadTrustedBundle() }
  const post = (body: unknown) => handleAiRequest({ method: 'POST', headers: { origin: ORIGIN, host: '127.0.0.1:5173', 'content-type': 'application/json' }, body, clientKey: 'live' }, deps)
  const brief =
    'Quiero ensayar la navegación de un rover en terreno árido. Imprescindible: pendiente mediana regional no mayor de 3 grados. ' +
    'Preferible: al menos 95 % de superficie no vegetada. También me importa la tracción y el permiso del propietario.'

  it('borrador y explicación reales con entradas inocuas', async () => {
    expect(deps.config.apiKey, 'ANTHROPIC_API_KEY no está configurada').not.toBeNull()
    const d = await post({ operation: 'draft', client_request_id: 'live-draft-0001', brief })
    expect(d.status, JSON.stringify((d.body as { error?: unknown }).error)).toBe(200)
    const draft = (d.body as { draft: DraftProposal; provenance: Record<string, unknown> })
    expect(draft.draft.requirements.every((r) => r.origin === 'ai' && r.confirmed === false)).toBe(true)

    // El usuario confirma explícitamente el borrador tal cual (en la UI podrá editarlo).
    const request: MissionRequest = {
      schema_version: '1.0.0', brief, activity: 'Ensayo de navegación', target: { profile_id: draft.draft.target_profile_id, stated: 'rover marciano' },
      requirements: draft.draft.requirements.map((r) => ({ ...r, confirmed: true }) as Requirement), open_questions: draft.draft.open_questions, scope: { mode: 'catalog' }, confirmed: true,
    }
    expect(validateMissionRequest(request, { requireConfirmed: true }).ok).toBe(true)
    const evaluation = evaluateMission(request, deps.bundle)

    const e = await post({ operation: 'explain', client_request_id: 'live-explain-001', request, request_fingerprint: fingerprint(request) })
    expect(e.status, JSON.stringify((e.body as { error?: unknown }).error)).toBe(200)
    const ex = e.body as { selection: Parameters<typeof composeExplanation>[1]; evaluation_fingerprint: string; provenance: Record<string, unknown> }
    const view = composeExplanation(evaluation, ex.selection, 'anthropic')
    expect(view.options.length).toBeGreaterThan(0)

    // La exportación completa acepta los registros reales de ambas llamadas (valida contrato y coherencia).
    const doc = buildMissionExport(request, evaluation, deps.bundle, {
      draft: { provenance: draft.provenance as never, brief_fingerprint: fingerprint(brief), proposal: draft.draft },
      explanation: { provenance: ex.provenance as never, selection: ex.selection, request_fingerprint: ex.selection ? fingerprint(request) : '', evaluation_fingerprint: evaluationFingerprint(evaluation) },
    })
    expect(validateMissionExport(JSON.parse(JSON.stringify(doc)))).toEqual([])

    // Registro sin secretos: solo procedencia y conteos.
    console.log('AI_LIVE_RECORD ' + JSON.stringify({
      draft: { provenance: draft.provenance, requirements: draft.draft.requirements.map((r) => ({ kind: r.kind, importance: r.importance, ...(r.kind === 'measurable' ? { metric: r.metric_id, op: r.operator, value: r.value, unit: r.unit } : { topic: r.topic_id }) })), open_questions: draft.draft.open_questions.length, warnings: draft.draft.warnings, target: draft.draft.target_profile_id, scales: draft.draft.requirements.map((r) => (r.kind === 'measurable' ? r.scale : null)) },
      explain: { provenance: ex.provenance, options: ex.selection.options.length, verifications: ex.selection.verification_ids.length, outcome: evaluation.outcome, recommended: evaluation.recommended_site_ids },
    }, null, 1))
  }, 90_000)

  it('caso real: «pendiente máxima de 10 grados» no se convierte en mediana regional', async () => {
    const d = await post({ operation: 'draft', client_request_id: 'live-draft-0002', brief: 'Mi rover para Marte requiere pendiente máxima de 10 grados.' })
    expect(d.status, JSON.stringify((d.body as { error?: unknown }).error)).toBe(200)
    const p = (d.body as { draft: DraftProposal; provenance: { request_id: string; usage: unknown } })
    expect(p.draft.requirements.filter((r) => r.kind === 'measurable' && r.scale === 'window')).toEqual([])
    console.log('AI_LIVE_SLOPE ' + JSON.stringify({ request_id: p.provenance.request_id, usage: p.provenance.usage, requirements: p.draft.requirements.map((r) => (r.kind === 'measurable' ? { m: r.metric_id, scale: r.scale, v: r.value } : { topic: r.topic_id })), questions: p.draft.open_questions.length }))
  }, 90_000)
})
