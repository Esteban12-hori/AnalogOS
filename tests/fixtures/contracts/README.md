# Fixtures de contrato (FIXTURE · no científico)

Casos válidos e inválidos para el contrato propio del rediseño Explorar / Misión que sigue vigente
tras la integración con dev (ADR-014, ADR-013):

| Carpeta | Contrato |
|---|---|
| `reference-analog/` | `contracts/reference-analog.schema.json` (catálogo de ◆ por calcular) |

Los contratos `mission-interpretation`, `evidence-packet` y `ai-analysis` (canal lktron) se
retiraron con sus fixtures: los sustituyen los contratos de misión del equipo
(`contracts/mission-{request,evaluation,export,ai}.schema.json`, ADR-009; ADR-012 queda sustituido).

- `expectations.json` dice qué se espera de cada archivo: válido, o inválido con la ruta
  (`path`, puntero JSON) y la palabra clave (`keyword`) del error que lo invalida.
- Los prueban dos suites independientes: `apps/web/src/tests/contractFixtures.test.ts`
  (validadores Ajv precompilados) y `tests/test_contract_fixtures.py` (jsonschema en Python).
- Los análogos `fixture-*`, sus coordenadas, fuentes `example.org` y textos
  son inventados para probar la forma del contrato. **No son datos, ubicaciones ni resultados
  reales** y no deben copiarse a `config/` ni a `artifacts/`.
