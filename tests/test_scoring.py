import math

import pytest

from pipelines.scoring import aggregate, sensitivity

CRITERIA = [
    {"id": "a", "weight": 0.5, "unit": "u"},
    {"id": "b", "weight": 0.3, "unit": "u"},
    {"id": "c", "weight": 0.2, "unit": "u"},
]


def run(inputs, epsilon=0.01, minimum=0.7):
    return aggregate(CRITERIA, inputs, epsilon, minimum)


def full(a=1.0, b=1.0, c=1.0, q=1.0):
    return {k: {"similarity": s, "quality": q} for k, s in (("a", a), ("b", b), ("c", c))}


def test_known_score_is_weighted_geometric_mean():
    result = run(full(0.9, 0.5, 0.8))
    expected = 100 * 0.9**0.5 * 0.5**0.3 * 0.8**0.2
    assert result["similarity"] == pytest.approx(expected, abs=0.01)
    assert result["valid_weight"] == 1


def test_perfect_inputs_give_100_and_contributions_sum_to_log_score():
    assert run(full())["similarity"] == 100
    result = run(full(0.9, 0.5, 0.8))
    total = sum(item["contribution"] for item in result["score_breakdown"])
    assert 100 * math.exp(total) == pytest.approx(result["similarity"], abs=0.05)


def test_epsilon_avoids_log_of_zero():
    result = run(full(a=0.0))
    assert result["similarity"] == pytest.approx(100 * 0.01**0.5, abs=0.01)


def test_one_very_low_criterion_penalizes_more_than_arithmetic_mean():
    result = run(full(a=0.05))
    arithmetic = 100 * (0.5 * 0.05 + 0.3 + 0.2)
    assert result["similarity"] < arithmetic / 2


def test_missing_renormalizes_similarity_and_lowers_confidence():
    complete = run(full(0.8, 0.8, 0.8, q=0.9))
    partial_inputs = full(0.8, 0.8, 0.8, q=0.9)
    del partial_inputs["c"]
    partial = run(partial_inputs)
    # Similitud: los pesos válidos (0.8) se renormalizan; faltar no es similitud cero.
    assert partial["similarity"] == pytest.approx(80, abs=0.01)
    assert partial["similarity"] == complete["similarity"]
    # Confianza: baja exactamente por el peso faltante.
    assert complete["confidence"] == pytest.approx(90)
    assert partial["confidence"] == pytest.approx(72)
    missing = partial["score_breakdown"][2]
    assert (missing["status"], missing["normalized_similarity"], missing["contribution"]) == ("missing", None, None)


def test_valid_weight_below_minimum_is_insufficient_data():
    result = run({"a": {"similarity": 0.9, "quality": 1.0}})  # peso válido 0.5 < 0.7
    assert result["similarity"] is None
    assert result["confidence"] == pytest.approx(50)
    assert all(item["contribution"] is None for item in result["score_breakdown"])


def test_valid_weight_exactly_at_minimum_is_sufficient():
    assert run({"a": {"similarity": 0.9, "quality": 1.0},
                "c": {"similarity": 0.9, "quality": 1.0}})["similarity"] == pytest.approx(90)


def test_uncalibrated_criterion_is_excluded_from_score():
    inputs = full(0.8, 0.8, 0.1)
    inputs["c"]["status"] = "needs_calibration"
    result = run(inputs)
    assert result["similarity"] == pytest.approx(80, abs=0.01)
    assert result["score_breakdown"][2]["quality"] == 0


def test_similarity_and_confidence_are_independent():
    low_q, high_q = run(full(0.7, 0.7, 0.7, q=0.2)), run(full(0.7, 0.7, 0.7, q=1.0))
    assert low_q["similarity"] == high_q["similarity"]
    assert low_q["confidence"] < high_q["confidence"]
    low_s, high_s = run(full(0.2, 0.2, 0.2, q=0.6)), run(full(0.9, 0.9, 0.9, q=0.6))
    assert low_s["confidence"] == high_s["confidence"]


def test_is_deterministic_and_rejects_out_of_range():
    assert run(full(0.3, 0.6, 0.9)) == run(full(0.3, 0.6, 0.9))
    with pytest.raises(ValueError):
        run(full(a=1.2))


def test_weight_sensitivity_is_deterministic_and_bounded():
    first = sensitivity(CRITERIA, full(0.9, 0.5, 0.8), 0.01, 0.7)
    second = sensitivity(CRITERIA, full(0.9, 0.5, 0.8), 0.01, 0.7)
    assert first == second
    assert 0 <= first["stability"] <= 100
    assert len(first["scenarios"]) == len(CRITERIA) * 2


def test_weight_sensitivity_returns_none_when_base_is_insufficient():
    result = sensitivity(CRITERIA, {"a": {"similarity": 0.8, "quality": 1}}, 0.01, 0.7)
    assert result["stability"] is None
    assert result["scenarios"] == []
