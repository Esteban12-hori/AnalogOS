"""Traceable evaluation of feasibility constraints.

Constraints never alter similarity. They produce a separate decision and
messages that preserve authority, source and reason for the candidate's record.
"""

from __future__ import annotations

from urllib.parse import urlparse

VALID_ACTIONS = {"exclude", "review", "warn"}
VALID_STATES = {"evaluated", "not_evaluated"}


def _source_is_valid(source_url: str) -> bool:
    parsed = urlparse(source_url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def evaluate_constraints(checks: list[dict]) -> dict:
    """Returns feasibility and warnings without mixing them with the score.

    Each check requires: ``constraint_id``, ``authority``, ``source_url``,
    ``action``, ``state``, ``triggered`` and ``reason``. An unevaluated check
    requires human review, even if ``triggered`` is false.
    """
    warnings: list[str] = []
    excluded = False
    requires_review = False

    for check in checks:
        missing = {
            key for key in (
                "constraint_id", "authority", "source_url", "action",
                "state", "triggered", "reason",
            ) if key not in check
        }
        if missing:
            raise ValueError(f"Incomplete constraint; missing: {', '.join(sorted(missing))}")
        if check["action"] not in VALID_ACTIONS:
            raise ValueError(f"Invalid constraint action: {check['action']}")
        if check["state"] not in VALID_STATES:
            raise ValueError(f"Invalid constraint state: {check['state']}")
        if not check["authority"].strip():
            raise ValueError("Every constraint must declare an authority.")
        if not _source_is_valid(check["source_url"]):
            raise ValueError("Every constraint must declare a valid http(s) URL.")

        prefix = f"{check['constraint_id']} · {check['authority']}"
        source = check["source_url"]
        if check["state"] == "not_evaluated":
            requires_review = True
            warnings.append(
                f"REVISIÓN PENDIENTE — {prefix}: {check['reason']} Fuente: {source}"
            )
            continue
        if not check["triggered"]:
            continue

        if check["action"] == "exclude":
            excluded = True
            warnings.append(f"EXCLUIDO — {prefix}: {check['reason']} Fuente: {source}")
        elif check["action"] == "review":
            requires_review = True
            warnings.append(f"REVISAR — {prefix}: {check['reason']} Fuente: {source}")
        else:
            warnings.append(f"ADVERTENCIA — {prefix}: {check['reason']} Fuente: {source}")

    feasibility = (
        "excluded" if excluded
        else "requires_review" if requires_review
        else "potentially_feasible"
    )
    return {"feasibility": feasibility, "warnings": warnings}
