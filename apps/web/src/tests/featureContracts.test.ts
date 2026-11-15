// Guardian of the parallel contract (docs/BUILD_CONTRACTS.md): each feature must keep
// exporting its stable interface. Adding exports is allowed; removing or renaming them is not.
import { describe, expect, it } from 'vitest'

const CONTRACT: Record<string, readonly string[]> = {
  places: ['PlaceRail', 'ReferenceCard', 'loadReferenceAnalogs', 'useReferenceAnalogs'],
  globe: ['MapStage', 'contextLayers', 'getStageAnchor', 'getStageProjection', 'publishStageFrame', 'subscribeStageFrame'],
  metrics: ['MetricRail'],
  // Pure model: its own module, outside the index so that it does not weigh on the main chunk (§6.1).
  'metrics/buildMetricViews': ['buildMetricViews', 'limitingView', 'METRIC_LABELS'],
  leaders: ['LeaderLayer', 'LeaderToggle'],
  'leaders/layoutLeaders': ['layoutLeaders', 'LEADER_GEOMETRY'],
  'leaders/principal': ['pickPrincipalMetrics', 'pickMissionMetrics'],
  boot: ['BootLayer', 'OrbitLoader', 'StatusChip', 'getBootMilestones', 'reportBootMilestone', 'useBootMilestones'],
  // The in-house engine (features/engine) was retired: evaluation is the team's (ADR-009, ADR-015).
  composer: ['Composer', 'MissionCard', 'focusComposer', 'registerMissionSnapshot', 'withController', 'MissionPrintHost'],
  // No lktron (ADR-012, superseded): the Reading uses the team's AI via the mission controller.
  analysis: ['ReadingPanel', 'ReadingPill'],
  // Mission controller (deferred chunk): shared team planner (ADR-013).
  'composer/missionController': ['createMissionController', 'missionController', 'phaseFor', 'explanationFor'],
}

const loaders: Record<string, () => Promise<Record<string, unknown>>> = {
  places: () => import('../features/places'),
  globe: () => import('../features/globe'),
  metrics: () => import('../features/metrics'),
  'metrics/buildMetricViews': () => import('../features/metrics/buildMetricViews'),
  leaders: () => import('../features/leaders'),
  'leaders/layoutLeaders': () => import('../features/leaders/layoutLeaders'),
  'leaders/principal': () => import('../features/leaders/principal'),
  boot: () => import('../features/boot'),
  composer: () => import('../features/composer'),
  analysis: () => import('../features/analysis'),
  'composer/missionController': () => import('../features/composer/missionController'),
}

describe('feature contract', () => {
  for (const [key, names] of Object.entries(CONTRACT)) {
    it(`features/${key} exports its stable interface`, async () => {
      const load = loaders[key]
      expect(load).toBeDefined()
      if (!load) return
      const module = await load()
      for (const name of names) expect(module, `${key}.${name}`).toHaveProperty(name)
    })
  }

  it('no feature imports the retired in-house engine or lktron client', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs')
    const { join, resolve } = await import('node:path')
    const root = resolve(__dirname, '..')
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(path)
      }
    }
    walk(root)
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      // Imports and identifiers; comments may cite what was retired in order to explain it.
      expect(text, file).not.toMatch(/^import[^\n]*(features\/engine|\.\.\/engine'|lktron|ndjson|aiContracts|interpretationContract)/m)
      expect(text, file).not.toMatch(/\b(LKTRON_ENABLED|interpretWithLktron|MissionScoring|scoreMission|matchMissionDemo|VITE_LKTRON)\b/)
    }
  })
})
