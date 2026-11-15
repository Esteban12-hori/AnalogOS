// PlaceRail and ReferenceCard rendered with react-dom/server (no jsdom), with the v3 snapshot:
// APG listbox structure, candidates at their global rank, REF apart and unnumbered, country
// filter, ◆ without %, loading/error states and Mission grouped by the team's evaluation.
// Includes the team ranking assertions (CandidateRanking, removed when integrating; ADR-013).
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { filterByCountry, rankMap, splitByRole } from '../../domain/discovery'
import type { AppData } from '../../shell/public'
import { missionStore } from '../../state/mission'
import { evaluateExample, readyData, v3Snapshot } from '../../tests/v3Support'
import { uiStore } from '../../state/ui'
import { loadReferenceAnalogs, PlaceRail, ReferenceCard as ReferenceCardSlot } from './index'
import { kickerFit } from './PlaceOption'
// The ◆ card lives in a deferred chunk; its content is tested directly here.
import ReferenceCard from './ReferenceCardView'

const ready: AppData = readyData
const loading: AppData = { status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }
const failed: AppData = { status: 'error', snapshot: null, visual: { status: 'loading' }, error: 'manifest.json inválido' }

/** Each listbox option (cards do not nest <div>). */
function options(html: string): string[] {
  return [...html.matchAll(/<div[^>]*role="option"[^>]*>[\s\S]*?<\/div>/g)].map((match) => match[0])
}

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

beforeAll(async () => {
  await loadReferenceAnalogs()
})

afterEach(() => {
  uiStore.reset()
  missionStore.reset()
})

