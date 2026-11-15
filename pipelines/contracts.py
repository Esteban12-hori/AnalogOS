"""Validation of artifacts against the JSON Schemas of `contracts/`."""

import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parent.parent
CONTRACTS_DIR = ROOT / "contracts"


class ContractError(ValueError):
    pass


def validate(instance: object, contract: str) -> None:
    """Valida `instance` contra `contracts/<contract>.schema.json`; lanza ContractError."""
    schema = json.loads((CONTRACTS_DIR / f"{contract}.schema.json").read_text("utf-8"))
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(instance), key=lambda e: list(e.absolute_path))
    if errors:
        lines = [f"/{'/'.join(map(str, e.absolute_path))}: {e.message}" for e in errors]
        raise ContractError(f"{contract}: " + "; ".join(lines))


def load_profile(path: Path) -> dict:
    """Loads a mission profile, validates it, and checks that the weights sum to 1."""
    profile = json.loads(Path(path).read_text("utf-8"))
    # `$schema` is a hint for editors; the contract does not allow it (additionalProperties: false).
    profile.pop("$schema", None)
    validate(profile, "mission-profile")
    total = sum(c["weight"] for c in profile["criteria"])
    if abs(total - 1.0) > 1e-9:
        raise ContractError(f"mission-profile: weights sum to {total}, not 1")
    return profile
