// M10 — catálogo, selección y exportación de orientación geológica sobre el paquete OFICIAL real (M9).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { loadTrustedBundle } from '../../../../server/ai/facts'
import { loadTrustedGeology } from '../../../../server/ai/geology'
import {
  GEOLOGY_PURPOSES, MAX_REFS_PER_SITE, MAX_REFS_TOTAL, buildGeologyCatalog, checkGeologySelection, composeGeologyGuidance, deterministicGeologyRefs,
} from '../../../../shared/geology/guidance'
import { GeologyExportError, buildMissionGeologyExport, detectMissionExportFormat, validateAnyMissionExport, validateMissionGeologyExport } from '../../../../shared/geology/exportWrapper'
import { buildMissionExport, canonicalJson, evaluateMission, evaluationFingerprint, fingerprint, type MissionRequest } from '../mission'

const bundle = loadTrustedBundle()
const geo = loadTrustedGeology(bundle)
if (geo.status !== 'ready') throw new Error('El paquete geológico real debe estar presente y válido para estas pruebas.')
const { context, fingerprint: ctxFp } = geo

const base = (over: Partial<MissionRequest> = {}): MissionRequest => ({
  schema_version: '1.0.0', brief: 'Ensayo de un rover de ruedas en terreno árido.', activity: 'Ensayo', target: { profile_id: 'mars-rover-screening-v3', stated: 'rover' },
  requirements: [], open_questions: [], scope: { mode: 'catalog' }, confirmed: true, ...over,
})
const slope = (v: number): MissionRequest['requirements'][number] => ({
  kind: 'measurable', requirement_id: 'r1', label: 'Pendiente', importance: 'critical', origin: 'user', confirmed: true, source_quote: null,
  metric_id: 'median_slope_degree', operator: '<=', value: v, unit: 'degree', scale: 'window',
})
const evaluate = (r: MissionRequest) => evaluateMission(r, bundle)
const catalogFor = (r: MissionRequest) => { const ev = evaluate(r); return { ev, cat: buildGeologyCatalog(ev, context, ctxFp) } }

