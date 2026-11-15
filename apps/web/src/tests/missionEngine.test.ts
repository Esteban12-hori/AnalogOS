import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertSnapshotContracts, type CandidateSite, type DataManifest, type MissionProfile } from '../domain/contracts'
import {
  METRICS, MissionInputError, buildMissionExport, canonicalJson, composeExplanation, checkSelection, deterministicSelection,
  detectUnmeasuredMentions, evaluateMission, evaluationFingerprint as fingerprintOf, fingerprint, sha256Hex, siteRectangle, validateMissionEvaluation,
  validateMissionExport, validateMissionRequest, type EvidenceBundle, type MissionRequest, type Requirement,
} from '../mission'

const root = resolve(__dirname, '../../../..')
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf8'))
const candidates = read('artifacts/science-v3/candidate-details.json')
const manifest = read('artifacts/science-v3/manifest.json')
const profile = read('artifacts/science-v3/mission-profile.json')
assertSnapshotContracts(candidates, manifest, profile)
const bundle: EvidenceBundle = { candidates, manifest: manifest as DataManifest, profile: profile as MissionProfile }
const byId = (id: string): CandidateSite => candidates.find((c) => c.site_id === id)!

let n = 0
const slope = (op: '<=' | '>=', v: number, importance: 'critical' | 'preference' = 'critical'): Requirement => ({
  kind: 'measurable', requirement_id: `r${++n}`, label: 'Pendiente mediana', importance, origin: 'user', confirmed: true, source_quote: null,
  metric_id: 'median_slope_degree', operator: op, value: v, unit: 'degree', scale: 'window',
})
const unmeasured = (importance: 'critical' | 'preference', topic = 'traction'): Requirement => ({
  kind: 'unmeasured', requirement_id: `u${++n}`, label: 'Tracción', importance, origin: 'user', confirmed: true, source_quote: null, topic_id: topic, detail: '',
})
function req(requirements: Requirement[], over: Partial<MissionRequest> = {}): MissionRequest {
  return {
    schema_version: '1.0.0', brief: 'ensayo', activity: 'prueba de navegación', target: { profile_id: 'mars-rover-screening-v3', stated: 'rover marciano' },
    requirements, open_questions: [], scope: { mode: 'catalog' }, confirmed: true, ...over,
  }
}

describe('datos y huella', () => {
  it('los siete polígonos del snapshot son rectángulos alineados (supuesto del cruce geométrico)', () => {
    expect(candidates).toHaveLength(7)
    expect(candidates.every((c) => siteRectangle(c) !== null)).toBe(true)
  })
  it('SHA-256 coincide con vectores conocidos y el JSON canónico ignora el orden de claves', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(sha256Hex('a'.repeat(200))).toHaveLength(64)
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}')
    expect(fingerprint({ a: 1, b: 2 })).toBe(fingerprint({ b: 2, a: 1 }))
  })
})

