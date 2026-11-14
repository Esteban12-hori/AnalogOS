# features/engine · motor de misión determinista (incremento 8, ADR-009)

Librería pura, sin UI ni stores. Se importa de forma diferida (`import('../engine')`) desde el
composer y el análisis. La IA nunca entra aquí: el motor produce toda cifra y todo orden.

| Módulo | Qué hace |
|---|---|
| `aggregate.ts` | `aggregate` y `sensitivity`: port de `pipelines/scoring.py`, paridad ≤1e-6 |
| `pyMath.ts` | `pyRound` (≡ `round()` de Python, empate al par) y `pySum` (≡ `sum()` de Python ≥3.12) |
| `profiles.ts` | niveles → pesos, `profileFromLevels` (`mission:<fnv1a32>`), `profileFromPreset`, `MISSION_PRESETS` |
| `scoreMission.ts` | `scoreMission` (orden con `rankCandidates`), `buildMissionInputs`, `limitingCriterion` |
| `demoMatcher.ts` | `matchMissionDemo`: palabras clave sin red, `engine: 'demo'`, rótulo «DEMO · sin IA» |
| `missionPhase.ts` | `nextMissionPhase`, `PHASE_THRESHOLDS` (0,3 / 3 / 10 / 20 s), `waitStage`, `createMissionRunController` |

## Uso previsto (composer)

```ts
const engine = await import('../engine')
const runs = engine.createMissionRunController({ onTimeout: () => fail('timeout') })
const run = runs.start()                       // cancela y reemplaza la corrida anterior
phase = engine.nextMissionPhase(phase, { type: 'submit' })
const demo = engine.matchMissionDemo(text, { id: base.id, version: base.version })
if (!runs.isCurrent(run)) return               // descarta resultados atrasados
const levels = engine.levelsFromInterpretation(demo.interpretation)
const profile = engine.profileFromLevels(levels, { id: base.id, version: base.version })
const scoring = engine.scoreMission({ profile, candidates, base })
runs.finish(run)
```

`features/analysis` debe calcular la robustez con `buildMissionInputs` + `sensitivity` para que
coincida con el % de `scoreMission`.

## Reglas

- Excluir (nivel 0) entra a `aggregate` como `excluded`: no aporta similitud, calidad ni limitante.
- Cobertura < `minimum_valid_weight` (0,70) → `insufficient_data` (similitud null, rango null).
- Sin perfil base utilizable, con otro perfil base o con todo en Excluir → cada sector
  `por_calcular` y `MissionScoring.reason` dice por qué. Nunca se inventa una cifra.
- Todos los perfiles de misión y predefinidos son `needs_calibration`.

## Paridad

`parity.test.ts` lee `tests/fixtures/engine/parity.json`, que genera `tests/test_engine_parity.py`.
Si cambias `MISSION_PRESETS`, agrega sus niveles a `LEVEL_SETS` en ese archivo y regenera:
`/tmp/claude-venv314/bin/python tests/test_engine_parity.py --write`.
