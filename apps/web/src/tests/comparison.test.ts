// Comparar de la ficha usa el perfil ACTIVO: en Misión, orden y cifras del motor (nunca las del
// snapshot), con el rótulo del perfil. Datos reales del snapshot v2.
import { describe, expect, it } from 'vitest'
import { comparisonModel } from '../components/CandidateComparison'
import { normalizeLevels, profileFromLevels, scoreMission } from '../features/engine'
import { loadScienceSnapshot } from '../features/analysis/testSupport'

const snapshot = loadScienceSnapshot()
const baseRef = { id: snapshot.profile.id, version: snapshot.profile.version }

describe('Comparar con el perfil activo', () => {
  it('perfil base: orden y cifras del snapshot', () => {
    const model = comparisonModel(snapshot.candidates, 'perfil base v2.0.1-preliminary', null)
    expect(model.profileLabel).toBe('perfil base v2.0.1-preliminary')
    expect(model.rows[0]?.candidate.site_id).toBe('cl-pampa-yungay-screening')
    expect(model.rows[0]?.similarity).toBe(snapshot.candidates.find((site) => site.site_id === 'cl-pampa-yungay-screening')?.similarity)
  })

  it('Misión: el orden y la similitud son los del motor (solo Relieve local pone a Domeyko #1)', () => {
    const profile = profileFromLevels(normalizeLevels({ local_relief: 3 }), baseRef, 'Solo relieve')
    const scoring = scoreMission({ profile, candidates: snapshot.candidates, base: snapshot.profile })
    const model = comparisonModel(snapshot.candidates, 'perfil base', { label: profile.label, engineVersion: scoring.engineVersion, sites: scoring.sites })
    expect(model.profileLabel).toMatch(/^tu misión: Solo relieve · motor v/)
    expect(model.rows.map((row) => row.candidate.site_id)).toEqual(scoring.sites.map((site) => site.siteId))
    expect(model.rows[0]?.candidate.site_id).toBe('cl-domeyko-interior-screening')
    for (const [index, row] of model.rows.entries()) {
      const scored = scoring.sites[index]
      expect(row.similarity).toBe(scored?.similarity)
      expect(row.confidence).toBe(scored?.confidence)
      expect(row.stability).toBe(scored?.stability ?? null)
    }
    expect(model.pendingText).toBe('por calcular con tu perfil')
  })
})
