// ADR-017 · scientific text of the artifacts by interface language (area ai-science). In Spanish the geology card shows
// the ORIGINAL artifact wording (no English rendering, no gloss, no “original wording” mark, no lang="es"); in English it
// keeps going through sourceText/geologyGloss exactly as before (geologyContext.test.tsx and sourceText.test.ts stay as
// they are). Facts, figures, the download and the record are identical in both languages; only presentation changes.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GeologyContextView } from '../components/GeologyContext'
import { loadGeologyContext } from '../data/loadGeologyContext'
import type { CandidateSite } from '../domain/contracts'
import {
  GEOLOGY_CRITERION_ID,
  GEOLOGY_LIMITATION_WITH_CONTEXT,
  GEOLOGY_PENDING_WITH_CONTEXT,
  HISTORICAL_GEOLOGY_LIMITATION,
  availabilityHint,
  criterionExplanation,
  geologyDisplayText,
  geologyReasonText,
  limitationText,
} from '../domain/geologyCopy'
import {
  AVAILABILITY_HINT,
  AVAILABILITY_LABEL,
  buildGeologyExport,
  formatCoverage,
  formatScaleLabel,
  parseGeologyContext,
  selectGeologySite,
  type GeologyContext,
  type GeologyContextState,
} from '../domain/geologyContext'
import { setLocale } from '../i18n/core'
import { GEOLOGY_UNIT_DESCRIPTION_EN, GEOLOGY_UNIT_NAME_EN, GLOSS_LABEL, ORIGINAL_LABEL } from '../i18n/geologyGloss'
import { tScience } from '../i18n/messages/science'
import { displayGeologyPack } from '../i18n/recordText'
import { ORIGINAL_WORDING_MARK, displaySource } from '../i18n/sourceText'

const root = resolve(__dirname, '../../../..')
const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const candidates = readJson('artifacts/science-v3/candidate-details.json') as CandidateSite[]
const fixtures = readJson('artifacts/demo/candidate-details.json') as CandidateSite[]
const real = parseGeologyContext(readJson('artifacts/geology-context-v1/index.json'), candidates)
const ready: GeologyContextState = { status: 'ready', context: real }
const quiet = { persist: false, updateUrl: false } as const
const byId = (id: string) => candidates.find((candidate) => candidate.site_id === id)!
const site = (context: GeologyContext, id: string) => context.sites.find((item) => item.site_id === id)!

function render(candidate: CandidateSite, state: GeologyContextState): string {
  return renderToStaticMarkup(<GeologyContextView candidateName={candidate.name} selection={selectGeologySite(state, candidate)} onDownload={() => undefined} />)
}
function renderEs(candidate: CandidateSite, state: GeologyContextState): string {
  setLocale('es', quiet)
  return render(candidate, state)
}
/** Visible text and attribute values without tags or React separators (to search for whole sentences). */
const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ')

/** Every artifact string the card can show for a site (all of them Spanish evidence). */
function artifactTexts(context: GeologyContext, siteId: string): string[] {
  const s = site(context, siteId)
  const source = context.sources.find((item) => item.source_id === s.source_id)!
  return [
    source.distributor, source.layer, source.attribution, source.map_date_note, source.license.name, source.license.scope,
    ...source.transformations, ...source.limitations, ...context.limitations, ...s.verification_questions, context.editorial_note,
  ]
}

