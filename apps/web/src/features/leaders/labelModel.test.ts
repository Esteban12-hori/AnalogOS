import { describe, expect, it } from 'vitest'
import { headerText, leaderHeader, leaderLabelModel, NO_MARS_TEXT, RULE_SATURATES_TEXT, topographicScale } from './labelModel'
import { pickPrincipalMetrics } from './principal'
import { scienceManifest, scienceSite, snapshotViews } from './testSupport'

const yungay = scienceSite('cl-pampa-yungay-screening')
const views = snapshotViews(yungay)
const byId = (id: string) => {
  const view = views.find((item) => item.criterionId === id)
  if (!view) throw new Error(id)
  return leaderLabelModel(view)
}

describe('leaderLabelModel', () => {
  it('Yungay slope: sector value, ■ Jezero (MOLA) and integer similarity', () => {
    const slope = byId('slope')
    expect(slope.title).toBe('Slope')
    expect(slope.siteText).toBe('3.2°')
    expect(slope.reference).toEqual({ kind: 'mars', text: '2.2°' })
    expect(slope.similarity).toBe(69)
    expect(slope.similarityText).toBe('69%')
    expect(slope.pending).toBe(false)
  })

  it('■ Jezero only where there is a MOLA measurement (slope, roughness, relief); never invented', () => {
    const withMars = views.map(leaderLabelModel).filter((label) => label.reference.kind === 'mars').map((label) => label.id)
    expect(withMars).toEqual(['slope', 'terrain_roughness', 'local_relief'])
  })

  it('bare ground, aridity and thermal range: “┆ rule”, never a Martian value', () => {
    for (const id of ['bare_ground_fraction', 'aridity_context', 'surface_temperature_variability']) {
      expect(byId(id).reference.kind).toBe('rule')
    }
    expect(byId('bare_ground_fraction').note).toBe(RULE_SATURATES_TEXT)
  })

  it('no rule or Martian measurement: “Mars: no comparable measurement”', () => {
    const geology = views.find((view) => view.criterionId === 'geologic_relevance')
    if (!geology) throw new Error('geology')
    const label = leaderLabelModel({ ...geology, rule: null })
    expect(label.reference).toEqual({ kind: 'none' })
    expect(NO_MARS_TEXT).toBe('Mars: no comparable measurement')
  })

  it('no data or to be calculated: no figure, dashed stroke', () => {
    const geology = byId('geologic_relevance')
    expect(geology.similarity).toBeNull()
    expect(geology.pending).toBe(true)
    expect(geology.similarityText).toBe('not yet calculated')
    const missing = views.find((view) => view.criterionId === 'slope')
    if (!missing) throw new Error('pendiente')
    const label = leaderLabelModel({ ...missing, status: 'missing', similarity: null })
    expect(label.similarityText).toBe('no data')
  })

  it('the limiting factor comes from `contribution` (roughness in Yungay), not from the lowest similarity', () => {
    const limiting = views.map(leaderLabelModel).filter((label) => label.limiting).map((label) => label.id)
    expect(limiting).toEqual(['terrain_roughness'])
    // The lowest similarity is Local relief (63%): it is not marked.
    expect(byId('local_relief').similarity).toBe(63)
    expect(byId('local_relief').limiting).toBe(false)
  })

  it('rounds similarity to an integer and clamps it to 0–100', () => {
    const slope = views.find((view) => view.criterionId === 'slope')
    if (!slope) throw new Error('pendiente')
    expect(leaderLabelModel({ ...slope, similarity: 99.6 }).similarityText).toBe('100%')
    expect(leaderLabelModel({ ...slope, similarity: 120 }).similarity).toBe(100)
  })
})

describe('honesty header', () => {
  it('“Whole sector · ≈ 450 km² · medians ~460–480 m · vs ■ Jezero (MOLA)” with snapshot data', () => {
    const principal = pickPrincipalMetrics(views)
    const header = leaderHeader({ site: yungay, manifest: scienceManifest, principal, missionActive: false })
    expect(header).toEqual({ area: '≈ 450 km²', scale: '~460–480 m', vsMars: true, mission: false })
    expect(headerText(header)).toBe('Whole sector · ≈ 450 km² · medians ~460–480 m · vs ■ Jezero (MOLA)')
  })

  it('in Mission adds “with your requirements”; without ■ on the labels it does not name Jezero', () => {
    const principal = pickPrincipalMetrics(views).filter((view) => view.marsValue === null)
    const header = leaderHeader({ site: yungay, manifest: scienceManifest, principal, missionActive: true })
    expect(headerText(header)).toBe('Whole sector · ≈ 450 km² · medians · with your requirements')
  })

  it('the scale comes from the manifest or is not shown (no invented figures)', () => {
    expect(topographicScale(scienceManifest, ['derived-mola-nasadem-sentinel2-v2'])).toBe('~460–480 m')
    expect(topographicScale(scienceManifest, ['nasa-power-climatology-points-v1'])).toBeNull()
    expect(topographicScale(null, ['derived-mola-nasadem-sentinel2-v2'])).toBeNull()
  })

  it('María Elena: area with two significant figures (≈ 460 km²)', () => {
    const site = scienceSite('cl-pampa-maria-elena-screening')
    expect(leaderHeader({ site, manifest: null, principal: [], missionActive: false }).area).toBe('≈ 460 km²')
  })
})
