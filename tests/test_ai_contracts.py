"""Fixtures válidos e inválidos de los contratos del rediseño (UX_REDESIGN §5).

La misma tabla `tests/fixtures/contracts/expectations.json` la prueba Vitest con los
validadores Ajv precompilados; aquí se comprueba con jsonschema que ambos coinciden.
"""

import json

import pytest
from jsonschema import Draft202012Validator, FormatChecker

from pipelines.contracts import CONTRACTS_DIR, ROOT, ContractError, validate

FIXTURES = ROOT / "tests" / "fixtures" / "contracts"
EXPECTATIONS = json.loads((FIXTURES / "expectations.json").read_text("utf-8"))
CASES = [(contract, name, expected)
         for contract, files in EXPECTATIONS.items()
         for name, expected in files.items()]


def _documents(path):
    text = path.read_text("utf-8")
    if path.suffix == ".ndjson":
        return [json.loads(line) for line in text.splitlines() if line.strip()]
    return [json.loads(text)]


def _flatten(errors):
    for error in errors:
        yield error
        yield from _flatten(error.context or [])


def _pointer(error):
    return "/" + "/".join(str(part) for part in error.absolute_path)


def test_every_fixture_file_has_an_expectation():
    on_disk = {(p.parent.name, p.name) for p in FIXTURES.glob("*/*") if p.suffix in {".json", ".ndjson"}}
    declared = {(contract, name) for contract, name, _ in CASES}
    assert on_disk == declared


@pytest.mark.parametrize(("contract", "name", "expected"), CASES, ids=[f"{c}/{n}" for c, n, _ in CASES])
def test_fixture_behaves_as_expected(contract, name, expected):
    schema = json.loads((CONTRACTS_DIR / f"{contract}.schema.json").read_text("utf-8"))
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    for document in _documents(FIXTURES / contract / name):
        if expected["valid"]:
            validate(document, contract)
            continue
        with pytest.raises(ContractError):
            validate(document, contract)
        found = {(_pointer(e), e.validator) for e in _flatten(validator.iter_errors(document))}
        assert (expected["path"], expected["keyword"]) in found, found