describe('geology card in Spanish', () => {
  it('Spanish interface text, es-CL figures and the frozen Spanish availability wording', () => {
    const html = renderEs(byId('cl-win-s2500-w06970'), ready)
    const visible = text(html)
    for (const expected of [
      'Contexto geológico', 'Cartografía regional · no mide el terreno', 'Cobertura parcial', 'Escala 1:1.000.000',
      'Hay parte sin cobertura, solapes entre unidades o descripciones ausentes. Se muestran por separado.',
      'Cubierto por la capa', 'Solape entre unidades distintas', '99,4 %', 'Autoridad: SERNAGEOMIN',
      'no es resolución en metros', 'No informada por la fuente.', 'compatibilidad planetaria calibrada',
      'Unidades cartografiadas', 'Fuente, escala y procedencia', 'Qué verificar en terreno',
      'Descargar contexto geológico (registro JSON de la fuente)',
    ]) expect(visible, expected).toContain(expected)
    expect(html).toContain('aria-label="Reparto del área de')
    expect(html).toContain('cl-win-s2500-w06970-geology-context.json') // download filename unchanged
    // Prudent wording: no suitability claims in either language.
    expect(visible).not.toMatch(/\bapto\b|\bsegur[oa]\b|\bvalidad[oa]\b|\baprobad[oa]\b|tracción conocida|granulometría medida/i)
  })

  it('artifact text is the original wording: no English rendering, gloss, label, mark or lang="es"', () => {
    for (const candidate of candidates) {
      const html = renderEs(candidate, ready)
      const visible = text(html)
      expect(html, candidate.site_id).not.toContain('lang="es"')
      expect(visible).not.toContain(GLOSS_LABEL)
      expect(visible).not.toContain(ORIGINAL_LABEL)
      expect(visible).not.toContain(ORIGINAL_WORDING_MARK.trim())
      for (const original of artifactTexts(real, candidate.site_id)) {
        expect(visible, original).toContain(original.replace(/\s+/g, ' '))
        const english = displaySource(original)
        if (english !== original) expect(visible, english).not.toContain(english)
      }
      for (const unit of site(real, candidate.site_id).units) {
        if (unit.name) expect(visible).toContain(unit.name)
        if (unit.description) expect(visible).toContain(unit.description)
        const nameEn = unit.name ? GEOLOGY_UNIT_NAME_EN[unit.name] : undefined
        const descriptionEn = unit.description ? GEOLOGY_UNIT_DESCRIPTION_EN[unit.description] : undefined
        if (nameEn && nameEn !== unit.name) expect(visible).not.toContain(nameEn)
        if (descriptionEn && descriptionEn !== unit.description) expect(visible).not.toContain(descriptionEn)
      }
    }
  })

  it('the same selection renders English or Spanish only by the current language (nothing stored)', () => {
    const candidate = byId('ar-win-s2620-w06750')
    const en1 = render(candidate, ready)
    const es = renderEs(candidate, ready)
    setLocale('en', quiet)
    const en2 = render(candidate, ready)
    expect(en2).toBe(en1)
    expect(es).not.toBe(en1)
    expect(text(en1)).toContain('50.0%')
    expect(text(es)).toContain('50,0 %')
    expect(text(en1)).toContain(GLOSS_LABEL) // English keeps the labeled glosses (ADR-016)
    expect(en1).toContain('lang="es"')
  })

  it('no coverage, full coverage and missing descriptions in Spanish', () => {
    const none = text(renderEs(byId('ar-win-s2640-w06730'), ready))
    expect(none).toContain('Sin cobertura en esta capa')
    expect(none).toContain('No significa que no haya rocas ni descarta el sector.')
    expect(none).toContain('Esta capa no tiene unidades dentro del sector.')
    const full = text(renderEs(byId('ar-win-s2580-w06710'), ready))
    expect(full).toContain('Cobertura cartográfica completa')
    expect(full).toContain('100 %')
    const edited = JSON.parse(JSON.stringify(real)) as GeologyContext
    const unit = site(edited, 'ar-win-s2580-w06710').units[0]
    unit.name = null
    unit.description = null
    unit.description_present = false
    const html = renderEs(byId('ar-win-s2580-w06710'), { status: 'ready', context: edited })
    expect(text(html)).toContain('Sin nombre en la fuente')
    expect(text(html)).toContain('Sin descripción en la fuente: no se completa ni se infiere.')
    expect(text(html)).toContain('del sector')
  })

  it('“not available” in Spanish for every known reason; an unknown technical detail is shown as is', async () => {
    const candidate = byId('cl-win-s2500-w06970')
    const reasons: string[] = []
    reasons.push((selectGeologySite(ready, fixtures[0]) as { reason: string }).reason)
    const other = { ...candidate, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } } as CandidateSite
    reasons.push((selectGeologySite(ready, other) as { reason: string }).reason)
    const states = await Promise.all([
      loadGeologyContext(candidates, { fetcher: async () => new Response('', { status: 404 }) }),
      loadGeologyContext(candidates, { fetcher: async () => new Response('x'.repeat(2.5 * 1024 * 1024)) }),
      loadGeologyContext(candidates, { fetcher: async () => ({ ok: true, status: 200, headers: new Headers(), text: () => new Promise<string>(() => undefined) }) as unknown as Response, timeoutMs: 20 }),
      loadGeologyContext(candidates, { fetcher: async () => { throw new TypeError('network down') } }),
    ])
    for (const state of states) reasons.push((state as { reason: string }).reason)
    reasons.push('The geological context module could not be loaded.') // App.tsx when the deferred chunk fails
    const english = Object.entries(tScience.catalog.en).filter(([key]) => key.startsWith('reason.')).map(([, value]) => value)
    expect(new Set(reasons)).toEqual(new Set(english)) // every canonical reason has a catalog entry (drift guard)
    for (const reason of reasons) {
      const es = geologyReasonText(reason, 'es')
      expect(es).not.toBe(reason)
      expect(geologyReasonText(reason, 'en')).toBe(reason)
      const html = text(renderEs(candidate, { status: 'unavailable', reason }))
      expect(html).toContain(`Contexto geológico no disponible. ${es} El ranking, la ficha y la evaluación no dependen de él.`)
    }
    expect(text(renderEs(candidate, { status: 'loading' }))).toContain('Cargando contexto geológico… El ranking, la ficha y la evaluación no dependen de él.')
    expect(text(renderEs(candidate, { status: 'unavailable', reason: 'Invalid geology context: repeated source_id.' }))).toContain('Contexto geológico no disponible. Invalid geology context: repeated source_id.')
  })

  it('the download is the same record in both languages', () => {
    setLocale('en', quiet)
    const en = JSON.stringify(buildGeologyExport(real, 'cl-win-s2500-w06970'))
    setLocale('es', quiet)
    const es = JSON.stringify(buildGeologyExport(real, 'cl-win-s2500-w06970'))
    expect(es).toBe(en)
  })
})

