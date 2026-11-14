# Fixtures de contrato (FIXTURE · no científico)

Casos válidos e inválidos para los contratos nuevos del rediseño Explorar / Misión
(`docs/UX_REDESIGN.md` §5, ADR-008/009/010):

| Carpeta | Contrato |
|---|---|
| `reference-analog/` | `contracts/reference-analog.schema.json` (catálogo de ◆ por calcular) |
| `mission-interpretation/` | `contracts/mission-interpretation.schema.json` |
| `evidence-packet/` | `contracts/evidence-packet.schema.json` |
| `ai-analysis/` | `contracts/ai-analysis.schema.json` (un evento por línea; `.ndjson` = cada línea válida) |

- `expectations.json` dice qué se espera de cada archivo: válido, o inválido con la ruta
  (`path`, puntero JSON) y la palabra clave (`keyword`) del error que lo invalida.
- Los prueban dos suites independientes: `apps/web/src/tests/aiContracts.test.ts` (validadores
  Ajv precompilados) y `tests/test_ai_contracts.py` (jsonschema en Python).
- Los análogos `fixture-*`, sus coordenadas, fuentes `example.org`, `packet_hash` y textos
  son inventados para probar la forma del contrato. **No son datos, ubicaciones ni resultados
  reales** y no deben copiarse a `config/` ni a `artifacts/`.