describe('motor de evaluación', () => {
  it('sin requisitos prioriza por similitud v3 y desempata por ID; incluye Yungay como referencia', () => {
    const ev = evaluateMission(req([]), bundle)
    expect(ev.outcome).toBe('evaluated')
    expect(ev.options).toHaveLength(7)
    expect(ev.recommended_site_ids[0]).toBe('cl-win-s2500-w06970')
    const y = ev.options.find((o) => o.site_id === 'cl-pampa-yungay-screening')!
    expect(y.role).toBe('reference')
    expect(y.status).toBe('priorizado_para_reconocimiento')
    expect(ev.options.every((o) => o.territorial_feasibility === 'pending')).toBe(true)
    expect(validateMissionEvaluation(ev)).toEqual([])
  })

  it('un requisito medible cambia la selección y conserva países y similitudes originales', () => {
    const all = evaluateMission(req([]), bundle)
    const strict = evaluateMission(req([slope('<=', 2.2)]), bundle)
    expect(strict.recommended_site_ids.length).toBeLessThan(all.recommended_site_ids.length)
    const o = strict.options.find((x) => x.site_id === 'cl-win-s2500-w06970')!
    expect(o.requirement_results[0]).toMatchObject({ status: 'cumple', observed_value: 2.169, observed_unit: 'degree' })
    expect(o.snapshot_scores.similarity).toBe(byId('cl-win-s2500-w06970').similarity)
    expect(strict.evidence.length).toBeGreaterThan(0)
  })

  it('un crítico imposible deja cero priorizados y es válido no recomendar ninguno', () => {
    const ev = evaluateMission(req([slope('<=', 0.001)]), bundle)
    expect(ev.recommended_site_ids).toEqual([])
    expect(ev.none_prioritized).toBe(true)
    expect(ev.options.every((o) => o.status === 'no_cumple_requisitos')).toBe(true)
  })

  it('un crítico no evaluable nunca aprueba aunque la similitud sea 94,87', () => {
    const ev = evaluateMission(req([unmeasured('critical')]), bundle)
    expect(ev.recommended_site_ids).toEqual([])
    expect(ev.options.every((o) => o.status === 'evidencia_insuficiente')).toBe(true)
    expect(ev.pending_requirements).toHaveLength(1)
  })

  it('el incumplimiento observado domina sobre un crítico desconocido', () => {
    const ev = evaluateMission(req([unmeasured('critical'), slope('<=', 0.001)]), bundle)
    expect(ev.options.every((o) => o.status === 'no_cumple_requisitos')).toBe(true)
  })

  it('preferencias desconocidas no excluyen ni cuentan como cumplidas y rotulan comparabilidad parcial', () => {
    const ev = evaluateMission(req([unmeasured('preference')]), bundle)
    expect(ev.options.every((o) => o.status === 'priorizado_para_reconocimiento')).toBe(true)
    expect(ev.options[0].preferences).toEqual({ met: 0, unmet: 0, unknown: 1, total: 1 })
    expect(ev.comparability).toBe('partial')
  })

  it('las preferencias satisfechas ordenan antes que la similitud', () => {
    // Pendiente <= 2.5: cumplen solo algunas ventanas; las que cumplen suben aunque tengan menor similitud.
    const ev = evaluateMission(req([slope('<=', 2.0, 'preference')]), bundle)
    const ranked = ev.options.filter((o) => o.rank !== null)
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1].preferences.met).toBeGreaterThanOrEqual(ranked[i].preferences.met)
    }
  })

  it('un requisito de escala puntual no se satisface con la mediana regional', () => {
    const point: Requirement = { ...(slope('<=', 30) as Extract<Requirement, { kind: 'measurable' }>), scale: 'point' }
    const ev = evaluateMission(req([point]), bundle)
    expect(ev.options.every((o) => o.status === 'evidencia_insuficiente')).toBe(true)
    expect(ev.options[0].requirement_results[0].reason).toMatch(/escala puntual/)
  })

  it('convierte % a fracción de forma explícita y la deja registrada', () => {
    const r: Requirement = {
      kind: 'measurable', requirement_id: 'nv', label: 'No vegetado', importance: 'critical', origin: 'user', confirmed: true, source_quote: null,
      metric_id: 'nonvegetated_fraction', operator: '>=', value: 95, unit: 'percent', scale: 'window',
    }
    const ev = evaluateMission(req([r]), bundle)
    const res = ev.options[0].requirement_results[0]
    expect(res.conversion).toMatch(/dividiendo por 100/)
    expect(res.observed_unit).toBe('ratio')
    expect(ev.options.some((o) => o.status === 'priorizado_para_reconocimiento')).toBe(true)
  })

  it('país: Chile y Argentina se filtran correctamente', () => {
    const country = (codes: string[]): Requirement => ({
      kind: 'measurable', requirement_id: 'c', label: 'País', importance: 'critical', origin: 'user', confirmed: true, source_quote: null,
      metric_id: 'country', operator: 'in', value: codes, unit: 'iso_alpha2', scale: 'window',
    })
    const ar = evaluateMission(req([country(['AR'])]), bundle)
    expect(ar.recommended_site_ids.every((id) => id.startsWith('ar-'))).toBe(true)
    expect(ar.recommended_site_ids).toHaveLength(3)
    const cl = evaluateMission(req([country(['CL'])]), bundle)
    expect(cl.recommended_site_ids).toHaveLength(4)
    expect(cl.recommended_site_ids).toContain('cl-pampa-yungay-screening')
  })

  it('el área es extensión del polígono con su evidencia derivada', () => {
    const r: Requirement = {
      kind: 'measurable', requirement_id: 'a', label: 'Área', importance: 'critical', origin: 'user', confirmed: true, source_quote: null,
      metric_id: 'polygon_area_km2', operator: '>=', value: 100, unit: 'km2', scale: 'window',
    }
    const ev = evaluateMission(req([r]), bundle)
    expect(ev.evidence.some((e) => e.kind === 'app_derived')).toBe(true)
    expect(ev.limits.join(' ')).toMatch(/no superficie libre/)
  })

  it('exige confirmación explícita antes de evaluar', () => {
    expect(() => evaluateMission(req([slope('<=', 3)], { confirmed: false }), bundle)).toThrow(MissionInputError)
    const unconfirmed = { ...slope('<=', 3), confirmed: false }
    expect(() => evaluateMission(req([unconfirmed]), bundle)).toThrow(/sin confirmar/)
  })

  it('un objetivo no soportado no puntúa ni ordena', () => {
    const ev = evaluateMission(req([slope('<=', 3)], { target: { profile_id: 'unsupported', stated: 'hábitat lunar' } }), bundle)
    expect(ev.outcome).toBe('unsupported_target')
    expect(ev.options.every((o) => o.status === 'objetivo_no_soportado' && o.rank === null && o.requirement_results.length === 0)).toBe(true)
    expect(ev.recommended_site_ids).toEqual([])
  })

  it('es determinista: misma solicitud, misma evaluación y exportación byte a byte', () => {
    const request = req([slope('<=', 3), unmeasured('preference')])
    const a = evaluateMission(request, bundle)
    const b = evaluateMission(JSON.parse(JSON.stringify(request)), bundle)
    expect(canonicalJson(a)).toBe(canonicalJson(b))
    const e1 = JSON.stringify(buildMissionExport(request, a, bundle))
    const e2 = JSON.stringify(buildMissionExport(request, b, bundle))
    expect(e1).toBe(e2)
    expect(validateMissionExport(JSON.parse(e1))).toEqual([])
  })

  it('cambiar cualquier parte de la solicitud cambia la huella', () => {
    const a = evaluateMission(req([slope('<=', 3)]), bundle).request_fingerprint
    expect(evaluateMission(req([slope('<=', 3.1)]), bundle).request_fingerprint).not.toBe(a)
    expect(evaluateMission(req([slope('<=', 3)], { brief: 'otro' }), bundle).request_fingerprint).not.toBe(a)
  })

  it('no modifica el snapshot de entrada', () => {
    const before = JSON.stringify(candidates)
    evaluateMission(req([slope('<=', 3)]), bundle)
    expect(JSON.stringify(candidates)).toBe(before)
  })
})

