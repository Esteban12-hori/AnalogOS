// ENGLISH-DEFAULT Phase A: explicit text versioning of deterministic records.
// 1) Legacy 1.0.0 / wrapper 1 / geology export v1 outputs are byte-identical to the ones captured BEFORE the change.
// 2) All ten historical exports in submission/evidence still validate and rebuild, with and without the trusted bundle,
//    and substantive tampering, mixed versions and unknown versions are rejected.
// 3) English 1.1.0 / wrapper 2 / geology v2 change wording only: statuses, ranks, metrics, geometry, evidence IDs and
//    geology reference sets are identical to legacy.
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadTrustedBundle } from '../../../../server/ai/facts'
import { loadTrustedGeology } from '../../../../server/ai/geology'
import { buildGeologyExport, validateGeologyExport, type GeologyExport } from '../../../../shared/geology/context'
import {
  GeologyExportError, auditMissionExport, buildMissionGeologyExport, detectMissionExportFormat, validateAnyMissionExport, validateMissionGeologyExport,
} from '../../../../shared/geology/exportWrapper'
import { buildGeologyCatalog, composeGeologyGuidance, deterministicGeologyRefs, type GeologyCatalog } from '../../../../shared/geology/guidance'
import { geologyText } from '../../../../shared/geology/text'
import { EXPORT_LANGUAGE_1_1, missionText } from '../../../../shared/mission/text'
import {
  MissionExportError, buildMissionExport, buildVerificationCatalog, canonicalJson, composeExplanation, deterministicSelection, evaluateMission,
  evaluationFingerprint, fingerprint, type AiProvenance, type EvaluationVersion, type MissionEvaluation, type MissionRequest,
} from '../mission'
import { CASES } from './legacyCases'

const ROOT = resolve(__dirname, '../../../..')
const readJson = (path: string): any => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'))
const rt = <T,>(x: T): any => JSON.parse(JSON.stringify(x))

const bundle = loadTrustedBundle()
const geo = loadTrustedGeology(bundle)
if (geo.status !== 'ready') throw new Error('The official geology package must be present and valid for these tests.')
const { context, fingerprint: ctxFp } = geo
const pinned = readJson('tests/fixtures/mission-legacy-1.0.0-hashes.json')

function build(request: MissionRequest, version: EvaluationVersion) {
  const evaluation = evaluateMission(request, bundle, { version })
  const m8 = buildMissionExport(request, evaluation, bundle) as Record<string, unknown>
  const catalog = buildGeologyCatalog(evaluation, context, ctxFp)
  const det = deterministicGeologyRefs(catalog)
  const wrapper = buildMissionGeologyExport(m8, evaluation, context, ctxFp, { mode: 'deterministic', ref_ids: det.ref_ids }, { bundle })
  return { evaluation, m8, catalog, det, wrapper }
}

describe('legacy 1.0.0 records are byte-identical to the pre-change capture (base 273e5f8)', () => {
  for (const [name, request] of Object.entries(CASES)) {
    it(`${name}: evaluation, export, catalog, guidance, wrapper, verifications and explanation view`, () => {
      const expected = pinned.cases[name]
      const { evaluation, m8, catalog, det, wrapper } = build(request, '1.0.0')
      expect(evaluation.evaluation_version).toBe('1.0.0')
      expect(fingerprint(evaluation)).toBe(expected.evaluation_sha)
      expect(fingerprint(m8)).toBe(expected.export_sha)
      expect(m8).not.toHaveProperty('language')
      expect(catalog.catalog_fingerprint).toBe(expected.catalog_fingerprint)
      expect(fingerprint(composeGeologyGuidance(catalog, det.ref_ids, 'deterministic_template'))).toBe(expected.guidance_sha)
      expect(fingerprint(wrapper)).toBe(expected.wrapper_sha)
      expect(fingerprint(buildVerificationCatalog(evaluation))).toBe(expected.verification_sha)
      expect(fingerprint(composeExplanation(evaluation, deterministicSelection(evaluation), 'deterministic_template'))).toBe(expected.view_sha)
    })
  }
  it('per-site geology export v1 of every sector is byte-identical', () => {
    for (const site of context.sites) expect(fingerprint(buildGeologyExport(context, site.site_id, 1)), site.site_id).toBe(pinned.geology_exports_v1[site.site_id])
  })
})