describe('catálogo geológico con evidencia real', () => {
  it('sin requisitos entran los siete sectores; cada estado real (parcial CL/AR, 0 %, 100 %) se refleja', () => {
    const { cat } = catalogFor(base())
    const by = new Map(cat.sites.map((s) => [s.site_id, s]))
    expect(by.get('cl-win-s2500-w06970')?.availability).toBe('partial')
    expect(by.get('ar-win-s2620-w06750')?.fractions.unmapped).toBeCloseTo(0.5, 2)
    expect(by.get('ar-win-s2640-w06730')?.availability).toBe('no_coverage')
    expect(by.get('ar-win-s2580-w06710')?.availability).toBe('available')
    expect(by.get('cl-pampa-yungay-screening')?.role).toBe('reference')
  })
  it('sector 0 %: ninguna unidad ni referencia, límite de no cobertura siempre presente', () => {
    const { cat } = catalogFor(base())
    const s = cat.sites.find((x) => x.site_id === 'ar-win-s2640-w06730')!
    expect(s.units).toEqual([])
    expect(cat.refs.filter((r) => r.site_id === s.site_id)).toEqual([])
    expect(s.limits.join(' ')).toMatch(/no cubre el sector/)
  })
  it('sector 100 %: sin huecos ni solapes, por tanto sin propósitos de hueco ni de ambigüedad', () => {
    const { cat } = catalogFor(base())
    const purposes = new Set(cat.refs.filter((r) => r.site_id === 'ar-win-s2580-w06710').map((r) => r.purpose))
    expect(purposes.has('verificar_hueco_cartografico')).toBe(false)
    expect(purposes.has('resolver_ambiguedad')).toBe(false)
    expect(purposes.has('caracterizar_material_superficial')).toBe(true)
  })
  it('sector parcial SÍ conserva unidades del área cubierta; el hueco es una referencia de sector, sin unidad', () => {
    const { cat } = catalogFor(base())
    const site = cat.sites.find((x) => x.site_id === 'ar-win-s2620-w06750')!
    expect(site.units.length).toBeGreaterThan(0)
    const gap = cat.refs.find((r) => r.site_id === site.site_id && r.purpose === 'verificar_hueco_cartografico')!
    expect(gap.unit_id).toBeNull()
    expect(site.limits.join(' ')).toMatch(/50,0 % del sector no tiene polígono/)
    expect(cat.refs.some((r) => r.site_id === site.site_id && r.unit_id !== null)).toBe(true)
  })
  it('las unidades traen descripción y código originales, no solo IDs', () => {
    const { cat } = catalogFor(base())
    const u = cat.sites.find((x) => x.site_id === 'cl-win-s2500-w06970')!.units[0]
    expect(u.code).toBe('Qa')
    expect(u.description).toContain('grava')
    expect(u.fraction).toBeGreaterThan(0.4)
  })
  it('cada referencia usa un propósito cerrado y todo texto es orientación editorial, no medición', () => {
    const { cat } = catalogFor(base())
    for (const r of cat.refs) {
      expect(GEOLOGY_PURPOSES).toContain(r.purpose)
      expect(r.text).toContain('Orientación editorial, no medición.')
      expect(r.text).not.toMatch(/\b(apto|segur[oa]|aprobad[oa]|autoriz)/i)
    }
  })
  it('sector descartado: sin referencias, con razón explícita; no se rehabilita y el resultado determinista no cambia', () => {
    const r = base({ requirements: [slope(3)] })
    const ev = evaluate(r)
    const before = canonicalJson(ev)
    const cat = buildGeologyCatalog(ev, context, ctxFp)
    expect(canonicalJson(ev)).toBe(before)
    const dropped = ev.options.filter((o) => o.status === 'no_cumple_requisitos').map((o) => o.site_id)
    expect(dropped.length).toBeGreaterThan(0)
    for (const id of dropped) {
      expect(cat.sites.some((s) => s.site_id === id)).toBe(false)
      expect(cat.refs.some((x) => x.site_id === id)).toBe(false)
      expect(cat.excluded.find((e) => e.site_id === id)?.reason).toMatch(/no lo rehabilita/)
    }
    expect(evaluate(r).recommended_site_ids).toEqual(ev.recommended_site_ids)
  })
  it('catalog/sector: la geología corresponde a la ventana evaluada; con punto/bbox es explícitamente de la ventana completa', () => {
    const s = catalogFor(base({ scope: { mode: 'sector', site_id: 'cl-win-s2500-w06970' } }))
    expect(s.cat.sites.every((x) => x.applies_to === 'evaluated_window')).toBe(true)
    const pt = catalogFor(base({ scope: { mode: 'point', lon: -69.7, lat: -25.0, window_site_id: 'cl-win-s2500-w06970' } }))
    expect(pt.ev.outcome).toBe('evaluated')
    expect(pt.cat.sites.length).toBeGreaterThan(0)
    expect(pt.cat.sites.every((x) => x.applies_to === 'window_not_requested_geometry')).toBe(true)
    expect(pt.cat.sites[0].limits.join(' ')).toMatch(/no describe el punto o área pedidos/)
    expect(composeGeologyGuidance(pt.cat, [], 'deterministic_template').scope_note).toMatch(/no del punto/)
  })
  it('punto sin ventana elegida: no se emiten unidades', () => {
    const { ev, cat } = catalogFor(base({ scope: { mode: 'point', lon: -69.7, lat: -25.0, window_site_id: null } }))
    expect(ev.outcome).not.toBe('evaluated')
    expect(cat.sites).toEqual([])
    expect(cat.refs).toEqual([])
  })
  it('fuera de cobertura: sin evaluación completa no hay unidades', () => {
    const { ev, cat } = catalogFor(base({ scope: { mode: 'point', lon: 10, lat: 10, window_site_id: null } }))
    expect(ev.outcome).toBe('insufficient_coverage')
    expect(cat.refs).toEqual([])
  })
  it('la huella del catálogo liga contexto, solicitud, evaluación y referencias', () => {
    const a = catalogFor(base()).cat
    expect(catalogFor(base()).cat.catalog_fingerprint).toBe(a.catalog_fingerprint)
    expect(catalogFor(base({ requirements: [slope(3)] })).cat.catalog_fingerprint).not.toBe(a.catalog_fingerprint)
    expect(buildGeologyCatalog(evaluate(base()), context, 'f'.repeat(64)).catalog_fingerprint).not.toBe(a.catalog_fingerprint)
    const changed = structuredClone(context)
    changed.sites[0].units[0].description = 'otra descripción'
    expect(buildGeologyCatalog(evaluate(base()), changed, ctxFp).catalog_fingerprint).not.toBe(a.catalog_fingerprint)
    expect(fingerprint(changed)).not.toBe(ctxFp)
  })
})