describe('validación de solicitud', () => {
  it('rechaza brief largo, unidades/operadores inválidos, valores no finitos y rangos absurdos', () => {
    expect(validateMissionRequest(req([], { brief: 'x'.repeat(3001) })).ok).toBe(false)
    const bad = (patch: Record<string, unknown>) => validateMissionRequest(req([{ ...slope('<=', 3), ...patch } as Requirement]))
    expect(bad({ unit: 'meter' }).ok).toBe(false)
    expect(bad({ value: Number.NaN }).ok).toBe(false)
    expect(bad({ value: 95 }).ok).toBe(false) // pendiente > 90°
    expect(bad({ operator: 'in', value: ['CL'] }).ok).toBe(false)
    expect(bad({ operator: 'between', value: [5, 1] }).ok).toBe(false)
    expect(validateMissionRequest({ ...req([]), extra: 1 }).ok).toBe(false)
  })
  it('detecta temas no medidos en el brief sin depender de IA', () => {
    const found = detectUnmeasuredMentions('Necesito buena tracción, sin rocas grandes, con cobertura móvil y permiso de acceso.').map((f) => f.topic_id)
    expect(found).toEqual(expect.arrayContaining(['traction', 'rock_size', 'mobile_coverage', 'permits']))
    expect(Object.keys(METRICS)).toHaveLength(6)
  })
})

describe('explicación', () => {
  const evaluation = evaluateMission(req([slope('<=', 2.2), unmeasured('preference')]), bundle)
  it('rechaza IDs de sector, requisito, evidencia y verificación ajenos', () => {
    const first = evaluation.options[0]
    const ok = { options: [{ site_id: first.site_id, key_requirement_ids: [first.requirement_results[0].requirement_id], evidence_ids: [] }], verification_ids: [] }
    expect(checkSelection(ok, evaluation).ok).toBe(true)
    expect(checkSelection({ ...ok, options: [{ ...ok.options[0], site_id: 'cl-inventado' }] }, evaluation).ok).toBe(false)
    expect(checkSelection({ ...ok, options: [{ ...ok.options[0], key_requirement_ids: ['zzz'] }] }, evaluation).ok).toBe(false)
    expect(checkSelection({ ...ok, options: [{ ...ok.options[0], evidence_ids: ['http://evil'] }] }, evaluation).ok).toBe(false)
    expect(checkSelection({ ...ok, verification_ids: ['x|fc|9'] }, evaluation).ok).toBe(false)
    expect(checkSelection({ ...ok, options: [ok.options[0], ok.options[0]] }, evaluation).ok).toBe(false)
  })
  it('la plantilla determinista conserva estados y se rotula sin IA', () => {
    const view = composeExplanation(evaluation, deterministicSelection(evaluation), 'deterministic_template')
    expect(view.source).toBe('deterministic_template')
    expect(view.notice).toMatch(/sin IA/)
    for (const o of view.options) expect(o.status).toBe(evaluation.options.find((x) => x.site_id === o.site_id)!.status)
  })
})