describe('PlaceRail', () => {
  const { ranked, references } = splitByRole(v3Snapshot.candidates)
  const rankOf = rankMap(ranked)

  it('APG horizontal listbox with candidates, reference and ◆, and a single tab stop', () => {
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('role="listbox"')
    expect(html).toContain('aria-orientation="horizontal"')
    expect(html.match(/role="group"/g)?.length).toBeGreaterThanOrEqual(3)
    expect(html).toContain('Search candidates')
    expect(html).toContain('Known reference: Pampa Yungay')
    expect(html).toContain('Emblematic analogs · not yet calculated')
    expect(options(html)).toHaveLength(14)
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html).toContain('Show list')
    expect(html).toContain('aria-label="Next places"')
  })

  it('stable order: candidates with their global rank of 6, the REF without a number and then ◆ without % or ranking', () => {
    const cards = options(renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)).map(text)
    expect(cards.slice(0, 6).map((card) => card.match(/#\d of 6/)?.[0])).toEqual(['#1 of 6', '#2 of 6', '#3 of 6', '#4 of 6', '#5 of 6', '#6 of 6'])
    expect(cards[0]).toContain('Interior de Antofagasta')
    expect(cards[0]).toContain('94.9')
    expect(cards[0]).toContain('v3 similarity')
    expect(cards[0]).toContain('Confidence')
    expect(cards[0]).toContain('77.5')
    expect(cards[0]).toContain('Chile')
    expect(cards[3]).toContain('Argentina')
    // The REF: a label, never a rank number even when its similarity exceeds candidates'.
    expect(cards[6]).toContain('REF · Known reference')
    expect(cards[6]).toContain('Pampa Yungay')
    expect(cards[6]).toContain('not from the search')
    expect(cards[6]).not.toMatch(/#\d/)
    expect(cards[7]).toContain('Devon Island')
    for (const card of cards.slice(7)) {
      expect(card).toContain('not yet calculated')
      expect(card).not.toMatch(/\d\s*%/)
      expect(card).not.toMatch(/#\d/)
      expect(card).not.toContain('Confidence')
    }
  })

  it('§1 #16: Atacama · Yungay is a “matches” badge on the REF, not its own ◆', () => {
    const cards = options(renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)).map(text)
    expect(cards[6]).toContain('Matches Atacama Desert · Yungay')
    expect(cards.filter((card) => card.includes('Emblematic analog'))).toHaveLength(7)
    expect(cards.some((card) => card.includes('Emblematic analog') && card.includes('Atacama'))).toBe(false)
  })

  it('team ranking: REF apart and country filter with the global rank (assertions ported from CandidateRanking)', () => {
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html.indexOf('Search candidates')).toBeLessThan(html.indexOf('Known reference: Pampa Yungay'))
    expect(html).toContain('REF')
    expect(html).toContain('aria-label="Filter candidates by country"')
    expect(options(html).filter((card) => card.includes('data-kind="evaluated"'))).toHaveLength(ranked.length + references.length)
    const argentina = filterByCountry(ranked, 'AR')
    // Same global rank on the Argentine card as in the full ranking, not a local one.
    expect(text(html)).toContain(`#${rankOf.get(argentina[0]!.site_id)} of 6`)
    expect(rankOf.get(argentina[0]!.site_id)).toBe(4)
  })

  it('reports honestly when a country leaves no candidates and keeps the known reference', () => {
    const chileOnly: AppData = { ...ready, snapshot: { ...v3Snapshot, candidates: v3Snapshot.candidates.filter((site) => site.country === 'CL') } }
    const html = renderToStaticMarkup(<PlaceRail data={chileOnly} placement="dock" />)
    expect(html).not.toContain('aria-label="Filter candidates by country"') // a single country: no filter
    const empty: AppData = { ...ready, snapshot: { ...v3Snapshot, candidates: references } }
    const none = renderToStaticMarkup(<PlaceRail data={empty} placement="dock" />)
    expect(none).toContain('The search left no candidates eligible')
    expect(none).toContain('The list is not filled with hand-picked sites')
    expect(none).toContain('Known reference: Pampa Yungay')
  })

  it('the selection (globe or carousel) marks the option, gives it the tab focus and “◉ on the globe”', () => {
    uiStore.setState({ selection: { siteId: ranked[1]!.site_id, kind: 'evaluated', preview: false } })
    const cards = options(renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />))
    const selected = cards.filter((card) => card.includes('aria-selected="true"'))
    expect(selected).toHaveLength(1)
    expect(selected[0]).toContain('tabindex="0"')
    expect(text(selected[0] ?? '')).toContain('◉ On the globe · Candidate · #2 of 6')
  })

  it('Explore shows the product promise as a note', () => {
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" promise="Prioriza qué sectores merecen reconocimiento para un ensayo de rover" />)
    expect(html).toContain('Prioriza qué sectores merecen reconocimiento para un ensayo de rover')
  })

  it('Mission not evaluated: snapshot order and notice; no mission %', () => {
    uiStore.setState({ mode: 'mision', missionPhase: 'review' })
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('Not evaluated')
    expect(html).not.toContain('motor determinista v')
  })

  it('Mission with evaluation: groups by status, rank only for prioritized, “Territorial feasibility: pending”', () => {
    const { evaluation } = evaluateExample()
    missionStore.setState({ evaluation, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('mission-rules-1.0.0')
    expect(html).toContain('v3 similarity not recalculated')
    expect(html).not.toContain('aria-label="Filter candidates by country"')
    const cards = options(html).map(text)
    expect(cards[0]).toContain('#1')
    expect(cards[0]).toContain('Prioritized for reconnaissance')
    expect(cards[0]).toContain('Territorial feasibility: pending')
    expect(cards[0]).toContain('not recalculated')
    expect(html).not.toMatch(/% de misión|motor determinista v/)
  })

  it('unsupported objective: the ring does not show the rover-profile similarity as if it were for the objective', () => {
    const { evaluation } = evaluateExample(undefined, [{ type: 'set_target', target: { kind: 'other', stated: 'hábitat lunar' } }])
    expect(evaluation.outcome).toBe('unsupported_target')
    missionStore.setState({ evaluation, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const cards = options(renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)).map(text)
    const unsupported = cards.filter((card) => card.includes('Unsupported objective'))
    expect(unsupported.length).toBeGreaterThan(0)
    for (const card of unsupported) {
      expect(card).toContain('not applicable')
      expect(card).toContain('No % for this objective')
      expect(card).not.toMatch(/\d+\.\d\s*v3 similarity/)
    }
  })

  it('in Mission the header label says which rules the statuses come from (not “from the team”)', () => {
    const { evaluation } = evaluateExample()
    missionStore.setState({ evaluation, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('status · rules mission-rules-1.0.0')
    expect(html).not.toContain('reglas del equipo')
  })

  it('feasibility and status in short form for narrow cards; the full one stays in the accessibility tree', () => {
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('<span class="places-chip-full">Requires review</span><span class="places-chip-short" aria-hidden="true">Feas.: review</span>')
    const { evaluation } = evaluateExample()
    missionStore.setState({ evaluation, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const mission = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(mission).toContain('<span class="places-kicker-full">#1 · Prioritized for reconnaissance</span><span class="places-kicker-short" aria-hidden="true">#1 · Prioritized</span>')
    expect(mission).toContain('<span class="places-chip-full">Territorial feasibility: pending</span><span class="places-chip-short" aria-hidden="true">Feas.: pending</span>')
    expect(kickerFit('#1 · Priorizado para reconocimiento')).toBe('260')
    expect(kickerFit('Candidato · #1 de 6')).toBe('160')
  })

  it('editing after evaluating: previous results with aria-busy, without inert, until re-evaluation', () => {
    const { evaluation } = evaluateExample()
    missionStore.setState({ evaluation, stale: true, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'review' })
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('inert')
    expect(html).toContain('You edited the test: confirm and evaluate again')
  })

  it('scope without evidence: an honest diagnostic instead of an empty list', () => {
    const { evaluation } = evaluateExample({ mode: 'point', siteId: '', lon: '10', lat: '10', west: '', south: '', east: '', north: '', windowSiteId: null })
    expect(evaluation.outcome).toBe('insufficient_coverage')
    missionStore.setState({ evaluation, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const html = renderToStaticMarkup(<PlaceRail data={ready} placement="dock" />)
    expect(html).toContain('Insufficient evidence for this geometry')
    expect(html).toContain('Export the diagnostic (JSON)')
  })

  it('sheet: without the shell it does not offer “See list”; with the list view it is vertical and offers going back', () => {
    expect(renderToStaticMarkup(<PlaceRail data={ready} placement="sheet" />)).not.toContain('Show list')
    const list = renderToStaticMarkup(<PlaceRail data={ready} placement="sheet" listView onListViewChange={() => undefined} />)
    expect(list).toContain('aria-orientation="vertical"')
    expect(list).toContain('Show carousel')
    expect(list).toContain('data-view="list"')
  })

  it('loading and error states: neutral, no figures', () => {
    const wait = renderToStaticMarkup(<PlaceRail data={loading} placement="dock" />)
    expect(wait).toContain('Loading validated snapshot')
    expect(wait).toContain('aria-busy="true"')
    const error = renderToStaticMarkup(<PlaceRail data={failed} placement="dock" />)
    expect(error).toContain('✕')
    expect(error).toContain('The places could not be loaded: manifest.json inválido')
  })
})

describe('ReferenceCard', () => {
  it('“Global reference · to be calculated” with approximate area and linked source', () => {
    const html = renderToStaticMarkup(<ReferenceCard data={ready} analogId="devon-island" />)
    expect(html).toContain('World reference · not yet calculated')
    expect(html).toContain('Devon Island · Haughton crater')
    expect(text(html)).toContain('radius of ≈ 15 km')
    expect(text(html)).toContain('It is not an exact pin')
    expect(html).toContain('href="https://www.lpi.usra.edu/meetings/analogues2011/pdf/6019.pdf"')
    expect(html).toContain('rel="noreferrer noopener"')
    expect(text(html)).not.toMatch(/\d\s*%/)
  })

  it('shows “matches” and regions only when the geometry backs it', () => {
    expect(text(renderToStaticMarkup(<ReferenceCard data={ready} analogId="atacama-yungay" />))).toContain('Matches ● Pampa Yungay')
    const mdrs = text(renderToStaticMarkup(<ReferenceCard data={ready} analogId="mdrs-utah" />))
    expect(mdrs).toContain('Approximate region between 38.40° N, 110.90° W and 38.44° N, 110.78° W')
    expect(mdrs).not.toContain('Contiene')
    expect(renderToStaticMarkup(<ReferenceCard data={ready} analogId="no-existe" />)).toContain('is not in the published catalog')
  })

  it('the exported slot renders with its own Suspense while the deferred chunk arrives', () => {
    expect(renderToStaticMarkup(<ReferenceCardSlot data={ready} analogId="devon-island" />)).toContain('Loading the reference')
  })
})