describe('validación estricta de la selección', () => {
  const { cat } = catalogFor(base())
  const mine = cat.refs.filter((r) => r.site_id === 'cl-win-s2500-w06970')
  it('acepta pares válidos, vacía incluida; conserva el orden', () => {
    expect(checkGeologySelection({ ref_ids: [] }, cat).ok).toBe(true)
    const ids = [mine[2].ref_id, mine[0].ref_id]
    const r = checkGeologySelection({ ref_ids: ids }, cat)
    expect(r.ok && r.selection.ref_ids).toEqual(ids)
  })
  it('rechaza unidad/sector/fuente ajenos o inventados, sin reparar', () => {
    const other = cat.refs.find((r) => r.site_id === 'ar-win-s2580-w06710' && r.unit_id)!
    const forged = `cl-win-s2500-w06970|geo|${other.unit_id}|${other.purpose}`
    for (const id of [forged, 'zz|geo|site|contrastar_escala', mine[0].ref_id + 'x', '', 'cl-win-s2500-w06970|geo|site|invento_propositos']) {
      expect(checkGeologySelection({ ref_ids: [id] }, cat).ok, id).toBe(false)
    }
  })
  it('rechaza propósito inaplicable: hueco en sector 100 %, referencia en sector 0 %', () => {
    expect(checkGeologySelection({ ref_ids: ['ar-win-s2580-w06710|geo|site|verificar_hueco_cartografico'] }, cat).ok).toBe(false)
    expect(checkGeologySelection({ ref_ids: ['ar-win-s2640-w06730|geo|site|contrastar_escala'] }, cat).ok).toBe(false)
  })
  it('rechaza repetidos, más de 3 por sector, más de 12 y formas no permitidas', () => {
    expect(checkGeologySelection({ ref_ids: [mine[0].ref_id, mine[0].ref_id] }, cat).ok).toBe(false)
    expect(checkGeologySelection({ ref_ids: mine.slice(0, MAX_REFS_PER_SITE + 1).map((r) => r.ref_id) }, cat).ok).toBe(false)
    const spread = cat.sites.flatMap((s) => cat.refs.filter((r) => r.site_id === s.site_id).slice(0, MAX_REFS_PER_SITE)).map((r) => r.ref_id)
    expect(spread.length).toBeGreaterThan(MAX_REFS_TOTAL)
    expect(checkGeologySelection({ ref_ids: spread.slice(0, MAX_REFS_TOTAL + 1) }, cat).ok).toBe(false)
    expect(checkGeologySelection({ ref_ids: spread.slice(0, MAX_REFS_TOTAL) }, cat).ok).toBe(true)
    for (const bad of [null, [], 'x', { ref_ids: 'x' }, { ref_ids: [1] }, { ref_ids: [], text: 'litología libre' }, { refs: [] }]) {
      expect(checkGeologySelection(bad, cat).ok).toBe(false)
    }
  })
  it('la selección determinista respeta topes, es válida y no depende del objetivo', () => {
    const d = deterministicGeologyRefs(cat)
    expect(checkGeologySelection(d, cat).ok).toBe(true)
    expect(d.ref_ids.length).toBeLessThanOrEqual(MAX_REFS_TOTAL)
    const other = catalogFor(base({ brief: 'Muestreo de rocas con instrumentos.', activity: 'Muestreo' })).cat
    expect(deterministicGeologyRefs(other).ref_ids).toEqual(d.ref_ids)
  })
  it('la vista siempre trae los límites del sector aunque la selección esté vacía', () => {
    const v = composeGeologyGuidance(cat, [], 'anthropic')
    expect(v.sites.length).toBe(cat.sites.length)
    for (const s of v.sites) expect(s.brief.limits.length).toBeGreaterThanOrEqual(3)
    expect(v.sites.every((s) => s.items.length === 0)).toBe(true)
  })
})

