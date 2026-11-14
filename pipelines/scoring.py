"""Agregación determinista de similitud y confianza (docs/DATA_AND_SCORING.md).

Similitud:  S = 100 × exp(Σ w'_i × ln(max(s_i, ε)))  sobre criterios válidos,
            con w'_i = w_i / (peso válido total).
Confianza:  C = 100 × Σ w_i × q_i  con los pesos originales; un criterio no
            válido aporta q_i = 0, así que los faltantes bajan la confianza
            sin tocar la similitud.
Son dos números independientes: nunca se combinan.
"""

import math

_TOLERANCE = 1e-9


def aggregate(criteria: list[dict], inputs: dict[str, dict], epsilon: float,
              minimum_valid_weight: float) -> dict:
    """Función pura.

    criteria: criterios del perfil (`id`, `weight`, `unit`).
    inputs:   por `criterion_id`: `similarity` (0–1 o None), `quality` (0–1),
              y opcionales `status`, `raw_value`, `dataset_id`, `explanation`.
              Un criterio ausente de `inputs` se trata como `missing`.
    Devuelve `similarity` (None si el peso válido < mínimo), `confidence`,
    `valid_weight` y `score_breakdown` compatible con candidate-site.schema.json.
    """
    rows = []
    for criterion in criteria:
        given = inputs.get(criterion["id"], {})
        s = given.get("similarity")
        status = given.get("status", "valid" if s is not None else "missing")
        if status == "valid" and s is None:
            status = "missing"
        if s is not None and not 0 <= s <= 1:
            raise ValueError(f"{criterion['id']}: similarity fuera de [0, 1]: {s}")
        quality = given.get("quality", 0.0) if status == "valid" else 0.0
        if not 0 <= quality <= 1:
            raise ValueError(f"{criterion['id']}: quality fuera de [0, 1]: {quality}")
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
    """Perturba cada peso ±``perturbation`` y devuelve estabilidad 0–100.

    Los pesos se renormalizan en cada escenario. ``stability`` mide el peor
    cambio absoluto del score respecto de la base: 100 significa que ninguna
    perturbación univariada movió el resultado; ``None`` indica datos
    insuficientes. También se devuelven los escenarios para auditoría.
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
            # La suficiencia ya fue aprobada para la base. La perturbación no
            # debe convertir artificialmente un criterio disponible en dato
            # insuficiente solo porque cambió su peso relativo.
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