// --- Historical evidence ------------------------------------------------------------------------------------------

const EVIDENCE = 'submission/evidence'
const historical = readdirSync(resolve(ROOT, EVIDENCE)).filter((f) => f.endsWith('.json')).map((f) => ({ file: f, doc: readJson(`${EVIDENCE}/${f}`) }))
const missionDocs = historical.filter((h) => h.doc.kind === 'analogos-mission-geology-export' || (h.doc.kind === undefined && h.doc.export_version))
const siteExports = historical.filter((h) => h.doc.kind === 'analogos-geology-export')
const candidateOf = (siteId: string) => bundle.candidates.find((c) => c.site_id === siteId) ?? null

/** Rebuilds a wrapper from its own content plus the trusted context/bundle, exactly as the app would. */
function rebuildWrapper(w: any): unknown {
  const m8 = w.mission_export
  const g = w.geology_guidance
  const ai = g.mode === 'ai'
    ? { record: { context_fingerprint: g.context_identity.context_fingerprint, catalog_fingerprint: g.ai.catalog_fingerprint, request_fingerprint: g.ai.request_fingerprint, evaluation_fingerprint: g.ai.evaluation_fingerprint, selection: g.selection }, provenance: g.ai.provenance }
    : undefined
  return buildMissionGeologyExport(m8, m8.evaluation, context, ctxFp, { mode: g.mode, ref_ids: g.selection.ref_ids, ai }, { bundle })
}