describe('exportación con orientación geológica (wrapper) y compatibilidad M8 1.0', () => {
  const request = base({ requirements: [slope(9)] })
  const evaluation = evaluate(request)
  const m8 = buildMissionExport(request, evaluation, bundle) as Record<string, unknown>
  const cat = buildGeologyCatalog(evaluation, context, ctxFp)
  const det = deterministicGeologyRefs(cat).ref_ids
  const rt = (x: unknown) => JSON.parse(JSON.stringify(x))
  const wrap = () => rt(buildMissionGeologyExport(m8, evaluation, context, ctxFp, { mode: 'deterministic', ref_ids: det }, { bundle }))

  it('un export M8 1.0 existente sigue válido, se detecta como 1.0 y no gana campos', () => {
    const before = canonicalJson(m8)
    expect(validateAnyMissionExport(rt(m8), { })).toEqual({ format: 'mission-export-1.0', issues: [] })
    expect(canonicalJson(m8)).toBe(before)
    expect(Object.keys(m8)).not.toContain('geology_guidance')
    expect(detectMissionExportFormat({ kind: 'otra-cosa' })).toBe('unknown')
    expect(validateAnyMissionExport({ x: 1 }).issues.length).toBe(1)
  })
  it('wrapper determinista válido; embebe el M8 sin cambios y recalcula la evaluación con el snapshot', () => {
    const w = wrap()
    expect(canonicalJson(w.mission_export)).toBe(canonicalJson(m8))
    expect(validateMissionGeologyExport(w, { bundle })).toEqual([])
    expect(validateAnyMissionExport(w, { bundle })).toEqual({ format: 'mission-geology-export-1', issues: [] })
    expect(w.geology_guidance.context_identity.verifiable_from_this_file).toBe(false)
    expect(w.geology_guidance.geology_exports.length).toBe(cat.sites.length)
  })
  it('es reproducible (mismos bytes) y autodescriptivo sin artefactos externos', () => {
    expect(JSON.stringify(wrap())).toBe(JSON.stringify(wrap()))
    const text = JSON.stringify(wrap())
    expect(text).toContain('Cartografía regional')
    expect(text).toContain('fingerprint_method')
  })
  it('modo ai: exige la misma llamada (procedencia y huellas) que la explicación M8', () => {
    const provenance = { provider: 'anthropic' as const, model: 'm', request_id: 'req_1', created_at: '2026-11-14T12:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }
    const sel = { options: [], verification_ids: [] }
    const rfp = fingerprint(request)
    const withAi = buildMissionExport(request, evaluation, bundle, { explanation: { provenance, selection: sel, request_fingerprint: rfp, evaluation_fingerprint: evaluationFingerprint(evaluation) } }) as Record<string, unknown>
    const ref_ids = [cat.refs[1].ref_id]
    const record = { context_fingerprint: ctxFp, catalog_fingerprint: cat.catalog_fingerprint, request_fingerprint: rfp, evaluation_fingerprint: evaluationFingerprint(evaluation), selection: { ref_ids } }
    const doc = rt(buildMissionGeologyExport(withAi, evaluation, context, ctxFp, { mode: 'ai', ref_ids, ai: { record, provenance } }, { bundle }))
    expect(validateMissionGeologyExport(doc, { bundle })).toEqual([])
    expect(doc.geology_guidance.guidance.source).toBe('anthropic')
    // procedencia ajena
    expect(() => buildMissionGeologyExport(withAi, evaluation, context, ctxFp, { mode: 'ai', ref_ids, ai: { record, provenance: { ...provenance, request_id: 'otro' } } }, { bundle })).toThrow(GeologyExportError)
    // sin explicación M8 de esa llamada
    expect(() => buildMissionGeologyExport(m8, evaluation, context, ctxFp, { mode: 'ai', ref_ids, ai: { record, provenance } }, { bundle })).toThrow(/misma llamada/)
    // registro de otro catálogo
    expect(() => buildMissionGeologyExport(withAi, evaluation, context, ctxFp, { mode: 'ai', ref_ids, ai: { record: { ...record, catalog_fingerprint: 'a'.repeat(64) }, provenance } }, { bundle })).toThrow(/otro contexto/)
    // manipulaciones del documento válido
    const t1 = rt(doc); t1.geology_guidance.ai.provenance.model = 'otro'
    expect(validateMissionGeologyExport(t1).join()).toMatch(/misma llamada/)
    const t2 = rt(doc); t2.geology_guidance.mode = 'deterministic'
    expect(validateMissionGeologyExport(t2).length).toBeGreaterThan(0)
  })
  it('rechaza construir con contexto/huella/evaluación ajenos o selección inválida', () => {
    expect(() => buildMissionGeologyExport(m8, evaluation, context, 'b'.repeat(64), { mode: 'deterministic', ref_ids: det }, { bundle })).toThrow(/huella/)
    expect(() => buildMissionGeologyExport(m8, evaluate(base()), context, ctxFp, { mode: 'deterministic', ref_ids: det }, { bundle })).toThrow(/evaluación/)
    expect(() => buildMissionGeologyExport(m8, evaluation, context, ctxFp, { mode: 'deterministic', ref_ids: ['inventado'] }, { bundle })).toThrow(/Selección geológica inválida/)
    expect(() => buildMissionGeologyExport(m8, evaluation, context, ctxFp, { mode: 'deterministic', ref_ids: [cat.refs[0].ref_id] }, { bundle })).toThrow(/determinista/)
  })
  const tamper: Array<[string, (w: any) => void]> = [
    ['descripción de una unidad', (w) => { w.geology_guidance.geology_exports[0].site.units[0].description = 'basalto compacto apto' }],
    ['fracción de área', (w) => { w.geology_guidance.geology_exports[0].site.area_fractions.unmapped = 0.2 }],
    ['selección con ref ajeno', (w) => { w.geology_guidance.selection.ref_ids = ['zz|geo|site|contrastar_escala'] }],
    ['selección distinta de la determinista', (w) => { w.geology_guidance.selection.ref_ids = w.geology_guidance.catalog.ref_ids.slice(0, 1) }],
    ['huella del contexto', (w) => { w.geology_guidance.context_identity.context_fingerprint = 'c'.repeat(64) }],
    ['huella del catálogo', (w) => { w.geology_guidance.catalog.catalog_fingerprint = 'd'.repeat(64) }],
    ['sector omitido', (w) => { w.geology_guidance.geology_exports.pop() }],
    ['guía editada', (w) => { w.geology_guidance.guidance.sites[0].items = [] }],
    ['texto de referencia editado', (w) => { w.geology_guidance.guidance.sites[0].items[0].ref.text = 'Afirmación nueva' }],
    ['evaluación M8 editada', (w) => { w.mission_export.evaluation.options[0].what_would_change = ['Dato inventado'] }],
    ['sha de candidatos declarado', (w) => { w.geology_guidance.context_identity.candidates_sha256 = 'e'.repeat(64) }],
    ['snapshot declarado', (w) => { w.geology_guidance.context_identity.snapshot_version = 'otro' }],
    ['campo extra en la raíz', (w) => { w.extra = 1 }],
    ['marca verificable falsa', (w) => { w.geology_guidance.context_identity.verifiable_from_this_file = true }],
    ['bloque ai en modo determinista', (w) => { w.geology_guidance.ai = { provenance: {}, request_fingerprint: 'a'.repeat(64), evaluation_fingerprint: 'a'.repeat(64), catalog_fingerprint: 'a'.repeat(64) } }],
    ['export M8 con campo geológico silencioso', (w) => { w.mission_export.geology_guidance = {} }],
  ]
  it.each(tamper)('manipulación detectada: %s', (_name, mutate) => {
    const w = wrap()
    mutate(w)
    expect(validateMissionGeologyExport(w, { bundle }).length).toBeGreaterThan(0)
  })
  it('wrapper de otra solicitud/evaluación (obsoleto) no valida con la solicitud embebida cambiada', () => {
    const w = wrap()
    w.mission_export.request.activity = 'Otra actividad'
    expect(validateMissionGeologyExport(w, { bundle }).length).toBeGreaterThan(0)
  })
})

describe('integridad del wrapper (regresiones de la revisión independiente)', () => {
  const request = base({ requirements: [slope(9)] })
  const evaluation = evaluate(request)
  const provenance = { provider: 'anthropic' as const, model: 'm', request_id: 'req_1', created_at: '2026-11-14T12:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }
  const first = evaluation.options[0]
  const m8ai = buildMissionExport(request, evaluation, bundle, {
    explanation: { provenance, selection: { options: [{ site_id: first.site_id, key_requirement_ids: ['r1'], evidence_ids: [] }], verification_ids: [] }, request_fingerprint: fingerprint(request), evaluation_fingerprint: evaluationFingerprint(evaluation) },
  }) as Record<string, unknown>
  const cat = buildGeologyCatalog(evaluation, context, ctxFp)
  const rt = (x: unknown) => JSON.parse(JSON.stringify(x))
  const wrap = () => rt(buildMissionGeologyExport(m8ai, evaluation, context, ctxFp, { mode: 'deterministic', ref_ids: deterministicGeologyRefs(cat).ref_ids }, { bundle }))

  it('geometría desplazada en el subconjunto: rechazada con bundle (anclaje) y por la huella de subconjuntos sin bundle', () => {
    const w = wrap()
    for (const ring of w.geology_guidance.geology_exports[0].site.geometry.coordinates) for (const pt of ring) pt[0] += 0.01
    expect(validateMissionGeologyExport(w, { bundle }).join()).toMatch(/geometría/)
    expect(validateMissionGeologyExport(w).length).toBeGreaterThan(0)
  })
  it('cita/fuente alterada (otra URL del mismo host): rechazada con y sin bundle', () => {
    const w = wrap()
    w.geology_guidance.geology_exports[0].source.dataset_url += '?alterado=1'
    expect(validateMissionGeologyExport(w, { bundle }).length).toBeGreaterThan(0)
    expect(validateMissionGeologyExport(w).length).toBeGreaterThan(0)
  })
  it('petición/metadatos/descripción del subconjunto alterados: cambian la huella de subconjuntos', () => {
    for (const mutate of [(w: any) => { w.geology_guidance.geology_exports[0].source.requests[0].bytes += 1 }, (w: any) => { w.geology_guidance.geology_exports[0].source.attribution = 'otra' }, (w: any) => { w.geology_guidance.geology_exports[0].processing.pyproj = 'x' }]) {
      const w = wrap()
      mutate(w)
      expect(validateMissionGeologyExport(w, { bundle }).length).toBeGreaterThan(0)
    }
  })
  it('la huella de subconjuntos está en el catálogo y distingue evidencia distinta con mismo brief', () => {
    const changed = structuredClone(context)
    changed.sources[0].attribution = 'otra atribución'
    expect(buildGeologyCatalog(evaluation, changed, ctxFp).subset_fingerprint).not.toBe(cat.subset_fingerprint)
    expect(buildGeologyCatalog(evaluation, changed, ctxFp).catalog_fingerprint).not.toBe(cat.catalog_fingerprint)
  })
  it('M8 embebido: selección de IA con sitio inventado rechazada con y sin bundle; reconstrucción exacta con bundle', () => {
    const w = rt(buildMissionGeologyExport(m8ai, evaluation, context, ctxFp, { mode: 'deterministic', ref_ids: deterministicGeologyRefs(cat).ref_ids }, { bundle }))
    expect(validateMissionGeologyExport(w, { bundle })).toEqual([])
    expect(validateMissionGeologyExport(w)).toEqual([])
    const bad = rt(w); bad.mission_export.ai.explanation.selection.options[0].site_id = 'inventado'
    expect(validateMissionGeologyExport(bad, { bundle }).join()).toMatch(/mission_export/)
    expect(validateMissionGeologyExport(bad).join()).toMatch(/mission_export/)
    const bad2 = rt(w); bad2.mission_export.ai.explanation.request_fingerprint = 'a'.repeat(64)
    expect(validateMissionGeologyExport(bad2, { bundle }).length).toBeGreaterThan(0)
    const bad3 = rt(w); bad3.mission_export.snapshot.pipeline_version = 'x'
    expect(validateMissionGeologyExport(bad3, { bundle }).length).toBeGreaterThan(0)
  })
  it('M8 1.0 suelto también se audita con bundle; el export real de M9 sigue válido', () => {
    const real = JSON.parse(readFileSync('../../submission/evidence/m9-dev-ai-export.json', 'utf8'))
    expect(validateAnyMissionExport(real, { bundle })).toEqual({ format: 'mission-export-1.0', issues: [] })
    const tampered = rt(real); tampered.ai.explanation.selection.options[0].site_id = 'inventado'
    expect(validateAnyMissionExport(tampered, { bundle }).issues.length).toBeGreaterThan(0)
    expect(validateAnyMissionExport(tampered).issues.length).toBeGreaterThan(0)
  })
  it('el constructor valida el contexto contra los candidatos del snapshot', () => {
    const moved = structuredClone(context);
    (moved.sites[0].geometry.coordinates[0][0] as number[])[0] += 0.01
    expect(() => buildMissionGeologyExport(m8ai, evaluation, moved, fingerprint(moved), { mode: 'deterministic', ref_ids: [] }, { bundle })).toThrow(/geometría/)
    expect(() => buildMissionGeologyExport({ ...m8ai, evaluation_fingerprint: 'f'.repeat(64) }, evaluation, context, ctxFp, { mode: 'deterministic', ref_ids: [] }, { bundle })).toThrow(/M8 embebida/)
  })
  it('hechos sin redondeo agresivo: fracciones originales y sin solape en el catálogo', () => {
    const u = cat.sites.find((s) => s.site_id === 'cl-win-s2500-w06970')!.units[0]
    expect(u.fraction).toBe(context.sites[0].units.find((x) => x.unit_id === u.unit_id)!.fraction_including_overlap)
    expect(u.fraction_unambiguous).toBeGreaterThan(0)
    expect(cat.sites[0].source.dataset_url).toMatch(/^https:\/\//)
  })
})
