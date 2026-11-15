// “Site sheet” block of the team's tests/discovery.test.tsx, ported with the SAME expected texts (now
// English) to the “Origin” tab (CandidateDetails is not part of the integrated UI; ADR-013).
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CandidateSite } from '../../domain/contracts'
import { rankMap, splitByRole } from '../../domain/discovery'
import { readJson, v3Snapshot } from '../../tests/v3Support'
import { OriginSection } from './OriginSection'

const { ranked, references } = splitByRole(v3Snapshot.candidates)
const rankOf = rankMap(ranked)
const fixtures = readJson('artifacts/demo/candidate-details.json') as CandidateSite[]

const details = (candidate: CandidateSite, withSearch = true) => renderToStaticMarkup(
  <OriginSection candidate={candidate} precedents={withSearch ? v3Snapshot.precedents : null} rank={candidate.role === 'reference' ? null : rankOf.get(candidate.site_id) ?? null} />,
)

describe('site sheet · origin and precedents', () => {
  it('a candidate sheet shows origin, topographic priority and precedents with their source', () => {
    const html = details(ranked[0]!)
    expect(html).toContain('Search candidate')
    expect(html).toContain('Grid search')
    expect(html).toContain('it only orders the preselection')
    expect(html).toContain('Region with published precedents')
    expect(html).toContain('that does not prove it is new')
    expect(html).toContain('navarro.SOM_.pdf')
    expect(html).toContain('>Country<')
  })

  it('the Yungay sheet labels it as the known reference and a fixture sheet does not invent metadata', () => {
    const reference = details(references[0]!)
    expect(reference).toContain('<b>REF</b>')
    expect(reference).not.toContain('<b>7</b>')
    expect(reference).toContain('Known reference')
    expect(reference).toContain('It does not come from the search')
    expect(reference).toContain('The window contains published sampling coordinates')
    const fixture = details(fixtures[0]!, false)
    expect(fixture).toContain('Fixture')
    expect(fixture).not.toContain('Origen y antecedentes')
  })

  it('territorial authorities come from the site itself (IDERA in Argentina, IDE Chile in Chile)', () => {
    const argentina = ranked.find((site) => site.country === 'AR')!
    expect(details(argentina)).toContain('IDERA')
    expect(details(argentina)).not.toContain('IDE Chile')
    expect(details(ranked[0]!)).toContain('IDE Chile')
  })
})