describe('exportación: coherencia semántica y procedencia de IA', () => {
  const request = req([slope('<=', 3), unmeasured('preference')], { brief: 'Brief completo del usuario.' })
  const evaluation = evaluateMission(request, bundle)
  const prov = { provider: 'anthropic' as const, model: 'claude-sonnet-5-5', request_id: 'req_x', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 2 }, stop_reason: 'end_turn' }
  const proposal = { activity: 'a', target_kind: 'mars_rover_terrain' as const, target_profile_id: 'mars-rover-screening-v3', requirements: [{ ...request.requirements[0], origin: 'ai' as const, confirmed: false }], open_questions: [], warnings: [] }

  it('rechaza una evaluación de otra solicitud o alterada', () => {
    const other = evaluateMission(req([slope('<=', 4)]), bundle)
    expect(() => buildMissionExport(request, other, bundle)).toThrow(/otra solicitud/)
    const tampered = { ...evaluation, recommended_site_ids: ['cl-pampa-yungay-screening'] }
    expect(() => buildMissionExport(request, tampered, bundle)).toThrow(/no coincide/)
    expect(() => buildMissionExport({ ...request, confirmed: false }, evaluation, bundle)).toThrow(/no exportable/)
  })
  it('conserva borrador y explicación por separado, con cambios del usuario calculados', () => {
    const draft = { provenance: prov, brief_fingerprint: fingerprint(request.brief), proposal }
    const selection = deterministicSelection(evaluation)
    const explanation = { provenance: prov, selection, request_fingerprint: evaluation.request_fingerprint, evaluation_fingerprint: fingerprintOf(evaluation) }
    const doc = buildMissionExport(request, evaluation, bundle, { draft, explanation }) as { ai: { draft: { user_changes: Record<string, string[]> }; explanation: unknown } }
    expect(doc.ai.explanation).not.toBeNull()
    // El requisito 0 pasó a origin 'user' y se añadió uno: el usuario, no la IA, es el autor de esos cambios.
    expect(doc.ai.draft.user_changes.edited_requirement_ids).toEqual([request.requirements[0].requirement_id])
    expect(doc.ai.draft.user_changes.added_requirement_ids).toEqual([request.requirements[1].requirement_id])
    expect(validateMissionExport(JSON.parse(JSON.stringify(doc)))).toEqual([])
    const onlyDraft = buildMissionExport(request, evaluation, bundle, { draft }) as { ai: { draft: unknown; explanation: unknown } }
    expect(onlyDraft.ai.draft).not.toBeNull()
    expect(onlyDraft.ai.explanation).toBeNull()
  })
  it('no atribuye a la IA un brief editado ni una explicación de otra evaluación', () => {
    expect(() => buildMissionExport(request, evaluation, bundle, { draft: { provenance: prov, brief_fingerprint: fingerprint('otro brief'), proposal } })).toThrow(/brief cambió/)
    const selection = deterministicSelection(evaluation)
    expect(() => buildMissionExport(request, evaluation, bundle, { explanation: { provenance: prov, selection, request_fingerprint: 'a'.repeat(64), evaluation_fingerprint: fingerprintOf(evaluation) } })).toThrow(/otra solicitud/)
    expect(() => buildMissionExport(request, evaluation, bundle, { explanation: { provenance: prov, selection: { ...selection, extra: 1 } as never, request_fingerprint: evaluation.request_fingerprint, evaluation_fingerprint: fingerprintOf(evaluation) } })).toThrow(/Selección/)
    const foreign = { ...selection, verification_ids: ['x|fc|0'] }
    expect(() => buildMissionExport(request, evaluation, bundle, { explanation: { provenance: prov, selection: foreign, request_fingerprint: evaluation.request_fingerprint, evaluation_fingerprint: fingerprintOf(evaluation) } })).toThrow(/Selección/)
  })
})

describe('SHA-256 con Unicode y bloques múltiples (contra node:crypto)', () => {
  it('coincide', async () => {
    const { createHash } = await import('node:crypto')
    for (const s of ['ñ📡Marte', 'a'.repeat(55), 'b'.repeat(56), 'c'.repeat(64), 'x'.repeat(2000), JSON.stringify(candidates)]) {
      expect(sha256Hex(s)).toBe(createHash('sha256').update(s).digest('hex'))
    }
  })
})
