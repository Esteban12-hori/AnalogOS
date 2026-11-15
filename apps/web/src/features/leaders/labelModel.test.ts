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
  it('pendiente de Yungay: valor del sector, ■ Jezero (MOLA) y similitud entera', () => {
    const slope = byId('slope')
    expect(slope.title).toBe('Pendiente')
    expect(slope.siteText).toBe('3,2°')
    expect(slope.reference).toEqual({ kind: 'mars', text: '2,2°' })
    expect(slope.similarity).toBe(69)
    expect(slope.similarityText).toBe('69 %')
    expect(slope.pending).toBe(false)
  })

  it('■ Jezero solo donde hay medición MOLA (pendiente, rugosidad, relieve); nunca se inventa', () => {
    const withMars = views.map(leaderLabelModel).filter((label) => label.reference.kind === 'mars').map((label) => label.id)
    expect(withMars).toEqual(['slope', 'terrain_roughness', 'local_relief'])
  })

  it('suelo expuesto, aridez y rango térmico: «┆ regla», nunca un valor marciano', () => {
    for (const id of ['bare_ground_fraction', 'aridity_context', 'surface_temperature_variability']) {
      expect(byId(id).reference.kind).toBe('rule')
    }
    expect(byId('bare_ground_fraction').note).toBe(RULE_SATURATES_TEXT)
  })

  it('sin regla ni medición marciana: «Marte: sin medición comparable»', () => {
    const geology = views.find((view) => view.criterionId === 'geologic_relevance')
    if (!geology) throw new Error('geología')
    const label = leaderLabelModel({ ...geology, rule: null })
    expect(label.reference).toEqual({ kind: 'none' })
    expect(NO_MARS_TEXT).toBe('Marte: sin medición comparable')
  })

  it('sin dato o por calcular: sin cifra, trazo discontinuo', () => {
    const geology = byId('geologic_relevance')
    expect(geology.similarity).toBeNull()
    expect(geology.pending).toBe(true)
    expect(geology.similarityText).toBe('por calcular')
    const missing = views.find((view) => view.criterionId === 'slope')
    if (!missing) throw new Error('pendiente')
    const label = leaderLabelModel({ ...missing, status: 'missing', similarity: null })
    expect(label.similarityText).toBe('sin dato')
  })

  it('el limitante sale de `contribution` (rugosidad en Yungay), no de la similitud más baja', () => {
    const limiting = views.map(leaderLabelModel).filter((label) => label.limiting).map((label) => label.id)
    expect(limiting).toEqual(['terrain_roughness'])
    // La similitud más baja es Relieve (63 %): no se marca.
    expect(byId('local_relief').similarity).toBe(63)
    expect(byId('local_relief').limiting).toBe(false)
  })

  it('redondea la similitud a entero (es-CL) y la acota a 0–100', () => {
    const slope = views.find((view) => view.criterionId === 'slope')
    if (!slope) throw new Error('pendiente')
    expect(leaderLabelModel({ ...slope, similarity: 99.6 }).similarityText).toBe('100 %')
    expect(leaderLabelModel({ ...slope, similarity: 120 }).similarity).toBe(100)
  })
})

describe('encabezado de honestidad', () => {
  it('«Todo el sector · ≈ 450 km² · medianas ~460–480 m · vs ■ Jezero (MOLA)» con datos del snapshot', () => {
    const principal = pickPrincipalMetrics(views)
    const header = leaderHeader({ site: yungay, manifest: scienceManifest, principal, missionActive: false })
    expect(header).toEqual({ area: '≈ 450 km²', scale: '~460–480 m', vsMars: true, mission: false })
    expect(headerText(header)).toBe('Todo el sector · ≈ 450 km² · medianas ~460–480 m · vs ■ Jezero (MOLA)')
  })

  it('en Misión agrega «con tus requisitos»; sin ■ en las etiquetas no nombra a Jezero', () => {
    const principal = pickPrincipalMetrics(views).filter((view) => view.marsValue === null)
    const header = leaderHeader({ site: yungay, manifest: scienceManifest, principal, missionActive: true })
    expect(headerText(header)).toBe('Todo el sector · ≈ 450 km² · medianas · con tus requisitos')
  })

  it('la escala sale del manifiesto o no se muestra (sin cifras inventadas)', () => {
    expect(topographicScale(scienceManifest, ['derived-mola-nasadem-sentinel2-v2'])).toBe('~460–480 m')
    expect(topographicScale(scienceManifest, ['nasa-power-climatology-points-v1'])).toBeNull()
    expect(topographicScale(null, ['derived-mola-nasadem-sentinel2-v2'])).toBeNull()
  })

  it('María Elena: área con dos cifras significativas (≈ 460 km²)', () => {
    const site = scienceSite('cl-pampa-maria-elena-screening')
    expect(leaderHeader({ site, manifest: null, principal: [], missionActive: false }).area).toBe('≈ 460 km²')
  })
})