describe('the ten historical exports stay valid and reconstructible', () => {
  it('inventory: 2 mission exports 1.0, 6 wrappers v1 and 2 per-site geology exports v1', () => {
    expect(missionDocs.filter((h) => h.doc.export_version === '1.0.0').map((h) => h.file).sort()).toEqual(['m8-dev-ai-export.json', 'm9-dev-ai-export.json'])
    expect(missionDocs.filter((h) => h.doc.kind).length).toBe(6)
    expect(missionDocs.every((h) => (h.doc.kind ? h.doc.schema_version === 1 : true))).toBe(true)
    expect(siteExports.map((h) => h.file).sort()).toEqual(['m9-dev-geology-export.json', 'm9-geology-export.json'])
    expect(siteExports.every((h) => h.doc.schema_version === 1)).toBe(true)
  })
  for (const { file, doc } of missionDocs) {
    it(`${file}: validates with and without the bundle and rebuilds to the same canonical JSON`, () => {
      const format = doc.kind ? 'mission-geology-export-1' : 'mission-export-1.0'
      expect(validateAnyMissionExport(doc, { bundle })).toEqual({ format, issues: [] })
      expect(validateAnyMissionExport(doc)).toEqual({ format, issues: [] })
      const m8 = doc.kind ? doc.mission_export : doc
      expect(m8.export_version).toBe('1.0.0')
      expect(m8.evaluation.evaluation_version).toBe('1.0.0')
      // The engine reproduces the stored evaluation exactly with the frozen 1.0.0 pack (rebuild = full equality).
      expect(canonicalJson(evaluateMission(m8.request, bundle, { version: '1.0.0' }))).toBe(canonicalJson(m8.evaluation))
      if (doc.kind) expect(canonicalJson(rebuildWrapper(doc))).toBe(canonicalJson(doc))
    })
    it(`${file}: substantive tampering, relabeling and unknown versions are rejected`, () => {
      const m8Path = (d: any) => (d.kind ? d.mission_export : d)
      const mutations: Array<[string, (d: any) => void]> = [
        ['status', (d) => { m8Path(d).evaluation.options[0].status = 'priorizado_para_reconocimiento' === m8Path(d).evaluation.options[0].status ? 'evidencia_insuficiente' : 'priorizado_para_reconocimiento' }],
        ['rank', (d) => { m8Path(d).evaluation.options[0].rank = 99 }],
        ['observed value', (d) => { const r = m8Path(d).evaluation.options.flatMap((o: any) => o.requirement_results).find((x: any) => typeof x.observed_value === 'number'); if (r) r.observed_value += 1; else m8Path(d).evaluation.recommended_site_ids.push('x') }],
        ['evidence id', (d) => { m8Path(d).evaluation.evidence[0].evidence_id = 'forged' }],
        ['threshold', (d) => { const r = m8Path(d).request.requirements.find((x: any) => typeof x.value === 'number'); if (r) r.value += 1; else m8Path(d).request.brief += ' ' }],
        ['relabel 1.1.0', (d) => { m8Path(d).export_version = '1.1.0' }],
        ['relabel 1.1.0 + evaluation + language', (d) => { const m = m8Path(d); m.export_version = '1.1.0'; m.evaluation.evaluation_version = '1.1.0'; m.language = EXPORT_LANGUAGE_1_1 }],
        ['unknown version', (d) => { m8Path(d).export_version = '1.2.0' }],
        ['language block on 1.0.0', (d) => { m8Path(d).language = EXPORT_LANGUAGE_1_1 }],
      ]
      if (doc.kind) {
        mutations.push(
          ['wrapper relabel 2', (d) => { d.schema_version = 2 }],
          ['wrapper version 3', (d) => { d.schema_version = 3 }],
          ['geology export relabel v2', (d) => { d.geology_guidance.geology_exports[0].schema_version = 2 }],
          ['geology fraction', (d) => { d.geology_guidance.geology_exports[0].site.area_fractions.unmapped += 0.01 }],
          ['geology unit description', (d) => { const u = d.geology_guidance.geology_exports[0].site.units[0]; if (u) u.description = 'arenisca'; else d.geology_guidance.geology_exports[0].site.verification_questions.push('x') }],
          ['foreign selection', (d) => { d.geology_guidance.selection.ref_ids = ['ar-win-s2640-w06730|geo|site|contrastar_escala'] }],
          ['wrapper wording', (d) => { d.export_info.how_to_read = [...d.export_info.how_to_read, 'Extra.'] }],
        )
      }
      for (const [label, mutate] of mutations) {
        const bad = rt(doc)
        mutate(bad)
        expect(validateAnyMissionExport(bad, { bundle }).issues.length, `${label} (with bundle)`).toBeGreaterThan(0)
        expect(validateAnyMissionExport(bad).issues.length, `${label} (without bundle)`).toBeGreaterThan(0)
      }
    })
  }
  for (const { file, doc } of siteExports) {
    it(`${file}: per-site export v1 validates (anchored and standalone) and equals the rebuilt v1 export`, () => {
      expect(() => validateGeologyExport(doc, candidateOf(doc.site.site_id))).not.toThrow()
      expect(() => validateGeologyExport(doc)).not.toThrow()
      expect(canonicalJson(buildGeologyExport(context, doc.site.site_id, 1))).toBe(canonicalJson(doc))
      const relabeled = rt(doc); relabeled.schema_version = 2
      expect(() => validateGeologyExport(relabeled)).toThrow(/export_info/)
      const moved = rt(doc); moved.site.geometry.coordinates[0][0][0] += 0.01
      expect(() => validateGeologyExport(moved, candidateOf(doc.site.site_id))).toThrow()
    })
  }
})

// --- English 1.1.0 vs legacy 1.0.0: same science -----------------------------------------------------------------