describe('geology presentation helpers', () => {
  it('English catalog entries are the current English constants (no drift)', () => {
    for (const [availability, hint] of Object.entries(AVAILABILITY_HINT)) expect(availabilityHint(availability as keyof typeof AVAILABILITY_HINT, 'en')).toBe(hint)
    expect(geologyDisplayText('en').availabilityLabel).toEqual(AVAILABILITY_LABEL)
    for (const f of [0, 0.0004, 0.5, 0.9939, 0.9996, 1]) expect(geologyDisplayText('en').formatCoverage(f)).toBe(formatCoverage(f))
    expect(geologyDisplayText('en').formatScaleLabel(1_000_000)).toBe(formatScaleLabel(1_000_000))
    expect(GEOLOGY_PENDING_WITH_CONTEXT).toBe('The official geological context is available with its coverage limits. Its compatibility with the objective still needs calibration and expert review; it stays outside the score.')
    expect(GEOLOGY_LIMITATION_WITH_CONTEXT).toBe('Regional geological mapping can be consulted in the “Geology” tab with its gaps and limits. Geological calibration and territorial evidence on protected areas, urban areas, ownership and access are still pending.')
  })
  it('the display pack is the base displayGeologyPack in both languages', () => {
    for (const locale of ['en', 'es'] as const) {
      const mine = geologyDisplayText(locale)
      const base = displayGeologyPack(locale)
      expect(mine.availabilityLabel).toEqual(base.availabilityLabel)
      for (const f of [0, 0.0004, 0.123, 0.4567, 0.9995, 1]) expect(mine.formatCoverage(f)).toBe(base.formatCoverage(f))
      expect(mine.formatScaleLabel(250_000)).toBe(base.formatScaleLabel(250_000))
    }
    expect(geologyDisplayText('es').formatCoverage(0.0004)).toBe('<0,1 %')
    expect(geologyDisplayText('es').formatScaleLabel(250_000)).toBe('1:250.000')
  })
  it('criterion explanation and limitation: Spanish team text, or the original artifact text (never the English map)', () => {
    const criterion = candidates.flatMap((c) => c.score_breakdown).find((c) => displaySource(c.explanation) !== c.explanation)!
    expect(criterionExplanation(criterion.criterion_id, criterion.explanation, false, 'es')).toBe(criterion.explanation)
    expect(criterionExplanation(criterion.criterion_id, criterion.explanation, false, 'en')).toBe(displaySource(criterion.explanation))
    expect(criterionExplanation(GEOLOGY_CRITERION_ID, 'x', true, 'es')).toBe('El contexto geológico oficial está disponible con sus límites de cobertura. Falta calibrar su compatibilidad con el objetivo y revisarla con especialistas; permanece fuera del puntaje.')
    expect(criterionExplanation(GEOLOGY_CRITERION_ID, 'x', true, 'en')).toBe(GEOLOGY_PENDING_WITH_CONTEXT)
    expect(limitationText(HISTORICAL_GEOLOGY_LIMITATION, false, 'es')).toBe(HISTORICAL_GEOLOGY_LIMITATION)
    expect(limitationText(HISTORICAL_GEOLOGY_LIMITATION, true, 'es')).toContain('pestaña «Geología»')
    expect(limitationText(HISTORICAL_GEOLOGY_LIMITATION, true, 'en')).toBe(GEOLOGY_LIMITATION_WITH_CONTEXT)
    // Default parameter = current interface language.
    setLocale('es', quiet)
    expect(limitationText(HISTORICAL_GEOLOGY_LIMITATION, true)).toBe(limitationText(HISTORICAL_GEOLOGY_LIMITATION, true, 'es'))
    expect(criterionExplanation(criterion.criterion_id, criterion.explanation, false)).toBe(criterion.explanation)
  })
})
