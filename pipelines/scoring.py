"""Deterministic aggregation of similarity and confidence (docs/DATA_AND_SCORING.md).

Similarity:  S = 100 × exp(Σ w'_i × ln(max(s_i, ε)))  over valid criteria,
            with w'_i = w_i / (total valid weight).
Confidence:  C = 100 × Σ w_i × q_i  using the original weights; an invalid criterion
            contributes q_i = 0, so missing ones lower the confidence
            without affecting the similarity.
They are two independent numbers: they are never combined.
"""

import math

_TOLERANCE = 1e-9


def aggregate(criteria: list[dict], inputs: dict[str, dict], epsilon: float,
              minimum_valid_weight: float) -> dict:
    """Pure function.

    criteria: profile criteria (`id`, `weight`, `unit`).
    inputs:   per `criterion_id`: `similarity` (0–1 or None), `quality` (0–1),
              and optional `status`, `raw_value`, `dataset_id`, `explanation`.
              A criterion absent from `inputs` is treated as `missing`.
    Returns `similarity` (None if the valid weight < minimum), `confidence`,
    `valid_weight` and `score_breakdown` compatible with candidate-site.schema.json.
    """
    rows = []
    for criterion in criteria:
        given = inputs.get(criterion["id"], {})
        s = given.get("similarity")
        status = given.get("status", "valid" if s is not None else "missing")
        if status == "valid" and s is None:
            status = "missing"
        if s is not None and not 0 <= s <= 1:
            raise ValueError(f"{criterion['id']}: similarity outside [0, 1]: {s}")
        quality = given.get("quality", 0.0) if status == "valid" else 0.0
        if not 0 <= quality <= 1:
            raise ValueError(f"{criterion['id']}: quality outside [0, 1]: {quality}")
        rows.append((criterion, given, s, status, quality))

    valid_weight = sum(c["weight"] for c, _, _, status, _ in rows if status == "valid")
    sufficient = valid_weight >= minimum_valid_weight - _TOLERANCE

    breakdown = []
    log_sum = 0.0
    for criterion, given, s, status, quality in rows:
        contribution = None
        if status == "valid" and sufficient:
            contribution = criterion["weight"] / valid_weight * math.log(max(s, epsilon))
            log_sum += contribution
        breakdown.append({
            "criterion_id": criterion["id"],
            "raw_value": given.get("raw_value"),
            "unit": criterion["unit"],
            "normalized_similarity": s,
            "weight": criterion["weight"],
            "contribution": None if contribution is None else round(contribution, 4),
            "quality": quality,
            "dataset_id": given.get("dataset_id", "none"),
            "status": status,
            "explanation": given.get("explanation", "Sin dato para este criterio."),
        })

    return {
        "similarity": round(100 * math.exp(log_sum), 2) if sufficient else None,
        "confidence": round(100 * sum(c["weight"] * q for c, _, _, _, q in rows), 2),
        "valid_weight": round(valid_weight, 6),
        "score_breakdown": breakdown,
    }


def sensitivity(criteria: list[dict], inputs: dict[str, dict], epsilon: float,
                minimum_valid_weight: float, perturbation: float = 0.2) -> dict:
    """Perturbs each weight by ±``perturbation`` and returns stability 0–100.

    The weights are renormalized in each scenario. ``stability`` measures the worst
    absolute change in the score relative to the baseline: 100 means that no
    univariate perturbation moved the result; ``None`` indicates insufficient
    data. The scenarios are also returned for auditing.
    """
    if not 0 < perturbation < 1:
        raise ValueError("perturbation debe estar entre 0 y 1")
    base = aggregate(criteria, inputs, epsilon, minimum_valid_weight)["similarity"]
    if base is None:
        return {"stability": None, "max_score_delta": None, "scenarios": []}

    scenarios = []
    for criterion in criteria:
        for direction, factor in (("minus", 1 - perturbation), ("plus", 1 + perturbation)):
            varied = [dict(item) for item in criteria]
            for item in varied:
                if item["id"] == criterion["id"]:
                    item["weight"] *= factor
            total = sum(item["weight"] for item in varied)
            for item in varied:
                item["weight"] /= total
            # Sufficiency was already approved for the baseline. The perturbation must not
            # artificially turn an available criterion into insufficient
            # data merely because its relative weight changed.
            score = aggregate(varied, inputs, epsilon, 0.0)["similarity"]
            scenarios.append({
                "criterion_id": criterion["id"],
                "direction": direction,
                "score": score,
                "delta": None if score is None else round(score - base, 2),
            })

    valid_deltas = [abs(row["delta"]) for row in scenarios if row["delta"] is not None]
    max_delta = max(valid_deltas, default=0.0)
    return {
        "stability": round(max(0.0, 100.0 - max_delta), 2),
        "max_score_delta": round(max_delta, 2),
        "scenarios": scenarios,
    }