function science(ev: MissionEvaluation) {
  return {
    request_fingerprint: ev.request_fingerprint, rules_version: ev.rules_version, snapshot_version: ev.snapshot_version, profile: ev.profile, outcome: ev.outcome,
    comparability: ev.comparability, recommended_site_ids: ev.recommended_site_ids, none_prioritized: ev.none_prioritized,
    pending_requirements: ev.pending_requirements, open_questions: ev.open_questions,
    resolution: { ...ev.resolution, notes: ev.resolution.notes.length },
    options: ev.options.map((o) => ({
      ...o, what_would_change: o.what_would_change.length,
      requirement_results: o.requirement_results.map((r) => ({ ...r, required: null, reason: null, scale_note: r.scale_note === null, conversion: r.conversion === null })),
    })),
    evidence: ev.evidence.map((e) => ({ ...e, claim: e.kind === 'artifact' ? e.claim : null })),
    data_request: ev.data_request && { ...ev.data_request, note: null, planned_sources: ev.data_request.planned_sources.map((p) => ({ ...p, product: p.dataset_id === 'nasadem-hgt-001' ? null : p.product })) },
    limits: ev.limits.length,
  }
}

function catalogScience(cat: GeologyCatalog) {
  return {
    context_fingerprint: cat.context_fingerprint, request_fingerprint: cat.request_fingerprint, scope_mode: cat.scope_mode,
    sites: cat.sites.map((s) => ({ ...s, limits: s.limits.length })),
    refs: cat.refs.map((r) => ({ ref_id: r.ref_id, site_id: r.site_id, unit_id: r.unit_id, purpose: r.purpose })),
    excluded: cat.excluded.map((e) => ({ site_id: e.site_id, name: e.name })),
  }
}

const SPANISH_AUTHORED = /[áéíóúñ¿¡«»]|\b(del|los|las|para|valor|ventana|cumple|requisitos?|sectores|evidencia|orientaci|medici|que|una?|el|la)\b/i

