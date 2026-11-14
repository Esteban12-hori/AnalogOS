import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CandidateDetails } from '../components/CandidateDetails'
import { CandidateMap, mapFrame, projector } from '../components/CandidateMap'
import { CandidateRanking } from '../components/CandidateRanking'
import {
  assertDiscoveryContracts, assertSnapshotContracts,
  type CandidateSite, type DataManifest, type GeoJsonFeatureCollection, type MissionProfile,
  type PrecedentCatalog, type SearchResults,
} from '../domain/contracts'
import {
  availableCountries, buildExport, filterByCountry, initialSelection, isReference, splitByRole, summarizeSearch,
} from '../domain/discovery'

const root = resolve(__dirname, '../../../..')
const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const v3 = (file: string) => readJson(`artifacts/science-v3/${file}`)

const candidates = v3('candidate-details.json') as CandidateSite[]
const manifest = v3('manifest.json') as DataManifest
const profile = v3('mission-profile.json') as MissionProfile
const search = v3('search-results.json') as SearchResults
const precedents = v3('precedents.json') as PrecedentCatalog
const outline = v3('context-outline.geojson') as GeoJsonFeatureCollection
const fixtures = readJson('artifacts/demo/candidate-details.json') as CandidateSite[]
const { ranked, references } = splitByRole(candidates)
const rankOf = new Map(ranked.map((candidate, index) => [candidate.site_id, index + 1]))
const loading = { status: 'loading' } as const

describe('contratos del snapshot v3 y de los históricos', () => {
  it('valida v3, la búsqueda y los antecedentes, y mantiene válidos demo, v1 y v2', () => {
    expect(() => assertSnapshotContracts(candidates, manifest, profile)).not.toThrow()
    expect(() => assertDiscoveryContracts(search, precedents)).not.toThrow()
    for (const snapshot of ['demo', 'science-v1', 'science-v2']) {
      expect(() => assertSnapshotContracts(
        readJson(`artifacts/${snapshot}/candidate-details.json`),
        readJson(`artifacts/${snapshot}/manifest.json`),
        readJson(`artifacts/${snapshot}/mission-profile.json`),
      )).not.toThrow()
    }
  })

  it('exige en v3 país, rol, origen y revisión, coherentes entre sí', () => {
    const [candidate] = ranked
    const { role: _role, ...withoutRole } = candidate
    const broken: unknown[] = [
      withoutRole,
      { ...candidate, country: 'AR' },                          // prefijo cl- con país AR
      { ...candidate, site_id: 'br-win-s2500-w06970' },          // país no admitido
      { ...candidate, role: 'reference' },                       // rol y estado contradictorios
      { ...candidate, status: 'reference' },
      { ...candidate, literature_review: { ...candidate.literature_review, status: 'known_reference' } },
      { ...candidate, discovery: { ...candidate.discovery, origin: 'known_reference' } },
      { ...candidate, literature_review: { ...candidate.literature_review, status: 'new_discovery' } },
      { ...references[0], status: 'candidate' },
    ]
    for (const item of broken) {
      expect(() => assertSnapshotContracts([item], manifest, profile)).toThrow(/inválido/)
    }
  })
})

