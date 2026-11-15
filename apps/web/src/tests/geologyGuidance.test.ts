// M10 — catalog, selection and export of geological guidance on the real OFFICIAL package (M9).
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
if (geo.status !== 'ready') throw new Error('The real geology package must be present and valid for these tests.')
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

describe('geology catalog with real evidence', () => {
  it('without requirements all seven sectors enter; each real state (partial CL/AR, 0%, 100%) is reflected', () => {
    const { cat } = catalogFor(base())
    const by = new Map(cat.sites.map((s) => [s.site_id, s]))
    expect(by.get('cl-win-s2500-w06970')?.availability).toBe('partial')
    expect(by.get('ar-win-s2620-w06750')?.fractions.unmapped).toBeCloseTo(0.5, 2)
    expect(by.get('ar-win-s2640-w06730')?.availability).toBe('no_coverage')
    expect(by.get('ar-win-s2580-w06710')?.availability).toBe('available')
    expect(by.get('cl-pampa-yungay-screening')?.role).toBe('reference')
  })
  it('0% sector: no unit or reference, no-coverage limit always present', () => {
    const { cat } = catalogFor(base())
    const s = cat.sites.find((x) => x.site_id === 'ar-win-s2640-w06730')!
    expect(s.units).toEqual([])
    expect(cat.refs.filter((r) => r.site_id === s.site_id)).toEqual([])
    expect(s.limits.join(' ')).toMatch(/does not cover the sector/)
  })
  it('100% sector: no gaps or overlaps, hence no gap or ambiguity purposes', () => {
    const { cat } = catalogFor(base())
    const purposes = new Set(cat.refs.filter((r) => r.site_id === 'ar-win-s2580-w06710').map((r) => r.purpose))
    expect(purposes.has('verificar_hueco_cartografico')).toBe(false)
    expect(purposes.has('resolver_ambiguedad')).toBe(false)
    expect(purposes.has('caracterizar_material_superficial')).toBe(true)
  })
  it('a partial sector DOES keep units from the covered area; the gap is a sector reference, without a unit', () => {
    const { cat } = catalogFor(base())
    const site = cat.sites.find((x) => x.site_id === 'ar-win-s2620-w06750')!
    expect(site.units.length).toBeGreaterThan(0)
    const gap = cat.refs.find((r) => r.site_id === site.site_id && r.purpose === 'verificar_hueco_cartografico')!
    expect(gap.unit_id).toBeNull()
    expect(site.limits.join(' ')).toMatch(/50\.0% of the sector has no polygon/)
    expect(cat.refs.some((r) => r.site_id === site.site_id && r.unit_id !== null)).toBe(true)
  })
  it('units carry original description and code, not only IDs', () => {
    const { cat } = catalogFor(base())
    const u = cat.sites.find((x) => x.site_id === 'cl-win-s2500-w06970')!.units[0]
    expect(u.code).toBe('Qa')
    expect(u.description).toContain('grava')
    expect(u.fraction).toBeGreaterThan(0.4)
  })
  it('every reference uses a closed purpose and all text is editorial guidance, not measurement', () => {
    const { cat } = catalogFor(base())
    for (const r of cat.refs) {
      expect(GEOLOGY_PURPOSES).toContain(r.purpose)
      expect(r.text).toContain('Editorial guidance, not a measurement.')
      expect(r.text).not.toMatch(/\b(suitable|safe|approved|authoriz)/i)
    }
  })
  it('discarded sector: no references, with an explicit reason; it is not rehabilitated and the deterministic result does not change', () => {
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
      expect(cat.excluded.find((e) => e.site_id === id)?.reason).toMatch(/does not rehabilitate it/)
    }
    expect(evaluate(r).recommended_site_ids).toEqual(ev.recommended_site_ids)
  })
  it('catalog/sector: geology matches the evaluated window; with point/bbox it is explicitly for the whole window', () => {
    const s = catalogFor(base({ scope: { mode: 'sector', site_id: 'cl-win-s2500-w06970' } }))
    expect(s.cat.sites.every((x) => x.applies_to === 'evaluated_window')).toBe(true)
    const pt = catalogFor(base({ scope: { mode: 'point', lon: -69.7, lat: -25.0, window_site_id: 'cl-win-s2500-w06970' } }))
    expect(pt.ev.outcome).toBe('evaluated')
    expect(pt.cat.sites.length).toBeGreaterThan(0)
    expect(pt.cat.sites.every((x) => x.applies_to === 'window_not_requested_geometry')).toBe(true)
    expect(pt.cat.sites[0].limits.join(' ')).toMatch(/does not describe the requested point or area/)
    expect(composeGeologyGuidance(pt.cat, [], 'deterministic_template').scope_note).toMatch(/not of the requested point/)
  })
  it('point without a chosen window: no units are emitted', () => {
    const { ev, cat } = catalogFor(base({ scope: { mode: 'point', lon: -69.7, lat: -25.0, window_site_id: null } }))
    expect(ev.outcome).not.toBe('evaluated')
    expect(cat.sites).toEqual([])
    expect(cat.refs).toEqual([])
  })
  it('out of coverage: without a full evaluation there are no units', () => {
    const { ev, cat } = catalogFor(base({ scope: { mode: 'point', lon: 10, lat: 10, window_site_id: null } }))
    expect(ev.outcome).toBe('insufficient_coverage')
    expect(cat.refs).toEqual([])
  })
  it('the catalog fingerprint ties context, request, evaluation and references', () => {
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

describe('strict selection validation', () => {
  const { cat } = catalogFor(base())
  const mine = cat.refs.filter((r) => r.site_id === 'cl-win-s2500-w06970')
  it('accepts valid pairs, empty included; keeps the order', () => {
    expect(checkGeologySelection({ ref_ids: [] }, cat).ok).toBe(true)
    const ids = [mine[2].ref_id, mine[0].ref_id]
    const r = checkGeologySelection({ ref_ids: ids }, cat)
    expect(r.ok && r.selection.ref_ids).toEqual(ids)
  })
  it('rejects foreign or invented unit/sector/source, without repairing', () => {
    const other = cat.refs.find((r) => r.site_id === 'ar-win-s2580-w06710' && r.unit_id)!
    const forged = `cl-win-s2500-w06970|geo|${other.unit_id}|${other.purpose}`
    for (const id of [forged, 'zz|geo|site|contrastar_escala', mine[0].ref_id + 'x', '', 'cl-win-s2500-w06970|geo|site|invento_propositos']) {
      expect(checkGeologySelection({ ref_ids: [id] }, cat).ok, id).toBe(false)
    }
  })
  it('rejects an inapplicable purpose: gap in a 100% sector, reference in a 0% sector', () => {
    expect(checkGeologySelection({ ref_ids: ['ar-win-s2580-w06710|geo|site|verificar_hueco_cartografico'] }, cat).ok).toBe(false)
    expect(checkGeologySelection({ ref_ids: ['ar-win-s2640-w06730|geo|site|contrastar_escala'] }, cat).ok).toBe(false)
  })
  it('rejects repeats, more than 3 per sector, more than 12 and disallowed shapes', () => {
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
  it('the deterministic selection respects caps, is valid and does not depend on the objective', () => {
    const d = deterministicGeologyRefs(cat)
    expect(checkGeologySelection(d, cat).ok).toBe(true)
    expect(d.ref_ids.length).toBeLessThanOrEqual(MAX_REFS_TOTAL)
    const other = catalogFor(base({ brief: 'Muestreo de rocas con instrumentos.', activity: 'Muestreo' })).cat
    expect(deterministicGeologyRefs(other).ref_ids).toEqual(d.ref_ids)
  })
  it('the view always carries the sector limits even when the selection is empty', () => {
    const v = composeGeologyGuidance(cat, [], 'anthropic')
    expect(v.sites.length).toBe(cat.sites.length)
    for (const s of v.sites) expect(s.brief.limits.length).toBeGreaterThanOrEqual(3)
    expect(v.sites.every((s) => s.items.length === 0)).toBe(true)
  })
})

describe('export with geological guidance (wrapper 2, English by default) and compatibility with 1.0 (see englishVersioning.test.ts)', () => {
  const request = base({ requirements: [slope(9)] })
  const evaluation = evaluate(request)
  const m8 = buildMissionExport(request, evaluation, bundle) as Record<string, unknown>
  const cat = buildGeologyCatalog(evaluation, context, ctxFp)
  const det = deterministicGeologyRefs(cat).ref_ids
  const rt = (x: unknown) => JSON.parse(JSON.stringify(x))
  const wrap = () => rt(buildMissionGeologyExport(m8, evaluation, context, ctxFp, { mode: 'deterministic', ref_ids: det }, { bundle }))

  it('a new mission export (1.1.0) is valid, is detected as 1.1 and gains no geology fields', () => {
    const before = canonicalJson(m8)
    expect(validateAnyMissionExport(rt(m8), { })).toEqual({ format: 'mission-export-1.1', issues: [] })
    expect(canonicalJson(m8)).toBe(before)
    expect(Object.keys(m8)).not.toContain('geology_guidance')
    expect(detectMissionExportFormat({ kind: 'otra-cosa' })).toBe('unknown')
    expect(validateAnyMissionExport({ x: 1 }).issues.length).toBe(1)
  })
  it('valid deterministic wrapper; embeds the mission export unchanged and recomputes the evaluation with the snapshot', () => {
    const w = wrap()
    expect(canonicalJson(w.mission_export)).toBe(canonicalJson(m8))
    expect(validateMissionGeologyExport(w, { bundle })).toEqual([])
    expect(validateAnyMissionExport(w, { bundle })).toEqual({ format: 'mission-geology-export-2', issues: [] })
    expect(w.geology_guidance.context_identity.verifiable_from_this_file).toBe(false)
    expect(w.geology_guidance.geology_exports.length).toBe(cat.sites.length)
  })
  it('is reproducible (same bytes) and self-describing without external artifacts', () => {
    expect(JSON.stringify(wrap())).toBe(JSON.stringify(wrap()))
    const text = JSON.stringify(wrap())
    expect(text).toContain('Cartografía regional')
    expect(text).toContain('fingerprint_method')
  })
  it('ai mode: requires the same call (provenance and fingerprints) as the mission explanation', () => {
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
    // without the mission explanation from that call
    expect(() => buildMissionGeologyExport(m8, evaluation, context, ctxFp, { mode: 'ai', ref_ids, ai: { record, provenance } }, { bundle })).toThrow(/same call/)
    // record from another catalog
    expect(() => buildMissionGeologyExport(withAi, evaluation, context, ctxFp, { mode: 'ai', ref_ids, ai: { record: { ...record, catalog_fingerprint: 'a'.repeat(64) }, provenance } }, { bundle })).toThrow(/another context/)
    // tampering with the valid document
    const t1 = rt(doc); t1.geology_guidance.ai.provenance.model = 'otro'
    expect(validateMissionGeologyExport(t1).join()).toMatch(/same call/)
    const t2 = rt(doc); t2.geology_guidance.mode = 'deterministic'
    expect(validateMissionGeologyExport(t2).length).toBeGreaterThan(0)
  })
  it('rejects building with foreign context/fingerprint/evaluation or an invalid selection', () => {
    expect(() => buildMissionGeologyExport(m8, evaluation, context, 'b'.repeat(64), { mode: 'deterministic', ref_ids: det }, { bundle })).toThrow(/fingerprint/)
    expect(() => buildMissionGeologyExport(m8, evaluate(base()), context, ctxFp, { mode: 'deterministic', ref_ids: det }, { bundle })).toThrow(/evaluation/)
    expect(() => buildMissionGeologyExport(m8, evaluation, context, ctxFp, { mode: 'deterministic', ref_ids: ['inventado'] }, { bundle })).toThrow(/Invalid geology selection/)
    expect(() => buildMissionGeologyExport(m8, evaluation, context, ctxFp, { mode: 'deterministic', ref_ids: [cat.refs[0].ref_id] }, { bundle })).toThrow(/deterministic/)
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
  it('a wrapper from another request/evaluation (stale) does not validate with the embedded request changed', () => {
    const w = wrap()
    w.mission_export.request.activity = 'Otra actividad'
    expect(validateMissionGeologyExport(w, { bundle }).length).toBeGreaterThan(0)
  })
})

describe('wrapper integrity (regressions from the independent review)', () => {
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

  it('displaced geometry in the subset: rejected with bundle (anchoring) and by the subset fingerprint without bundle', () => {
    const w = wrap()
    for (const ring of w.geology_guidance.geology_exports[0].site.geometry.coordinates) for (const pt of ring) pt[0] += 0.01
    expect(validateMissionGeologyExport(w, { bundle }).join()).toMatch(/geometry/)
    expect(validateMissionGeologyExport(w).length).toBeGreaterThan(0)
  })
  it('altered citation/source (another URL on the same host): rejected with and without bundle', () => {
    const w = wrap()
    w.geology_guidance.geology_exports[0].source.dataset_url += '?alterado=1'
    expect(validateMissionGeologyExport(w, { bundle }).length).toBeGreaterThan(0)
    expect(validateMissionGeologyExport(w).length).toBeGreaterThan(0)
  })
  it('altered subset request/metadata/description: they change the subset fingerprint', () => {
    for (const mutate of [(w: any) => { w.geology_guidance.geology_exports[0].source.requests[0].bytes += 1 }, (w: any) => { w.geology_guidance.geology_exports[0].source.attribution = 'otra' }, (w: any) => { w.geology_guidance.geology_exports[0].processing.pyproj = 'x' }]) {
      const w = wrap()
      mutate(w)
      expect(validateMissionGeologyExport(w, { bundle }).length).toBeGreaterThan(0)
    }
  })
  it('the subset fingerprint is in the catalog and distinguishes different evidence with the same brief', () => {
    const changed = structuredClone(context)
    changed.sources[0].attribution = 'otra atribución'
    expect(buildGeologyCatalog(evaluation, changed, ctxFp).subset_fingerprint).not.toBe(cat.subset_fingerprint)
    expect(buildGeologyCatalog(evaluation, changed, ctxFp).catalog_fingerprint).not.toBe(cat.catalog_fingerprint)
  })
  it('embedded mission export: AI selection with an invented site rejected with and without bundle; exact reconstruction with bundle', () => {
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
  it('a standalone 1.0 mission export is also audited with bundle; the real M9 export stays valid', () => {
    const real = JSON.parse(readFileSync('../../submission/evidence/m9-dev-ai-export.json', 'utf8'))
    expect(validateAnyMissionExport(real, { bundle })).toEqual({ format: 'mission-export-1.0', issues: [] })
    const tampered = rt(real); tampered.ai.explanation.selection.options[0].site_id = 'inventado'
    expect(validateAnyMissionExport(tampered, { bundle }).issues.length).toBeGreaterThan(0)
    expect(validateAnyMissionExport(tampered).issues.length).toBeGreaterThan(0)
  })
  it('the builder validates the context against the snapshot candidates', () => {
    const moved = structuredClone(context);
    (moved.sites[0].geometry.coordinates[0][0] as number[])[0] += 0.01
    expect(() => buildMissionGeologyExport(m8ai, evaluation, moved, fingerprint(moved), { mode: 'deterministic', ref_ids: [] }, { bundle })).toThrow(/geometry/)
    expect(() => buildMissionGeologyExport({ ...m8ai, evaluation_fingerprint: 'f'.repeat(64) }, evaluation, context, ctxFp, { mode: 'deterministic', ref_ids: [] }, { bundle })).toThrow(/embedded mission export/)
  })
  it('facts without aggressive rounding: original fractions and no overlap in the catalog', () => {
    const u = cat.sites.find((s) => s.site_id === 'cl-win-s2500-w06970')!.units[0]
    expect(u.fraction).toBe(context.sites[0].units.find((x) => x.unit_id === u.unit_id)!.fraction_including_overlap)
    expect(u.fraction_unambiguous).toBeGreaterThan(0)
    expect(cat.sites[0].source.dataset_url).toMatch(/^https:\/\//)
  })
})