describe('English 1.1.0 is the default and changes wording only', () => {
  it('the Spanish-wording detector is not vacuous: it flags every frozen 1.0.0 authored text', () => {
    const es = missionText('1.0.0')
    const g1 = geologyText(1)
    for (const s of [...es.limits, es.orderingRule, ...Object.values(es.statusDefinitions), es.dataRequestNote, es.pointScaleReason, ...Object.values(es.scopeNotes).filter((x) => typeof x === 'string'), ...g1.wrapper.howToRead, g1.limits.noCoverage, ...Object.values(g1.notice)]) {
      expect(s, s).toMatch(SPANISH_AUTHORED)
    }
  })
  for (const [name, request] of Object.entries(CASES)) {
    it(`${name}: identical statuses, ranks, metrics, geometry, evidence and geology references`, () => {
      const es = build(request, '1.0.0')
      const en = build(request, '1.1.0')
      expect(evaluateMission(request, bundle).evaluation_version).toBe('1.1.0')
      expect(canonicalJson(evaluateMission(request, bundle))).toBe(canonicalJson(en.evaluation))
      expect(science(en.evaluation)).toEqual(science(es.evaluation))
      expect(evaluationFingerprint(en.evaluation)).not.toBe(evaluationFingerprint(es.evaluation))
      expect(catalogScience(en.catalog)).toEqual(catalogScience(es.catalog))
      expect(en.det).toEqual(es.det)
      expect(buildVerificationCatalog(en.evaluation).map((v) => v.id)).toEqual(buildVerificationCatalog(es.evaluation).map((v) => v.id))
      const strip = (e: GeologyExport) => ({ ...e, schema_version: null, export_info: { ...e.export_info, description: null, how_to_read: null } })
      expect((en.wrapper as any).geology_guidance.geology_exports.map(strip)).toEqual((es.wrapper as any).geology_guidance.geology_exports.map(strip))
    })
    it(`${name}: English export/wrapper validate, rebuild and carry English authored text`, () => {
      const { evaluation, m8, catalog, wrapper } = build(request, '1.1.0')
      expect(m8.export_version).toBe('1.1.0')
      expect(m8.language).toEqual(EXPORT_LANGUAGE_1_1)
      expect((m8.rules as any).status_definitions).toEqual(missionText('1.1.0').statusDefinitions)
      expect(validateAnyMissionExport(rt(m8), { bundle })).toEqual({ format: 'mission-export-1.1', issues: [] })
      expect(validateAnyMissionExport(rt(m8))).toEqual({ format: 'mission-export-1.1', issues: [] })
      const w = rt(wrapper)
      expect(w.schema_version).toBe(2)
      expect(w.export_info.embedded_mission_export_version).toBe('1.1.0')
      expect(w.geology_guidance.geology_exports.every((e: any) => e.schema_version === 2)).toBe(true)
      expect(validateAnyMissionExport(w, { bundle })).toEqual({ format: 'mission-geology-export-2', issues: [] })
      expect(validateAnyMissionExport(w)).toEqual({ format: 'mission-geology-export-2', issues: [] })
      expect(canonicalJson(rebuildWrapper(w))).toBe(canonicalJson(w))
      expect(JSON.stringify(build(request, '1.1.0').wrapper)).toBe(JSON.stringify(wrapper)) // same bytes
      // Authored strings are English. User labels and the quoted snapshot explanation (source text) are removed first.
      const labels = request.requirements.map((r) => r.label)
      const authored = (s: string) => labels.reduce((acc, l) => acc.split(l).join(''), s.replace(/Snapshot explanation \(original source text, Spanish\): .*$/, ''))
      const strings = [
        ...evaluation.limits, evaluation.ordering_rule, ...evaluation.resolution.notes, evaluation.data_request?.note ?? '',
        ...evaluation.options.flatMap((o) => [...o.what_would_change.map((x) => x.replace(/: .*$/, '')), ...o.requirement_results.flatMap((r) => [r.reason, r.required, r.scale_note ?? '', r.conversion ?? ''])]),
        ...evaluation.evidence.filter((e) => e.kind === 'app_derived').map((e) => e.claim),
        ...Object.values((m8.rules as any).status_definitions as Record<string, string>), (m8.rules as any).ordering_rule,
        ...catalog.refs.map((r) => r.text.replace(/“[^”]*”/g, '')), ...catalog.sites.flatMap((s) => s.limits.map((l) => l.replace(/\([^)]*\)/g, ''))), ...catalog.excluded.map((e) => e.reason),
        ...w.export_info.how_to_read.slice(0, -1), w.export_info.description, w.geology_guidance.guidance.notice, w.geology_guidance.context_identity.note,
      ]
      for (const s of strings) expect(authored(s), s).not.toMatch(SPANISH_AUTHORED)
    })
  }
  it('English numbers keep full precision: grouping, decimals, ratios and % thresholds', () => {
    const es = build(CASES.catalog_mixed, '1.0.0').evaluation.options[0].requirement_results
    const en = build(CASES.catalog_mixed, '1.1.0').evaluation.options[0].requirement_results
    const by = (rs: typeof en, id: string) => rs.find((r) => r.requirement_id === id)!
    expect(by(en, 'area').required).toContain('≥ 12,345.5 km²')
    expect(by(es, 'area').required).toContain('≥ 12.345,5 km²')
    expect(by(en, 'rough').required).toContain('between 0.5 and 1,234.5 m')
    expect(by(es, 'rough').required).toContain('entre 0,5 y 1234,5 m')
    expect(by(en, 'bare').required).toContain('≥ 95%')
    expect(by(en, 'bare').reason).toMatch(/^Observed value [\d.]+ \(fraction 0–1; [\d.]+%\) (meets|does not meet) the condition ≥ 0?\.?95%?/)
    expect(by(en, 'bare').observed_value).toBe(by(es, 'bare').observed_value)
    expect(by(en, 'country').required).toContain('one of CL, AR')
    const text = missionText('1.1.0')
    expect(text.fmtNumber(1e-7)).toBe('1e-7')
    expect(text.fmtNumber(-1234567.125)).toBe('-1,234,567.125')
    expect(text.fmtNumber(0.30000000000000004)).toBe('0.30000000000000004')
  })
  it('coverage formatting keeps the honest boundaries in both versions', () => {
    const en = geologyText(2).formatCoverage
    const es = geologyText(1).formatCoverage
    expect([0, 0.00001, 0.0005, 0.5, 0.123456, 0.9995, 0.99999999, 1].map(en)).toEqual(['0%', '<0.1%', '<0.1%', '50.0%', '12.3%', '>99.9%', '>99.9%', '100%'])
    expect([0, 0.00001, 0.5, 0.9995, 1].map(es)).toEqual(['0 %', '<0,1 %', '50,0 %', '>99,9 %', '100 %'])
    expect(geologyText(2).formatScaleLabel(250000)).toBe('1:250,000')
    expect(geologyText(1).formatScaleLabel(250000)).toBe('1:250.000')
  })
})

