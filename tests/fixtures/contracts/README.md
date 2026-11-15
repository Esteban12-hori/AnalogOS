# Contract fixtures (FIXTURE · non-scientific)

Valid and invalid cases for the Explore / Mission redesign's own contract that remains in force
after the integration with dev (ADR-014, ADR-013):

| Folder | Contract |
|---|---|
| `reference-analog/` | `contracts/reference-analog.schema.json` (catalog of ◆ to be computed) |

The contracts `mission-interpretation`, `evidence-packet` and `ai-analysis` (lktron channel) were
retired along with their fixtures: they are replaced by the team's mission contracts
(`contracts/mission-{request,evaluation,export,ai}.schema.json`, ADR-009; ADR-012 is superseded).

- `expectations.json` states what is expected of each file: valid, or invalid with the path
  (`path`, JSON pointer) and the keyword (`keyword`) of the error that invalidates it.
- They are tested by two independent suites: `apps/web/src/tests/contractFixtures.test.ts`
  (precompiled Ajv validators) and `tests/test_contract_fixtures.py` (jsonschema in Python).
- The `fixture-*` analogs, their coordinates, `example.org` sources and texts
  are invented to test the shape of the contract. **They are not real data, locations or results**
  and must not be copied into `config/` or `artifacts/`.
