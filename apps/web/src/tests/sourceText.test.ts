// English display layer for Spanish source text: coverage over every exposed string of the active artifacts,
// no mutation of artifacts or engine inputs, labeled fallback and untouched audit JSON.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GEOLOGY_UNIT_DESCRIPTION_EN, GEOLOGY_UNIT_NAME_EN, unitDescriptionEn, unitNameDisplay, unitNameEn } from '../i18n/geologyGloss'
import { KEEP_ORIGINAL, ORIGINAL_WORDING_MARK, SOURCE_TEXT_EN, displaySource, looksSpanish, sourceTextEn, verificationDisplayText } from '../i18n/sourceText'
import { buildMissionExport, canonicalJson, evaluateMission, fingerprint } from '../mission'
import { evaluateExample, v3Bundle } from './v3Support'

const ROOT = resolve(__dirname, '../../../..')
const read = (path: string): any => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'))
const raw = (path: string): string => readFileSync(resolve(ROOT, path), 'utf8')

/** Strings at the given dotted paths (`[]` walks arrays, `*` walks object values). */
function at(doc: unknown, path: string): string[] {
  const parts = path.split('.').filter(Boolean)
  let nodes: unknown[] = [doc]
  for (const part of parts) {
    const next: unknown[] = []
    for (const n of nodes) {
      if (n === null || typeof n !== 'object') continue
      if (part === '[]') { if (Array.isArray(n)) next.push(...n); continue }
      const key = part.replace(/\[\]$/, '')
      const value = key === '*' ? Object.values(n as object) : [(n as Record<string, unknown>)[key]]
      for (const v of value) {
        if (part.endsWith('[]') && Array.isArray(v)) next.push(...v)
        else if (v !== undefined) next.push(v)
      }
    }
    nodes = next
  }
  return nodes.flatMap((n) => (typeof n === 'string' ? [n] : Array.isArray(n) ? n.filter((x): x is string => typeof x === 'string') : []))
}

// Every field the UI or the printed report shows from the active artifacts.
const EXPOSED: Record<string, string[]> = {
  'artifacts/science-v3/candidate-details.json': ['[].name', '[].warnings[]', '[].limitations[]', '[].field_checks[]', '[].evidence[].claim', '[].score_breakdown[].explanation', '[].discovery.note', '[].literature_review.note'],
  'artifacts/science-v3/manifest.json': ['datasets[].product', 'datasets[].provider', 'datasets[].spatial_resolution', 'datasets[].temporal_resolution', 'datasets[].units', 'datasets[].license', 'datasets[].quality_notes[]', 'datasets[].transformations[]', 'datasets[].crs'],
  'artifacts/science-v3/mission-profile.json': ['name', 'purpose', 'limitations[]', 'criteria[].label', 'planetary_reference.notes'],
  'artifacts/science-v3/precedents.json': ['scope_note', 'reviewed_by', 'relation_definitions.*', 'precedents[].name', 'precedents[].activity', 'precedents[].spatial_precision', 'precedents[].study_area.description', 'precedents[].sources[].finding', 'context_sources[].note', 'searches[].scope', 'searches[].finding'],
  'artifacts/science-v3/search-results.json': ['scope_note', 'windows[].name', 'windows[].decision_reason', 'regions[].name', 'stage1.name', 'selection.order', 'mola_reference.name'],
  'artifacts/science-v3/analysis-summary.json': ['method', 'mola_reference.name', 'sites[].visual_observation'],
  'artifacts/visual-context-v3/index.json': ['sites[].name', 'limitations[]', 'source.attribution', 'source.authentication', 'product.period_label', 'product.mosaicking', 'product.transformation', 'product.image_format'],
  'artifacts/geology-context-v1/index.json': ['limitations[]', 'editorial_note', 'sites[].name', 'sites[].verification_questions[]', 'sources[].authority_original', 'sources[].distributor', 'sources[].dataset_name', 'sources[].layer', 'sources[].attribution', 'sources[].map_date_note', 'sources[].transformations[]', 'sources[].limitations[]', 'sources[].license.name', 'sources[].license.scope', 'sources[].license.declared_by'],
  'artifacts/basemaps/basemaps.json': ['purpose', 'projection', 'license', 'basemaps[].label', 'basemaps[].source', 'context_previews[].transformation'],
  'config/reference_analogs.json': ['analogs[].name', 'analogs[].country', 'analogs[].summary'],
}

