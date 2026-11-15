import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ClusterChip, createGlobeMarkerRuntime, GlobeMarkerOverlay, kindsFromCounts, landingDelays, MarkerPin } from './MarkerLayer'
import type { MarkerModel } from './markers'

// FIXTURE: synthetic models; they are not scientific results.
function model(partial: Partial<MarkerModel> & Pick<MarkerModel, 'id' | 'kind'>): MarkerModel {
  return {
    selectionKind: partial.kind === 'reference' ? 'reference' : 'evaluated',
    center: [-69.9, -24.1],
    name: partial.id,
    rank: null,
    score: null,
    scoreSource: null,
    role: partial.kind === 'reference' ? 'analog' : 'candidate',
    missionStatus: null,
    group: 'Chile',
    outline: null,
    coincides: [],
    contains: null,
    order: 0,
    ...partial,
  }
}

const yungay = model({ id: 'cl-yungay', kind: 'evaluated', name: 'Pampa Yungay', rank: 1, score: 75.67, scoreSource: 'snapshot', coincides: ['Atacama (Yungay)'] })
const sinDatos = model({ id: 'cl-sin-datos', kind: 'insufficient', name: 'Sector sin datos', order: 1 })
const devon = model({ id: 'devon', kind: 'reference', name: 'Devon Island', group: 'Canadá', order: 2 })
const noop = () => undefined

describe('MarkerPin', () => {
  it('the known reference carries “REF” and never a number; in Mission, the status and its dimming', () => {
    const ref = model({ id: 'cl-pampa-yungay-screening', kind: 'evaluated', name: 'Pampa Yungay', role: 'reference', score: 75.67, scoreSource: 'snapshot' })
    const html = renderToStaticMarkup(<MarkerPin model={ref} selected={false} hover={false} onActivate={noop} />)
    expect(html).toContain('<b class="globe-pin-rank">REF</b>')
    expect(html).toContain('data-role="reference"')
    expect(html).toContain('known reference, outside the ranking')
    const failed = model({ id: 'cl-a', kind: 'evaluated', name: 'A', missionStatus: 'no_cumple_requisitos' })
    const failedHtml = renderToStaticMarkup(<MarkerPin model={failed} selected={false} hover={false} onActivate={noop} />)
    expect(failedHtml).toContain('data-status="no_cumple_requisitos"')
    expect(failedHtml).toContain('✕')
    expect(failedHtml).toContain('does not meet requirements')
    expect(failedHtml).not.toMatch(/\d+,\d\s*%/)
  })

  it('● is a button with rank, % with 1 fixed decimal and a “matches” badge', () => {
    const html = renderToStaticMarkup(<MarkerPin model={yungay} selected={false} hover={false} onActivate={noop} />)
    expect(html).toContain('<button type="button" class="globe-pin-button" aria-pressed="false"')
    expect(html).toContain('aria-label="Pampa Yungay, rank 1, similarity 75.7%, Chile, matches Atacama (Yungay)"')
    expect(html).toContain('>●<')
    expect(html).toContain('<b class="globe-pin-rank">#1</b>')
    expect(html).toContain('75.7%')
    expect(html).toContain('◆ matches Atacama (Yungay)')
    expect(html).toContain('class="globe-pin is-evaluated"')
  })

  it('○ shows “insufficient data” without rank or figure', () => {
    const html = renderToStaticMarkup(<MarkerPin model={sinDatos} selected={false} hover={false} onActivate={noop} />)
    expect(html).toContain('>○<')
    expect(html).toContain('insufficient data')
    expect(html).not.toMatch(/\d+,\d|%|#/)
  })

  it('◆ selected: “to be calculated”, “approximate area”, no % or rank', () => {
    const html = renderToStaticMarkup(<MarkerPin model={devon} selected hover={false} onActivate={noop} />)
    expect(html).toContain('class="globe-pin is-reference is-selected"')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('not yet calculated')
    expect(html).toContain('approximate area')
    expect(html).not.toMatch(/\d+,\d|%|#/)
  })

  it('hover from the carousel marks the scale class and the label may come within the budget', () => {
    const html = renderToStaticMarkup(<MarkerPin model={yungay} selected={false} hover labeled onActivate={noop} />)
    expect(html).toContain('class="globe-pin is-evaluated is-hover"')
    expect(html).toContain('data-label=""')
  })
})

describe('ClusterChip', () => {
  const counts = { evaluated: 3, insufficient: 0, reference: 1 }

  it('closed: stacked glyphs and counts per type, no averages', () => {
    const html = renderToStaticMarkup(
      <ClusterChip clusterKey="a|b|c|d" counts={counts} group="Chile" members={null} open={false} hover={false} onToggle={noop} onActivate={noop} />,
    )
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('●●●◆')
    // Visible text "Chile · 3 ● · 1 ◆" (the "·" separators are added by the CSS between parts).
    expect(html).toContain('<span>Chile</span>')
    expect(html).toMatch(/class="globe-cluster-count is-evaluated">3(<!-- -->)? <i>●<\/i>/)
    expect(html).toMatch(/class="globe-cluster-count is-reference">1(<!-- -->)? <i>◆<\/i>/)
    expect(html).toContain('aria-label="Group of 4 places in Chile: 3 evaluated, 1 analog not yet calculated. Show list"')
    expect(html).not.toMatch(/%|\d+,\d/)
    expect(html).not.toContain('<ul')
  })

  it('open: list of member buttons (or a wait in 2D)', () => {
    const open = renderToStaticMarkup(
      <ClusterChip clusterKey="a|b" counts={counts} group="Chile" members={[yungay, devon]} open hover={false} onToggle={noop} onActivate={noop} />,
    )
    expect(open).toContain('aria-expanded="true"')
    expect(open).toContain('aria-controls="globe-cluster-a-b"')
    expect(open).toContain('<ul id="globe-cluster-a-b" class="globe-cluster-list">')
    expect(open.match(/class="globe-cluster-item/g)).toHaveLength(2)
    expect(open).toContain('Pampa Yungay')
    const waiting = renderToStaticMarkup(
      <ClusterChip clusterKey="c:1" counts={counts} group="" members={null} open hover={false} onToggle={noop} onActivate={noop} />,
    )
    expect(waiting).toContain('Finding the places in the group')
  })

  it('kindsFromCounts orders ● ○ ◆', () => {
    expect(kindsFromCounts({ evaluated: 1, insufficient: 1, reference: 2 })).toEqual(['evaluated', 'insufficient', 'reference', 'reference'])
  })
})

describe('GlobeMarkerOverlay', () => {
  it('choreography A: ● every 120 ms after 300 ms, then ◆ and groups', () => {
    const { pins, after } = landingDelays([yungay, model({ id: 'b', kind: 'evaluated', order: 1 }), sinDatos, devon])
    expect([...pins]).toEqual([['cl-yungay', 300], ['b', 420], ['cl-sin-datos', 540], ['devon', 660]])
    expect(after).toBe(660)
  })

  it('paints all markers with their intro phase and selection dimming', () => {
    const html = renderToStaticMarkup(
      <GlobeMarkerOverlay runtime={createGlobeMarkerRuntime()} models={[yungay, sinDatos, devon]} selectedId="cl-yungay" hoverId={null} intro="play" onActivate={noop} />,
    )
    expect(html).toContain('<div class="globe-pins" data-intro="play" data-selection="">')
    expect(html.match(/class="globe-pin /g)).toHaveLength(3)
    expect(html).toContain('--land-delay:300ms')
    expect(html).toContain('--land-delay:540ms')
  })
})
