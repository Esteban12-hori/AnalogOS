// Guardián del contrato del paralelo (docs/BUILD_CONTRACTS.md): cada feature debe seguir
// exportando su interfaz estable. Añadir exports está permitido; quitar o renombrar, no.
import { describe, expect, it } from 'vitest'

const CONTRACT: Record<string, readonly string[]> = {
  places: ['PlaceRail', 'ReferenceCard', 'loadReferenceAnalogs', 'useReferenceAnalogs'],
  globe: ['MapStage', 'contextLayers', 'getStageAnchor', 'getStageProjection', 'publishStageFrame', 'subscribeStageFrame'],
  metrics: ['MetricRail'],
  // Modelo puro: módulo propio, fuera del índice para que no pese en el chunk principal (§6.1).
  'metrics/buildMetricViews': ['buildMetricViews', 'limitingView', 'METRIC_LABELS'],
  leaders: ['LeaderLayer', 'LeaderToggle'],
  'leaders/layoutLeaders': ['layoutLeaders', 'LEADER_GEOMETRY'],
  'leaders/principal': ['pickPrincipalMetrics', 'pickMissionMetrics'],
  boot: ['BootLayer', 'OrbitLoader', 'StatusChip', 'getBootMilestones', 'reportBootMilestone', 'useBootMilestones'],
  // El motor propio (features/engine) se retiró: la evaluación es la del equipo (ADR-009, ADR-015).
  composer: ['Composer', 'MissionCard', 'focusComposer', 'registerMissionSnapshot', 'withController', 'MissionPrintHost'],
  // Sin lktron (ADR-012, sustituido): la Lectura usa la IA del equipo vía el controlador de misión.
  analysis: ['ReadingPanel', 'ReadingPill'],
  // Controlador de misión (chunk diferido): planificador del equipo compartido (ADR-013).
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

  it('ninguna feature importa el motor propio ni el cliente lktron retirados', async () => {
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
      // Importaciones e identificadores; los comentarios pueden citar lo retirado para explicarlo.
      expect(text, file).not.toMatch(/^import[^\n]*(features\/engine|\.\.\/engine'|lktron|ndjson|aiContracts|interpretationContract)/m)
      expect(text, file).not.toMatch(/\b(LKTRON_ENABLED|interpretWithLktron|MissionScoring|scoreMission|matchMissionDemo|VITE_LKTRON)\b/)
    }
  })
})