// --- AI records, mixed and unknown versions ------------------------------------------------------------------------

const provenance: AiProvenance = { provider: 'anthropic', model: 'claude-sonnet-5-5', request_id: 'req_test', created_at: '2026-11-15T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }

describe('AI records stay bound to their version; mixed and unknown versions fail', () => {
  const request = CASES.sector_ar6_geology
  it('an English wrapper with an AI selection validates; a legacy AI record cannot be attached to an English evaluation', () => {
    const ev = evaluateMission(request, bundle)
    const selection = deterministicSelection(ev)
    const explanation = { provenance, selection, request_fingerprint: ev.request_fingerprint, evaluation_fingerprint: evaluationFingerprint(ev) }
    const m8 = buildMissionExport(request, ev, bundle, { explanation }) as Record<string, unknown>
    const cat = buildGeologyCatalog(ev, context, ctxFp)
    const refIds = cat.refs.filter((r) => r.purpose === 'caracterizar_material_superficial').slice(0, 2).map((r) => r.ref_id)
    const record = { context_fingerprint: ctxFp, catalog_fingerprint: cat.catalog_fingerprint, request_fingerprint: cat.request_fingerprint, evaluation_fingerprint: cat.evaluation_fingerprint, selection: { ref_ids: refIds } }
    const w = rt(buildMissionGeologyExport(m8, ev, context, ctxFp, { mode: 'ai', ref_ids: refIds, ai: { record, provenance } }, { bundle }))
    expect(validateAnyMissionExport(w, { bundle })).toEqual({ format: 'mission-geology-export-2', issues: [] })
    expect(w.geology_guidance.guidance.notice).toBe(geologyText(2).notice.anthropic)
    // Same request, legacy evaluation: the English-bound AI record is rejected, and vice versa.
    const legacy = evaluateMission(request, bundle, { version: '1.0.0' })
    expect(() => buildMissionExport(request, legacy, bundle, { explanation })).toThrow(MissionExportError)
    const legacyCat = buildGeologyCatalog(legacy, context, ctxFp)
    expect(legacyCat.catalog_fingerprint).not.toBe(cat.catalog_fingerprint)
    const legacyM8 = buildMissionExport(request, legacy, bundle, { explanation: { ...explanation, evaluation_fingerprint: evaluationFingerprint(legacy) } }) as Record<string, unknown>
    expect(() => buildMissionGeologyExport(legacyM8, legacy, context, ctxFp, { mode: 'ai', ref_ids: refIds, ai: { record, provenance } }, { bundle })).toThrow(GeologyExportError)
  })
  it('public builders reject unknown versions instead of choosing English', () => {
    expect(() => evaluateMission(request, bundle, { version: '1.2.0' as never })).toThrow(/Unsupported/)
    const ev = evaluateMission(request, bundle)
    expect(() => buildMissionExport(request, { ...ev, evaluation_version: '2.0.0' as never }, bundle)).toThrow(MissionExportError)
    expect(() => buildMissionExport(request, { ...ev, evaluation_version: undefined as never }, bundle)).toThrow(MissionExportError)
    expect(() => buildGeologyCatalog({ ...ev, evaluation_version: '9' as never }, context, ctxFp)).toThrow(/Unsupported/)
    expect(() => buildGeologyExport(context, 'ar-win-s2580-w06710', 0 as never)).toThrow()
    const m8 = buildMissionExport(request, ev, bundle) as Record<string, unknown>
    const cat = buildGeologyCatalog(ev, context, ctxFp)
    expect(() => buildMissionGeologyExport({ ...m8, export_version: '1.9.0' }, ev, context, ctxFp, { mode: 'deterministic', ref_ids: deterministicGeologyRefs(cat).ref_ids }, { bundle })).toThrow(GeologyExportError)
    expect(detectMissionExportFormat({ ...m8, export_version: '1.2.0' })).toBe('unknown')
    expect(detectMissionExportFormat({ kind: 'analogos-mission-geology-export', schema_version: 3 })).toBe('unknown')
  })
  it('mixed versions are rejected structurally and semantically', () => {
    const en = build(request, '1.1.0')
    const es = build(request, '1.0.0')
    const m8 = rt(en.m8)
    const cases: Array<[string, any]> = [
      ['1.1.0 without language', (() => { const d = rt(m8); delete d.language; return d })()],
      ['1.1.0 with Spanish rules', (() => { const d = rt(m8); d.rules = rt(es.m8).rules; return d })()],
      ['1.1.0 with Spanish limits', (() => { const d = rt(m8); d.evaluation.limits = es.evaluation.limits; return d })()],
      ['1.1.0 with edited language note', (() => { const d = rt(m8); d.language.source_evidence_note = 'All text is English.'; return d })()],
      ['1.1.0 export with 1.0.0 evaluation', (() => { const d = rt(m8); d.evaluation = rt(es.evaluation); return d })()],
      ['1.0.0 export with 1.1.0 evaluation', (() => { const d = rt(es.m8); d.evaluation = rt(en.evaluation); return d })()],
    ]
    for (const [label, doc] of cases) {
      expect(auditMissionExport(doc).length, label).toBeGreaterThan(0)
      expect(auditMissionExport(doc, bundle).length, label).toBeGreaterThan(0)
    }
    const w2 = rt(en.wrapper)
    const w1 = rt(es.wrapper)
    const wrappers: Array<[string, any]> = [
      ['wrapper 2 embedding 1.0.0', { ...rt(w2), mission_export: rt(es.m8) }],
      ['wrapper 1 embedding 1.1.0', { ...rt(w1), mission_export: rt(en.m8) }],
      ['wrapper 2 with v1 geology exports', (() => { const d = rt(w2); d.geology_guidance.geology_exports = rt(w1).geology_guidance.geology_exports; return d })()],
      ['wrapper 2 with Spanish wrapper text', (() => { const d = rt(w2); d.export_info.description = w1.export_info.description; return d })()],
      ['wrapper 2 with Spanish identity note', (() => { const d = rt(w2); d.geology_guidance.context_identity.note = w1.geology_guidance.context_identity.note; return d })()],
      ['wrapper 2 with Spanish guidance', (() => { const d = rt(w2); d.geology_guidance.guidance = rt(w1).geology_guidance.guidance; return d })()],
      ['wrapper 1 relabeled 2', { ...rt(w1), schema_version: 2 }],
    ]
    for (const [label, doc] of wrappers) {
      expect(validateMissionGeologyExport(doc, { bundle }).length, label).toBeGreaterThan(0)
      expect(validateMissionGeologyExport(doc).length, label).toBeGreaterThan(0)
    }
  })
})