describe('English display text for Spanish source data', () => {
  for (const [file, paths] of Object.entries(EXPOSED)) {
    it(`${file}: every exposed Spanish string has an English display rendering (or is a kept official name)`, () => {
      const doc = read(file)
      const missing: string[] = []
      let checked = 0
      for (const path of paths) {
        for (const s of at(doc, path)) {
          if (!looksSpanish(s) && !/\d,\d/.test(s)) continue // Spanish prose or a decimal comma needs an entry
          checked += 1
          if (sourceTextEn(s) === null) missing.push(`${path}: ${s}`)
        }
      }
      expect(missing).toEqual([])
      expect(checked).toBeGreaterThan(0)
    })
  }
  it('every official geology unit name and description in the active package has a labeled English gloss', () => {
    const doc = read('artifacts/geology-context-v1/index.json')
    const units = doc.sites.flatMap((s: any) => s.units)
    expect(units.length).toBeGreaterThan(10)
    for (const u of units) {
      expect(unitNameEn(u.name), u.name).not.toBeNull()
      if (u.description !== null) expect(unitDescriptionEn(u.description), u.description).not.toBeNull()
    }
    // No orphan glosses: every key is a real unit of the package (the map is not padded with invented units).
    const names = new Set(units.map((u: any) => u.name))
    const descriptions = new Set(units.map((u: any) => u.description))
    expect(Object.keys(GEOLOGY_UNIT_NAME_EN).filter((k) => !names.has(k))).toEqual([])
    expect(Object.keys(GEOLOGY_UNIT_DESCRIPTION_EN).filter((k) => !descriptions.has(k))).toEqual([])
    expect(unitNameDisplay('Formación Geste', '27692010')).toBe('Formación Geste — Geste Formation')
  })
  it('generated names keep the place name and translate only the coordinates; scale notes translate the quoted source', () => {
    expect(displaySource('Interior de Antofagasta · 25,0° S, 69,7° O')).toBe('Interior de Antofagasta · 25.0° S, 69.7° W')
    expect(displaySource('Pampa Yungay — sector de screening')).toBe('Pampa Yungay — screening sector')
    const note = 'Median over the full window, NASADEM aggregated to ~471 m; not a point slope. Snapshot explanation (original source text, Spanish): Relieve mediano 3×3 sobre NASADEM agregado comparado con la ventana regional MOLA.'
    expect(displaySource(note)).toBe('Median over the full window, NASADEM aggregated to ~471 m; not a point slope. Snapshot explanation (English translation of the Spanish source): Median 3×3 relief on aggregated NASADEM compared with the regional MOLA window.')
  })
  it('text without an entry is never invented nor labeled by guessing its language; codes and English pass through', () => {
    expect(displaySource('Una frase nueva que no está en el mapa.')).toBe('Una frase nueva que no está en el mapa.')
    // Review regressions: English prose and English instructions with user-owned Spanish labels stay unmarked.
    expect(displaySource('No valid observation is available.')).toBe('No valid observation is available.')
    expect(displaySource('Obtain a measurement of “tracción” at the required scale.')).toBe('Obtain a measurement of “tracción” at the required scale.')
    for (const s of ['No valid observation is available.', 'Obtain a measurement of “tracción” at the required scale.']) expect(displaySource(s)).not.toContain(ORIGINAL_WORDING_MARK)
    expect(displaySource('Azua-Bustos, Caro-Lara y Vicuña (2015). Discovery and microbial content of the driest site of the hyperarid Atacama Desert, Chile. Environ Microbiol Rep 7(3):388–394.')).toMatch(/^Azua-Bustos/)
    expect(displaySource('0,0003° nominal (~30 m)')).toBe('0.0003° nominal (~30 m)')
    expect(displaySource('SEGEMAR, Sistema de Información Geológica Ambiental Minera (SIGAM), servicio WFS público')).toBe('SEGEMAR, Sistema de Información Geológica Ambiental Minera (SIGAM), public WFS service')
    expect(displaySource('NASADEM_HGT.001')).toBe('NASADEM_HGT.001')
    expect(displaySource('Already English text.')).toBe('Already English text.')
    expect(displaySource('Geología Base')).toBe('Geología Base')
    expect(KEEP_ORIGINAL.has('SEGEMAR (Servicio Geológico Minero Argentino)')).toBe(true)
    expect(Object.values(SOURCE_TEXT_EN).filter((en) => /[¿¡«»]/.test(en))).toEqual([])
  })
  it('display translation never mutates artifacts or engine inputs; evaluation and audit JSON keep the original wording', () => {
    const before = raw('artifacts/science-v3/candidate-details.json')
    const bundleBefore = canonicalJson(v3Bundle)
    const { request, evaluation } = evaluateExample()
    for (const o of evaluation.options) for (const s of [...o.field_checks, ...o.limitations]) displaySource(s)
    expect(canonicalJson(v3Bundle)).toBe(bundleBefore)
    expect(raw('artifacts/science-v3/candidate-details.json')).toBe(before)
    expect(fingerprint(evaluateMission(request, v3Bundle))).toBe(fingerprint(evaluation))
    const exported = JSON.stringify(buildMissionExport(request, evaluation, v3Bundle))
    // Source evidence stays verbatim in the audit JSON; translations are display-only.
    expect(exported).toContain('Levantar obstáculos, pendiente y rugosidad a escala centimétrica/decimétrica.')
    expect(exported).not.toContain('Survey obstacles, slope and roughness')
  })
})

describe('verification provenance (review regression)', () => {
  it('only snapshot field checks (<site_id>|fc|n) use the translation layer; generated instructions keep user labels as written', () => {
    const site = 'cl-win-s2500-w06970'
    const fieldCheck = 'Levantar obstáculos, pendiente y rugosidad a escala centimétrica/decimétrica.'
    expect(verificationDisplayText({ id: `${site}|fc|1`, site_id: site, text: fieldCheck })).toBe('Survey obstacles, slope and roughness at centimeter/decimeter scale.')
    const generated = 'Obtain a measurement of “tracción” at the required scale.'
    expect(verificationDisplayText({ id: `${site}|req|u1`, site_id: site, text: generated })).toBe(generated)
    // A user label that happens to equal a source string is NOT translated inside a generated instruction.
    const confirm = `Confirm the failure of “${fieldCheck}” or review whether the requirement is essential.`
    expect(verificationDisplayText({ id: `${site}|req|x`, site_id: site, text: confirm })).toBe(confirm)
    // The prefix is anchored to the item's own site id.
    expect(verificationDisplayText({ id: `other|fc|1`, site_id: site, text: fieldCheck })).toBe(fieldCheck)
  })
})
