// Bloque «ficha» de tests/discovery.test.tsx del equipo, portado con los MISMOS textos esperados a
// la pestaña «Origen» (CandidateDetails no forma parte de la interfaz integrada; ADR-013).
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

describe('ficha · origen y antecedentes', () => {
  it('la ficha de un candidato muestra origen, prioridad topográfica y antecedentes con su fuente', () => {
    const html = details(ranked[0]!)
    expect(html).toContain('Candidato de la búsqueda')
    expect(html).toContain('Búsqueda por rejilla')
    expect(html).toContain('solo ordena la preselección')
    expect(html).toContain('Región con antecedentes publicados')
    expect(html).toContain('eso no prueba que sea nueva')
    expect(html).toContain('navarro.SOM_.pdf')
    expect(html).toContain('>País<')
  })

  it('la ficha de Yungay la rotula como referencia conocida y la de un fixture no inventa metadata', () => {
    const reference = details(references[0]!)
    expect(reference).toContain('<b>REF</b>')
    expect(reference).not.toContain('<b>7</b>')
    expect(reference).toContain('Referencia conocida')
    expect(reference).toContain('No sale de la búsqueda')
    expect(reference).toContain('La ventana contiene coordenadas de muestreo publicadas')
    const fixture = details(fixtures[0]!, false)
    expect(fixture).toContain('Fixture')
    expect(fixture).not.toContain('Origen y antecedentes')
  })

  it('las autoridades territoriales salen del propio sitio (IDERA en Argentina, IDE Chile en Chile)', () => {
    const argentina = ranked.find((site) => site.country === 'AR')!
    expect(details(argentina)).toContain('IDERA')
    expect(details(argentina)).not.toContain('IDE Chile')
    expect(details(ranked[0]!)).toContain('IDE Chile')
  })
})