describe('roles, países y selección', () => {
  it('separa la referencia del ranking y conserva candidatos de ambos países', () => {
    expect(references.map((item) => item.site_id)).toEqual(['cl-pampa-yungay-screening'])
    expect(ranked.some(isReference)).toBe(false)
    expect(ranked.length + references.length).toBe(candidates.length)
    expect(availableCountries(ranked)).toEqual(['CL', 'AR'])
    expect(filterByCountry(ranked, 'AR').every((item) => item.site_id.startsWith('ar-'))).toBe(true)
    expect(filterByCountry(ranked, 'CL').length + filterByCountry(ranked, 'AR').length).toBe(ranked.length)
    // El ranking es por similitud y la referencia no ocupa posición aunque puntúe más que algunos candidatos.
    expect(ranked.map((item) => item.similarity)).toEqual([...ranked.map((item) => item.similarity)].sort((a, b) => (b ?? 0) - (a ?? 0)))
  })

  it('selecciona primero un candidato; la referencia solo si no hay ninguno; y nada si está vacío', () => {
    expect(initialSelection(candidates)).toBe(ranked[0].site_id)
    expect(initialSelection([...references, ...ranked])).toBe(ranked[0].site_id)
    expect(initialSelection(references)).toBe(references[0].site_id)
    expect(initialSelection([])).toBe('')
  })

  it('ningún candidato se presenta como nuevo y todos conservan sus antecedentes', () => {
    for (const candidate of ranked) {
      expect(candidate.literature_review?.status).not.toBe('no_match_in_reviewed_sources')
      expect(candidate.literature_review?.matches.length).toBeGreaterThan(0)
      expect(candidate.feasibility).toBe('requires_review')
    }
    expect(references[0].literature_review?.status).toBe('known_reference')
  })

  it('las autoridades territoriales corresponden al país del sitio', () => {
    const text = (candidate: CandidateSite) => candidate.warnings.join(' ')
    for (const candidate of filterByCountry(ranked, 'AR')) {
      expect(text(candidate)).toContain('IDERA')
      expect(text(candidate)).not.toContain('IDE Chile')
      expect(text(candidate)).not.toContain('ide.cl')
    }
    for (const candidate of filterByCountry(ranked, 'CL')) expect(text(candidate)).toContain('IDE Chile')
  })
})

describe('búsqueda y exportación', () => {
  it('resume el alcance real de la búsqueda', () => {
    const summary = summarizeSearch(search)
    expect(summary).toMatchObject({ regions: 2, attempted: 50, evaluated: 50, selected: ranked.length, failed: 0 })
    expect(summary.excludedByPrecedent).toBe(search.windows.filter((item) => item.decision === 'rejected_precedent_overlap').length)
    expect(search.shortlist.sort()).toEqual(ranked.map((item) => item.site_id).sort())
  })

  it('la exportación conserva rol, origen, revisión bibliográfica y el alcance explorado', () => {
    for (const candidate of [ranked[0], references[0]]) {
      const exported = JSON.parse(JSON.stringify(buildExport(candidate, search)))
      expect(exported.site.role).toBe(candidate.role)
      expect(exported.site.discovery).toEqual(candidate.discovery)
      expect(exported.site.literature_review.status).toBe(candidate.literature_review?.status)
      expect(exported.search_context.counts.attempted).toBe(50)
      expect(exported.search_context.regions).toHaveLength(2)
      expect(exported.notice).toContain('no declara novedad')
    }
    expect(buildExport(fixtures[0], null).search_context).toBeNull()
  })
})

