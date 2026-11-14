// Guardián del contrato del paralelo (docs/BUILD_CONTRACTS.md): cada feature debe seguir
// exportando su interfaz estable. Añadir exports está permitido; quitar o renombrar, no.
import { describe, expect, it } from 'vitest'

const CONTRACT: Record<string, readonly string[]> = {
  places: ['PlaceRail', 'ReferenceCard', 'loadReferenceAnalogs', 'useReferenceAnalogs'],
  globe: ['MapStage', 'contextLayers', 'getStageAnchor', 'getStageProjection', 'publishStageFrame', 'subscribeStageFrame'],
  metrics: ['MetricRail', 'buildMetricViews'],
  leaders: ['LeaderLayer', 'LeaderToggle', 'layoutLeaders', 'pickPrincipalMetrics'],
  boot: ['BootLayer', 'OrbitLoader', 'StatusChip', 'getBootMilestones', 'reportBootMilestone', 'useBootMilestones'],
  engine: [
    'ENGINE_VERSION',
    'MISSION_PRESETS',
    'PHASE_THRESHOLDS',
    'aggregate',
    'levelsToWeights',
    'matchMissionDemo',
    'nextMissionPhase',
    'profileFromLevels',
    'scoreMission',
    'sensitivity',
  ],
  composer: ['Composer', 'MissionCard', 'focusComposer'],
  analysis: ['LKTRON_ENABLED', 'ReadingPanel', 'ReadingPill', 'interpretWithLktron'],
}

const loaders: Record<string, () => Promise<Record<string, unknown>>> = {
  places: () => import('../features/places'),
  globe: () => import('../features/globe'),
  metrics: () => import('../features/metrics'),
  leaders: () => import('../features/leaders'),
  boot: () => import('../features/boot'),
  engine: () => import('../features/engine'),
  composer: () => import('../features/composer'),
  analysis: () => import('../features/analysis'),
}

describe('contrato de las features', () => {
  for (const [key, names] of Object.entries(CONTRACT)) {
    it(`features/${key} exporta su interfaz estable`, async () => {
      const load = loaders[key]
      expect(load).toBeDefined()
      if (!load) return
      const module = await load()
      for (const name of names) expect(module, `${key}.${name}`).toHaveProperty(name)
    })
  }

  it('el motor nunca inventa cifras: sin perfil usable cada sector queda «por calcular»', async () => {
    const engine = await import('../features/engine')
    // La paridad con pipelines/scoring.py vive en features/engine/parity.test.ts; aquí solo se
    // fija la regla honesta del contrato: perfil vacío + perfil base inutilizable → sin números.
    expect(engine.ENGINE_VERSION.endsWith('-stub')).toBe(false)
    const scoring = engine.scoreMission({
      profile: {
        id: 'mission:00000000',
        origin: 'mission',
        label: 'prueba',
        status: 'needs_calibration',
        levels: { slope: 3, terrain_roughness: 3, local_relief: 2, bare_ground_fraction: 2, aridity_context: 1, surface_temperature_variability: 0, geologic_relevance: 0 },
        weights: { slope: 0, terrain_roughness: 0, local_relief: 0, bare_ground_fraction: 0, aridity_context: 0, surface_temperature_variability: 0, geologic_relevance: 0 },
        baseProfileId: 'mars-rover-screening-v2',
        baseProfileVersion: 'x',
      },
      candidates: [{ site_id: 'cl-b' }, { site_id: 'cl-a' }] as never,
      base: {} as never,
    })
    expect(scoring.sites.map((site) => [site.siteId, site.similarity, site.status])).toEqual([
      ['cl-a', null, 'por_calcular'],
      ['cl-b', null, 'por_calcular'],
    ])
  })
})
