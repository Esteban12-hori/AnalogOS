import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CandidateMap, mapFrame, projector } from '../features/globe/CandidateMap'
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

describe('v3 snapshot and historical contracts', () => {
  it('validates v3, the search and the precedents, and keeps demo, v1 and v2 valid', () => {
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

  it('requires country, role, origin and review in v3, consistent with each other', () => {
    const [candidate] = ranked
    const { role: _role, ...withoutRole } = candidate
    const broken: unknown[] = [
      withoutRole,
      { ...candidate, country: 'AR' },                          // prefix cl- with country AR
      { ...candidate, site_id: 'br-win-s2500-w06970' },          // unsupported country
      { ...candidate, role: 'reference' },                       // contradictory role and status
      { ...candidate, status: 'reference' },
      { ...candidate, literature_review: { ...candidate.literature_review, status: 'known_reference' } },
      { ...candidate, discovery: { ...candidate.discovery, origin: 'known_reference' } },
      { ...candidate, literature_review: { ...candidate.literature_review, status: 'new_discovery' } },
      { ...references[0], status: 'candidate' },
    ]
    for (const item of broken) {
      expect(() => assertSnapshotContracts([item], manifest, profile)).toThrow(/Invalid/)
    }
  })
})

describe('roles, countries and selection', () => {
  it('separates the reference from the ranking and keeps candidates from both countries', () => {
    expect(references.map((item) => item.site_id)).toEqual(['cl-pampa-yungay-screening'])
    expect(ranked.some(isReference)).toBe(false)
    expect(ranked.length + references.length).toBe(candidates.length)
    expect(availableCountries(ranked)).toEqual(['CL', 'AR'])
    expect(filterByCountry(ranked, 'AR').every((item) => item.site_id.startsWith('ar-'))).toBe(true)
    expect(filterByCountry(ranked, 'CL').length + filterByCountry(ranked, 'AR').length).toBe(ranked.length)
    // The ranking is by similarity, and the reference does not take a position even if it scores higher than some candidates.
    expect(ranked.map((item) => item.similarity)).toEqual([...ranked.map((item) => item.similarity)].sort((a, b) => (b ?? 0) - (a ?? 0)))
  })

  it('selects a candidate first; the reference only if there is none; and nothing if empty', () => {
    expect(initialSelection(candidates)).toBe(ranked[0].site_id)
    expect(initialSelection([...references, ...ranked])).toBe(ranked[0].site_id)
    expect(initialSelection(references)).toBe(references[0].site_id)
    expect(initialSelection([])).toBe('')
  })

  it('no candidate is presented as new and all keep their precedents', () => {
    for (const candidate of ranked) {
      expect(candidate.literature_review?.status).not.toBe('no_match_in_reviewed_sources')
      expect(candidate.literature_review?.matches.length).toBeGreaterThan(0)
      expect(candidate.feasibility).toBe('requires_review')
    }
    expect(references[0].literature_review?.status).toBe('known_reference')
  })

  it('territorial authorities match the site country', () => {
    const text = (candidate: CandidateSite) => candidate.warnings.join(' ')
    for (const candidate of filterByCountry(ranked, 'AR')) {
      expect(text(candidate)).toContain('IDERA')
      expect(text(candidate)).not.toContain('IDE Chile')
      expect(text(candidate)).not.toContain('ide.cl')
    }
    for (const candidate of filterByCountry(ranked, 'CL')) expect(text(candidate)).toContain('IDE Chile')
  })
})

describe('search and export', () => {
  it('summarizes the real search scope', () => {
    const summary = summarizeSearch(search)
    expect(summary).toMatchObject({ regions: 2, attempted: 50, evaluated: 50, selected: ranked.length, failed: 0 })
    expect(summary.excludedByPrecedent).toBe(search.windows.filter((item) => item.decision === 'rejected_precedent_overlap').length)
    expect(search.shortlist.sort()).toEqual(ranked.map((item) => item.site_id).sort())
  })

  it('the export keeps role, origin, literature review and the explored scope', () => {
    for (const candidate of [ranked[0], references[0]]) {
      const exported = JSON.parse(JSON.stringify(buildExport(candidate, search)))
      expect(exported.site.role).toBe(candidate.role)
      expect(exported.site.discovery).toEqual(candidate.discovery)
      expect(exported.site.literature_review.status).toBe(candidate.literature_review?.status)
      expect(exported.search_context.counts.attempted).toBe(50)
      expect(exported.search_context.regions).toHaveLength(2)
      expect(exported.notice).toContain('declare novelty')
    }
    expect(buildExport(fixtures[0], null).search_context).toBeNull()
  })
})

describe('pilot map', () => {
  it('frames the two regions and the reference with a readable aspect ratio', () => {
    const frame = mapFrame(candidates, search)
    for (const region of search.regions) {
      expect(frame.west).toBeLessThan(region.bbox[0])
      expect(frame.south).toBeLessThan(region.bbox[1])
      expect(frame.east).toBeGreaterThan(region.bbox[2])
      expect(frame.north).toBeGreaterThan(region.bbox[3])
    }
    expect(frame.north).toBeGreaterThan(-23.98) // includes the Yungay window
    expect(frame.height / frame.width).toBeGreaterThan(0.69)
    expect(frame.height / frame.width).toBeLessThan(1.26)
    const project = projector(frame)
    expect(project([frame.west, frame.north])).toEqual([0, 0])
    expect(project([frame.east, frame.south])).toEqual([frame.width, frame.height])
  })

  it('draws the 50 windows, the selectable sites and both countries without WebGL or external resources', () => {
    const html = renderToStaticMarkup(
      <CandidateMap candidates={candidates} rankOf={rankOf} outline={outline} search={search} precedents={precedents}
        selectedId={ranked[0].site_id} onSelect={() => undefined} />,
    )
    expect(html.match(/class="window /g)).toHaveLength(50)
    expect(html.match(/class="window precedent"/g)).toHaveLength(4)
    expect(html.match(/role="button"/g)).toHaveLength(candidates.length)
    expect(html).toContain('CHILE · Interior de Antofagasta')
    expect(html).toContain('ARGENTINA · Puna de Catamarca y Salta')
    expect(html).toContain('known reference')
    expect(html).toContain('Reference outline, not an official boundary')
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/)
  })

  it('still works with a historical snapshot without a search', () => {
    const html = renderToStaticMarkup(
      <CandidateMap candidates={fixtures} rankOf={new Map()} outline={outline} search={null} precedents={null}
        selectedId={fixtures[0].site_id} onSelect={() => undefined} />,
    )
    expect(html).toContain('Demo zones')
    expect(html.match(/role="button"/g)).toHaveLength(fixtures.length)
    expect(html).not.toContain('class="window ')
  })
})

// The "ranking and detail sheet" block was ported with the same expected texts to
// features/places/PlaceRail.test.tsx (ranking: REF, country filter, global rank, empty state)
// and to shell/detail/OriginSection.test.tsx (detail sheet: origin, topographic priority, background),
// because CandidateRanking and CandidateDetails are not part of the integrated interface (ADR-013).
