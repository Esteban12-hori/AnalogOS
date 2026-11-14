# Fixture de paridad del motor (FIXTURE · no científico)

`parity.json` fija lo que produce `pipelines/scoring.py` para que el motor TypeScript
(`apps/web/src/features/engine`) lo reproduzca con tolerancia ≤1e-6 (ADR-009).

- **Lo genera** `tests/test_engine_parity.py` (nunca a mano):
  `/tmp/claude-venv314/bin/python tests/test_engine_parity.py --write` (Python ≥3.12: `sum()`
  compensado de Neumaier, que el motor también imita).
- **Lo verifican** dos suites:
  - `tests/test_engine_parity.py` → el fixture comprometido sigue coincidiendo con el pipeline actual;
  - `apps/web/src/features/engine/parity.test.ts` → el motor TS coincide con el fixture.

| Sección | Contenido |
|---|---|
| `round_cases`, `sum_cases` | `round()` y `sum()` de Python en empates binarios y sumas con pérdida de precisión |
| `aggregate_cases` | casos sintéticos (`a`, `b`, `c`…), 40 aleatorios con semilla fija y el perfil base sobre `artifacts/science-v2` |
| `mission_cases` | conjuntos de niveles (cada `MISSION_PRESETS` + casos límite de cobertura) sobre el snapshot real |

Los casos sintéticos y aleatorios **no son datos**. Los casos del snapshot solo copian insumos y
salidas del pipeline para comparar dos implementaciones: no son un resultado científico nuevo.
