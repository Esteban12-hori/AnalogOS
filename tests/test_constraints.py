import pytest

from pipelines.constraints import evaluate_constraints


def check(**overrides):
    base = {
        "constraint_id": "protected_area",
        "authority": "Autoridad de prueba",
        "source_url": "https://example.org/dataset",
        "action": "exclude",
        "state": "evaluated",
        "triggered": False,
        "reason": "Intersección espacial de prueba.",
    }
    return base | overrides


def test_exclusion_keeps_authority_source_and_reason():
    result = evaluate_constraints([check(triggered=True)])
    assert result["feasibility"] == "excluded"
    warning = result["warnings"][0]
    assert "Autoridad de prueba" in warning
    assert "Intersección espacial" in warning
    assert "https://example.org/dataset" in warning


def test_not_evaluated_requires_review_even_when_not_triggered():
    result = evaluate_constraints([check(state="not_evaluated")])
    assert result["feasibility"] == "requires_review"
    assert "REVISIÓN PENDIENTE" in result["warnings"][0]


def test_warn_does_not_exclude_and_clean_checks_are_potentially_feasible():
    warned = evaluate_constraints([check(action="warn", triggered=True)])
    assert warned["feasibility"] == "potentially_feasible"
    assert warned["warnings"]
    assert evaluate_constraints([check()])["feasibility"] == "potentially_feasible"


def test_constraint_requires_traceability():
    with pytest.raises(ValueError):
        evaluate_constraints([check(authority="")])
    with pytest.raises(ValueError):
        evaluate_constraints([check(source_url="not-a-url")])