describe('mapa del piloto', () => {
  it('encuadra las dos regiones y la referencia con una proporción legible', () => {
    const frame = mapFrame(candidates, search)
    for (const region of search.regions) {
      expect(frame.west).toBeLessThan(region.bbox[0])
      expect(frame.south).toBeLessThan(region.bbox[1])
      expect(frame.east).toBeGreaterThan(region.bbox[2])
      expect(frame.north).toBeGreaterThan(region.bbox[3])
    }
    expect(frame.north).toBeGreaterThan(-23.98) // incluye la ventana de Yungay
    expect(frame.height / frame.width).toBeGreaterThan(0.69)
    expect(frame.height / frame.width).toBeLessThan(1.26)
    const project = projector(frame)
    expect(project([frame.west, frame.north])).toEqual([0, 0])
    expect(project([frame.east, frame.south])).toEqual([frame.width, frame.height])
  })

  it('dibuja las 50 ventanas, los sitios seleccionables y ambos países sin WebGL ni recursos externos', () => {
    const html = renderToStaticMarkup(
      <CandidateMap candidates={candidates} rankOf={rankOf} outline={outline} search={search} precedents={precedents}
        selectedId={ranked[0].site_id} onSelect={() => undefined} />,
    )
    expect(html.match(/class="window /g)).toHaveLength(50)
    expect(html.match(/class="window precedent"/g)).toHaveLength(4)
    expect(html.match(/role="button"/g)).toHaveLength(candidates.length)
    expect(html).toContain('CHILE · Interior de Antofagasta')
    expect(html).toContain('ARGENTINA · Puna de Catamarca y Salta')
    expect(html).toContain('referencia conocida')
    expect(html).toContain('Contorno referencial, no límite oficial')
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/)
  })

  it('sigue funcionando con un snapshot histórico sin búsqueda', () => {
    const html = renderToStaticMarkup(
      <CandidateMap candidates={fixtures} rankOf={new Map()} outline={outline} search={null} precedents={null}
        selectedId={fixtures[0].site_id} onSelect={() => undefined} />,
    )
    expect(html).toContain('Zonas de demostración')
    expect(html.match(/role="button"/g)).toHaveLength(fixtures.length)
    expect(html).not.toContain('class="window ')
  })
})

describe('ranking y ficha', () => {
  const ranking = (list: CandidateSite[], country: 'all' | 'CL' | 'AR' = 'all') => renderToStaticMarkup(
    <CandidateRanking ranked={list} references={references} rankOf={rankOf} countries={['CL', 'AR']} country={country}
      onCountryChange={() => undefined} selectedId={ranked[0].site_id} onSelect={() => undefined} />,
  )

  it('muestra los candidatos aparte de la referencia conocida, con filtro por país', () => {
    const html = ranking(ranked)
    expect(html.indexOf('Candidatos de la búsqueda')).toBeLessThan(html.indexOf('Referencia conocida: Yungay'))
    expect(html).toContain('>REF<')
    expect(html.match(/class="candidate-card[ "]/g)).toHaveLength(candidates.length)
    expect(html).toContain('aria-label="Filtrar candidatos por país"')
    const argentina = ranking(filterByCountry(ranked, 'AR'), 'AR')
    expect(argentina.match(/class="candidate-card[ "]/g)).toHaveLength(filterByCountry(ranked, 'AR').length + 1)
    expect(argentina).toContain(`>${rankOf.get(filterByCountry(ranked, 'AR')[0].site_id)}<`) // posición global, no local
  })

  it('informa con honestidad cuando no hay candidatos', () => {
    const html = ranking([], 'AR')
    expect(html).toContain('La búsqueda no dejó candidatos en Argentina')
    expect(html).toContain('No se')
    expect(html).toContain('Referencia conocida: Yungay')
  })

  const details = (candidate: CandidateSite, withSearch = true) => renderToStaticMarkup(
    <CandidateDetails candidate={candidate} manifest={manifest} profile={profile} visual={loading}
      search={withSearch ? search : null} precedents={withSearch ? precedents : null} />,
  )

  it('la ficha de un candidato muestra origen, prioridad topográfica y antecedentes con su fuente', () => {
    const html = details(ranked[0])
    expect(html).toContain('Candidato de la búsqueda')
    expect(html).toContain('Búsqueda por rejilla')
    expect(html).toContain('solo ordena la preselección')
    expect(html).toContain('Región con antecedentes publicados')
    expect(html).toContain('eso no prueba que sea nueva')
    expect(html).toContain('navarro.SOM_.pdf')
    expect(html).toContain('>País<')
  })

  it('la ficha de Yungay la rotula como referencia conocida y la de un fixture no inventa metadata', () => {
    const reference = details(references[0])
    expect(reference).toContain('Referencia conocida')
    expect(reference).toContain('No sale de la búsqueda')
    expect(reference).toContain('La ventana contiene coordenadas de muestreo publicadas')
    const fixture = details(fixtures[0], false)
    expect(fixture).toContain('Fixture')
    expect(fixture).not.toContain('Origen y antecedentes')
  })
})
