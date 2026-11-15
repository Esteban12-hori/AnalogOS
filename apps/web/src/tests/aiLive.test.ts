// Prueba REAL contra Anthropic: omitida por defecto (los tests automáticos no usan red).
// Ejecutar: ANALOGOS_LIVE_AI=1 npx vitest run src/tests/aiLive.test.ts   (desde apps/web)
// Solo este programa lee ANTHROPIC_* del .env ignorado (loadEnv filtrado por prefijo); no se imprime ningún secreto.
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'
import { describe, expect, it } from 'vitest'
import { readAiConfig } from '../../../../server/ai/config'
import { RateLimiter } from '../../../../server/ai/guard'
import { handleAiRequest, type AiDeps } from '../../../../server/ai/handler'
import { loadTrustedBundle } from '../../../../server/ai/facts'
import { loadTrustedGeology } from '../../../../server/ai/geology'
import { buildGeologyCatalog, composeGeologyGuidance } from '../../../../shared/geology/guidance'
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

// M10: dos objetivos contrastantes con el canal geológico opt-in. No se asume estabilidad exacta del LLM: se exige
// validez (todo ref pertenece al catálogo, topes, unicidad) y se REGISTRA si la elección difiere entre objetivos.
describe.skipIf(!live)('Anthropic real (orientación geológica, dos objetivos contrastantes)', () => {
  const env = loadEnv('test', resolve(__dirname, '../../../..'), ['ANTHROPIC_', 'ANALOGOS_AI_'])
  const bundle = loadTrustedBundle()
  const geology = loadTrustedGeology(bundle)
  const deps: AiDeps = { config: readAiConfig(env), fetchImpl: fetch, now: Date.now, limiter: new RateLimiter(), bundle, geology: () => geology }
  const post = (body: unknown) => handleAiRequest({ method: 'POST', headers: { origin: ORIGIN, host: '127.0.0.1:5173', 'content-type': 'application/json' }, body, clientKey: 'live-geo' }, deps)
  const req = (brief: string, activity: string): MissionRequest => ({
    schema_version: '1.0.0', brief, activity, target: { profile_id: 'mars-rover-screening-v3', stated: 'rover marciano' },
    requirements: [{ kind: 'measurable', requirement_id: 'r1', label: 'Mediana de pendiente regional', importance: 'critical', origin: 'user', confirmed: true, source_quote: null, metric_id: 'median_slope_degree', operator: '<=', value: 9, unit: 'degree', scale: 'window' }],
    open_questions: [], scope: { mode: 'catalog' }, confirmed: true,
  })
  const objectives: Array<[string, MissionRequest]> = [
    ['movilidad', req('Quiero probar la tracción y la movilidad de las ruedas de un rover sobre material suelto y compactado; me preocupa el deslizamiento y el hundimiento.', 'Ensayo de movilidad y tracción')],
    ['muestreo', req('Quiero probar un instrumento que clasifica rocas: necesito encontrar la mayor diversidad litológica posible para muestrear con el brazo robótico.', 'Muestreo e instrumentación litológica')],
  ]
  it('ambos objetivos devuelven selecciones válidas y citables; se registra si difieren', async () => {
    if (geology.status !== 'ready') throw new Error('Falta el paquete geológico real')
    const record: Record<string, unknown> = {}
    const picks: Record<string, string[]> = {}
    const evidence: Record<string, unknown> = {}
    for (const [name, request] of objectives) {
      const r = await post({ operation: 'explain', client_request_id: `live-geo-${name}-01`, request, request_fingerprint: fingerprint(request), geology_context_fingerprint: geology.fingerprint })
      expect(r.status, JSON.stringify((r.body as { error?: unknown }).error)).toBe(200)
      const body = r.body as { geology: { catalog_fingerprint: string; selection: { ref_ids: string[] } }; provenance: { request_id: string; usage: unknown } }
      const catalog = buildGeologyCatalog(evaluateMission(request, bundle), geology.context, geology.fingerprint)
      expect(body.geology.catalog_fingerprint).toBe(catalog.catalog_fingerprint)
      const ids = body.geology.selection.ref_ids
      expect(ids.every((id) => catalog.refs.some((x) => x.ref_id === id))).toBe(true)
      const view = composeGeologyGuidance(catalog, ids, 'anthropic')
      expect(view.sites.every((s) => s.brief.limits.length >= 3)).toBe(true)
      picks[name] = ids
      evidence[name] = {
        synthetic_input: { brief: request.brief, activity: request.activity, requirements: request.requirements.map((x) => x.label) },
        request_fingerprint: catalog.request_fingerprint, evaluation_fingerprint: catalog.evaluation_fingerprint, context_fingerprint: geology.fingerprint, subset_fingerprint: catalog.subset_fingerprint, catalog_fingerprint: catalog.catalog_fingerprint,
        m8_selection: (body as unknown as { selection: unknown }).selection, provenance: (body as unknown as { provenance: unknown }).provenance,
        geology_selection: view.sites.flatMap((x) => x.items.map((i) => ({ site_id: x.brief.site_id, ref_id: i.ref.ref_id, purpose: i.ref.purpose, unit: i.unit ? { code: i.unit.code, name: i.unit.name, fraction_including_overlap: i.unit.fraction, fraction_unambiguous: i.unit.fraction_unambiguous } : null, text: i.ref.text }))),
      }
      record[name] = { request_id: body.provenance.request_id, usage: body.provenance.usage, count: ids.length, purposes: ids.map((id) => id.split('|')[3]), sites: [...new Set(ids.map((id) => id.split('|')[0]))] }
    }
    // Evidencia auditable sin claves: entradas sintéticas, datos geológicos públicos, selecciones y procedencia.
    mkdirSync(resolve(__dirname, '../../../../submission/evidence'), { recursive: true })
    writeFileSync(resolve(__dirname, '../../../../submission/evidence/m10-live-geology-evidence.json'), `${JSON.stringify({ note: 'Entradas sintéticas; datos geológicos públicos SERNAGEOMIN/MMA y SEGEMAR/SIGAM; sin claves.', differs: JSON.stringify(picks.movilidad) !== JSON.stringify(picks.muestreo), ...evidence }, null, 2)}\n`)
    console.log('AI_LIVE_GEOLOGY ' + JSON.stringify({ ...record, differs: JSON.stringify(picks.movilidad) !== JSON.stringify(picks.muestreo) }, null, 1))
  }, 180_000)
})
