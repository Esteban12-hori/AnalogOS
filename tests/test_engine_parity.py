"""Paridad del motor TypeScript (apps/web/src/features/engine) con pipelines/scoring.py.

ADR-009 exige que el port TS de `aggregate()` y `sensitivity()` reproduzca la agregación del
pipeline con tolerancia ≤1e-6. Este archivo es la ÚNICA fuente de los valores esperados:

- `build_fixture()` corre `pipelines.scoring` sobre casos sintéticos, aleatorios con semilla fija
  y el snapshot real `artifacts/science-v2`, y produce `tests/fixtures/engine/parity.json`.
- `apps/web/src/features/engine/parity.test.ts` lee ese archivo y compara el motor TS.
- `test_fixture_is_current` falla si el fixture comprometido ya no coincide con lo que produce
  hoy `pipelines/scoring.py` (por ejemplo, si cambió la fórmula o el snapshot).

Regenerar (no toca artifacts/ ni submission/):

    /tmp/claude-venv314/bin/python tests/test_engine_parity.py --write

El fixture es FIXTURE: los casos sintéticos no son datos y los casos del snapshot solo copian
insumos y salidas del pipeline para comparar implementaciones; no es un resultado científico.
"""

from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipelines.scoring import aggregate, sensitivity  # noqa: E402

FIXTURE = ROOT / "tests" / "fixtures" / "engine" / "parity.json"
SNAPSHOT = ROOT / "artifacts" / "science-v2"
TOLERANCE = 1e-6
# Comparación del fixture comprometido con uno recién generado: mucho más estricta que la
# paridad, solo para tolerar diferencias de último bit entre plataformas.
CURRENT_TOLERANCE = 1e-9

CRITERION_IDS = [
    "slope",
    "terrain_roughness",
    "local_relief",
    "bare_ground_fraction",
    "aridity_context",
    "surface_temperature_variability",
    "geologic_relevance",
]

# Conjuntos de niveles (Clave 3 · Importante 2 · Menor 1 · Excluir 0) que se puntúan sobre el
# snapshot real. Deben incluir cada `MISSION_PRESETS` del motor TS: parity.test.ts lo exige.
LEVEL_SETS: dict[str, dict[str, int]] = {
    "preset-movilidad": {
        "slope": 3, "terrain_roughness": 3, "local_relief": 2, "bare_ground_fraction": 2,
        "aridity_context": 1, "surface_temperature_variability": 0, "geologic_relevance": 0,
    },
    "preset-navegacion": {
        "slope": 2, "terrain_roughness": 3, "local_relief": 3, "bare_ground_fraction": 1,
        "aridity_context": 0, "surface_temperature_variability": 0, "geologic_relevance": 0,
    },
    "preset-traccion": {
        "slope": 3, "terrain_roughness": 2, "local_relief": 1, "bare_ground_fraction": 2,
        "aridity_context": 0, "surface_temperature_variability": 0, "geologic_relevance": 0,
    },
    "preset-superficie": {
        "slope": 0, "terrain_roughness": 1, "local_relief": 0, "bare_ground_fraction": 3,
        "aridity_context": 2, "surface_temperature_variability": 0, "geologic_relevance": 0,
    },
    # Casos límite de cobertura y de un solo criterio.
    "solo-rugosidad": {
        "slope": 0, "terrain_roughness": 3, "local_relief": 0, "bare_ground_fraction": 0,
        "aridity_context": 0, "surface_temperature_variability": 0, "geologic_relevance": 0,
    },
    "todo-clave-con-geologia": {
        "slope": 3, "terrain_roughness": 3, "local_relief": 3, "bare_ground_fraction": 3,
        "aridity_context": 3, "surface_temperature_variability": 3, "geologic_relevance": 3,
    },
    "cobertura-justo-en-el-umbral": {
        "slope": 3, "terrain_roughness": 2, "local_relief": 2, "bare_ground_fraction": 0,
        "aridity_context": 0, "surface_temperature_variability": 0, "geologic_relevance": 3,
    },
    "cobertura-insuficiente": {
        "slope": 1, "terrain_roughness": 0, "local_relief": 0, "bare_ground_fraction": 1,
        "aridity_context": 0, "surface_temperature_variability": 0, "geologic_relevance": 3,
    },
    "termico-y-aridez": {
        "slope": 0, "terrain_roughness": 0, "local_relief": 0, "bare_ground_fraction": 0,
        "aridity_context": 1, "surface_temperature_variability": 3, "geologic_relevance": 0,
    },
}

ROUND_CASES = [
    # Empates exactos en binario: Python redondea al par (round-half-even).
    (0.125, 2), (0.375, 2), (0.625, 2), (0.875, 2), (-0.125, 2), (2.5, 0), (3.5, 0),
    (0.03125, 4), (-0.03125, 4), (0.0078125, 6), (1.0078125, 6),
    # No son empates aunque lo parezcan en decimal.
    (2.675, 2), (1.005, 2), (77.445, 2), (49.995, 2), (0.0815, 3), (-0.08105, 4),
    # Signos y ceros.
    (1e-7, 4), (-1e-7, 4), (-0.0, 2), (0.0, 6), (100.0, 2), (99.99999999, 2),
]

SUM_CASES = [
    [0.1] * 10,
    [1e16, 1.0, -1e16],
    [0.2, 0.2, 0.15, 0.2, 0.1, 0.05, 0.1],
    [0.186, 0.182, 0.1365, 0.17988, 0.06, 0.03, 0.0],
    [3 / 11, 3 / 11, 2 / 11, 2 / 11, 1 / 11],
    [],
    [0.7],
]


def _snapshot():
    profile = json.loads((SNAPSHOT / "mission-profile.json").read_text(encoding="utf-8"))
    candidates = json.loads((SNAPSHOT / "candidate-details.json").read_text(encoding="utf-8"))
    return profile, candidates


def _aggregate_view(result: dict) -> dict:
    breakdown = result["score_breakdown"]
    return {
        "similarity": result["similarity"],
        "confidence": result["confidence"],
        "valid_weight": result["valid_weight"],
        "contributions": {row["criterion_id"]: row["contribution"] for row in breakdown},
        "statuses": {row["criterion_id"]: row["status"] for row in breakdown},
    }


def _sensitivity_view(result: dict) -> dict:
    return {
        "stability": result["stability"],
        "max_score_delta": result["max_score_delta"],
        "scenarios": [dict(row) for row in result["scenarios"]],
    }


def _case(name, criteria, inputs, epsilon=0.01, minimum=0.7, perturbation=0.2, note=None) -> dict:
    case = {
        "name": name,
        "criteria": criteria,
        "inputs": inputs,
        "epsilon": epsilon,
        "minimum_valid_weight": minimum,
        "perturbation": perturbation,
    }
    if note:
        case["note"] = note
    try:
        case["expected"] = _aggregate_view(aggregate(criteria, inputs, epsilon, minimum))
    except (ValueError, ZeroDivisionError) as error:
        case["expected_error"] = type(error).__name__
        return case
    try:
        case["expected_sensitivity"] = _sensitivity_view(sensitivity(criteria, inputs, epsilon, minimum, perturbation))
    except (ValueError, ZeroDivisionError) as error:
        case["expected_sensitivity_error"] = type(error).__name__
    return case


def _crit(*pairs) -> list[dict]:
    return [{"id": cid, "weight": float(weight), "unit": "u"} for cid, weight in pairs]


def _synthetic_cases() -> list[dict]:
    abc = _crit(("a", 0.5), ("b", 0.3), ("c", 0.2))

    def full(a=1.0, b=1.0, c=1.0, q=1.0):
        return {cid: {"similarity": s, "quality": q} for cid, s in (("a", a), ("b", b), ("c", c))}

    return [
        _case("media-geometrica-conocida", abc, full(0.9, 0.5, 0.8)),
        _case("todo-perfecto", abc, full()),
        _case("cero-usa-epsilon", abc, full(0.0, 0.5, 0.8)),
        _case("bajo-epsilon-se-recorta", abc, full(0.001, 0.5, 0.8)),
        _case("epsilon-distinto", abc, full(0.0, 0.5, 0.8), epsilon=0.001),
        _case("faltante-ausente-con-cobertura", abc, {"a": {"similarity": 0.6, "quality": 0.9}, "b": {"similarity": 0.7, "quality": 0.8}}),
        _case("faltante-insuficiente", abc, {"a": {"similarity": 0.6, "quality": 0.9}}),
        _case("umbral-exacto-de-peso-valido", _crit(("a", 0.4), ("b", 0.3), ("c", 0.3)),
              {"a": {"similarity": 0.6, "quality": 0.9}, "b": {"similarity": 0.7, "quality": 0.8}}),
        _case("valid-sin-similitud-es-missing", abc,
              {"a": {"similarity": 0.6, "quality": 0.9, "status": "valid"}, "b": {"similarity": None, "quality": 0.8, "status": "valid"},
               "c": {"similarity": 0.4, "quality": 0.7}}, minimum=0.5),
        _case("needs-calibration-ignora-similitud-y-calidad", abc,
              {"a": {"similarity": 0.6, "quality": 0.9}, "b": {"similarity": 0.5, "quality": 0.8, "status": "needs_calibration"},
               "c": {"similarity": 0.4, "quality": 0.7}}, minimum=0.5),
        _case("excluido", abc,
              {"a": {"similarity": 0.6, "quality": 0.9}, "b": {"similarity": 0.5, "quality": 0.8, "status": "excluded"},
               "c": {"similarity": 0.4, "quality": 0.7}}, minimum=0.5),
        _case("pesos-sin-normalizar", _crit(("a", 2.0), ("b", 1.0), ("c", 1.0)), full(0.9, 0.5, 0.8, q=0.5), minimum=1.4),
        _case("minimo-cero-sin-validos", abc, {}, minimum=0.0),
        _case("confianza-empate-binario-par", _crit(("a", 1.0)), {"a": {"similarity": 0.5, "quality": 0.00125}}),
        _case("confianza-empate-binario-impar", _crit(("a", 1.0)), {"a": {"similarity": 0.5, "quality": 0.00375}}),
        _case("peso-cero-en-un-criterio", _crit(("a", 0.0), ("b", 0.6), ("c", 0.4)), full(0.2, 0.5, 0.8)),
        _case("perturbacion-distinta", abc, full(0.9, 0.5, 0.8), perturbation=0.35),
        # Errores: el motor TS debe lanzar donde Python lanza.
        _case("error-similitud-fuera-de-rango", abc, full(1.5, 0.5, 0.8)),
        _case("error-similitud-negativa-aunque-no-sea-valida", abc,
              {"a": {"similarity": -0.1, "quality": 0.9, "status": "missing"}, "b": {"similarity": 0.5, "quality": 0.9},
               "c": {"similarity": 0.5, "quality": 0.9}}),
        _case("error-calidad-fuera-de-rango", abc, full(0.9, 0.5, 0.8, q=1.2)),
        _case("error-peso-valido-nulo-con-minimo-cero", _crit(("a", 0.0)), {"a": {"similarity": 0.5, "quality": 1.0}}, minimum=0.0),
        _case("error-log-de-cero-con-epsilon-cero", abc, full(0.0, 0.5, 0.8), epsilon=0.0),
        _case("error-perturbacion-invalida", abc, full(0.9, 0.5, 0.8), perturbation=1.0),
    ]


def _random_cases(count: int = 40, seed: int = 20261114) -> list[dict]:
    rng = random.Random(seed)
    statuses = ["valid"] * 7 + ["missing", "needs_calibration", "excluded"]
    cases = []
    for index in range(count):
        size = rng.randint(1, 7)
        ids = CRITERION_IDS[:size]
        criteria = [{"id": cid, "weight": round(rng.uniform(0.01, 1.0), 3), "unit": "u"} for cid in ids]
        if rng.random() < 0.5:  # la mitad con pesos normalizados como en un perfil real
            total = sum(item["weight"] for item in criteria)
            for item in criteria:
                item["weight"] = item["weight"] / total
        inputs = {}
        for cid in ids:
            draw = rng.random()
            if draw < 0.08:
                continue  # ausente de inputs → missing
            if draw < 0.14:
                similarity = 0.0
            elif draw < 0.2:
                similarity = round(rng.uniform(0.0, 0.01), 6)
            elif draw < 0.26:
                similarity = 1.0
            elif draw < 0.3:
                similarity = None
            else:
                similarity = round(rng.random(), 6)
            row = {"similarity": similarity, "quality": round(rng.random(), 4)}
            if rng.random() < 0.6:
                row["status"] = rng.choice(statuses)
            inputs[cid] = row
        cases.append(_case(
            f"aleatorio-{index:02d}",
            criteria,
            inputs,
            epsilon=rng.choice([0.01, 0.001, 0.05]),
            minimum=rng.choice([0.0, 0.5, 0.7, 0.9]),
            perturbation=rng.choice([0.2, 0.1, 0.35]),
        ))
    return cases


def _snapshot_inputs(candidate: dict, levels: dict[str, int] | None = None) -> dict:
    inputs = {}
    for item in candidate["score_breakdown"]:
        status = item["status"]
        if levels is not None and levels.get(item["criterion_id"], 0) == 0:
            status = "excluded"  # Excluir 0: el criterio no entra al perfil de misión
        inputs[item["criterion_id"]] = {
            "similarity": item["normalized_similarity"],
            "quality": item["quality"],
            "status": status,
        }
    return inputs


def _snapshot_cases(profile: dict, candidates: list[dict]) -> list[dict]:
    """El perfil base sobre el snapshot real: debe reproducir lo que el pipeline publicó."""
    aggregation = profile["aggregation"]
    criteria = [{"id": c["id"], "weight": c["weight"], "unit": c["unit"]} for c in profile["criteria"]]
    return [
        _case(
            f"snapshot-v2-base:{candidate['site_id']}",
            criteria,
            _snapshot_inputs(candidate),
            epsilon=aggregation["epsilon"],
            minimum=aggregation["minimum_valid_weight"],
            note="Insumos copiados de artifacts/science-v2 (perfil base).",
        )
        for candidate in candidates
    ]


def _weights_from_levels(levels: dict[str, int]) -> dict[str, float]:
    total = sum(levels.get(cid, 0) for cid in CRITERION_IDS)
    return {cid: (levels.get(cid, 0) / total if total else 0.0) for cid in CRITERION_IDS}


def _rank(similarities: dict[str, float | None]) -> list[str]:
    """Mismo orden que rankCandidates: similitud desc, nulos al final, empate por site_id."""
    scored = sorted((site for site, value in similarities.items() if value is not None),
                    key=lambda site: (-similarities[site], site))
    missing = sorted(site for site, value in similarities.items() if value is None)
    return scored + missing


def _mission_cases(profile: dict, candidates: list[dict]) -> list[dict]:
    aggregation = profile["aggregation"]
    cases = []
    for name, levels in LEVEL_SETS.items():
        weights = _weights_from_levels(levels)
        criteria = [{"id": c["id"], "weight": weights[c["id"]], "unit": c["unit"]} for c in profile["criteria"]]
        sites = {}
        for candidate in candidates:
            inputs = _snapshot_inputs(candidate, levels)
            result = _aggregate_view(aggregate(criteria, inputs, aggregation["epsilon"], aggregation["minimum_valid_weight"]))
            result["sensitivity"] = _sensitivity_view(
                sensitivity(criteria, inputs, aggregation["epsilon"], aggregation["minimum_valid_weight"]))
            sites[candidate["site_id"]] = result
        cases.append({
            "name": name,
            "levels": levels,
            "weights": weights,
            "sites": sites,
            "ranking": _rank({site: row["similarity"] for site, row in sites.items()}),
        })
    return cases


def build_fixture() -> dict:
    profile, candidates = _snapshot()
    return {
        "fixture": "FIXTURE · paridad del motor TS con pipelines/scoring.py · no es un resultado científico",
        "generator": "tests/test_engine_parity.py --write",
        "tolerance": TOLERANCE,
        "python_sum": "neumaier (sum() de Python >= 3.12)",
        "snapshot": {
            "path": "artifacts/science-v2",
            "profile_id": profile["id"],
            "profile_version": profile["version"],
            "epsilon": profile["aggregation"]["epsilon"],
            "minimum_valid_weight": profile["aggregation"]["minimum_valid_weight"],
        },
        "round_cases": [{"x": x, "digits": digits, "expected": round(x, digits)} for x, digits in ROUND_CASES],
        "sum_cases": [{"values": values, "expected": sum(values)} for values in SUM_CASES],
        "aggregate_cases": _synthetic_cases() + _random_cases() + _snapshot_cases(profile, candidates),
        "mission_cases": _mission_cases(profile, candidates),
    }


def _assert_close(actual, expected, path="$"):
    if isinstance(expected, float) or isinstance(actual, float):
        assert isinstance(actual, (int, float)) and isinstance(expected, (int, float)), f"{path}: {actual!r} != {expected!r}"
        assert math.isclose(actual, expected, rel_tol=0, abs_tol=CURRENT_TOLERANCE), f"{path}: {actual!r} != {expected!r}"
    elif isinstance(expected, dict):
        assert isinstance(actual, dict) and actual.keys() == expected.keys(), f"{path}: claves distintas"
        for key in expected:
            _assert_close(actual[key], expected[key], f"{path}.{key}")
    elif isinstance(expected, list):
        assert isinstance(actual, list) and len(actual) == len(expected), f"{path}: largo distinto"
        for index, (left, right) in enumerate(zip(actual, expected)):
            _assert_close(left, right, f"{path}[{index}]")
    else:
        assert actual == expected, f"{path}: {actual!r} != {expected!r}"


def test_fixture_is_marked_as_fixture():
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert data["fixture"].startswith("FIXTURE")
    assert data["tolerance"] <= 1e-6


def test_fixture_is_current():
    if sys.version_info < (3, 12):  # sum() sin compensación: los casos de suma no aplican
        import pytest

        pytest.skip("el fixture se genera con sum() compensado (Python >= 3.12)")
    committed = json.loads(FIXTURE.read_text(encoding="utf-8"))
    fresh = json.loads(json.dumps(build_fixture(), ensure_ascii=False))
    _assert_close(committed, fresh)


def test_base_profile_cases_reproduce_the_published_snapshot():
    _, candidates = _snapshot()
    by_site = {candidate["site_id"]: candidate for candidate in candidates}
    cases = [case for case in build_fixture()["aggregate_cases"] if case["name"].startswith("snapshot-v2-base:")]
    assert len(cases) == len(candidates) >= 1
    for case in cases:
        candidate = by_site[case["name"].split(":", 1)[1]]
        assert case["expected"]["similarity"] == candidate["similarity"]
        assert case["expected"]["confidence"] == candidate["confidence"]
        assert case["expected_sensitivity"]["stability"] == candidate["stability"]
        published = {row["criterion_id"]: row["contribution"] for row in candidate["score_breakdown"]}
        assert case["expected"]["contributions"] == published


def test_fixture_covers_required_scoring_rules():
    names = {case["name"] for case in build_fixture()["aggregate_cases"]}
    for required in ("cero-usa-epsilon", "faltante-insuficiente", "umbral-exacto-de-peso-valido",
                     "needs-calibration-ignora-similitud-y-calidad", "confianza-empate-binario-par"):
        assert required in names


def _dumps(data: dict) -> str:
    """JSON legible y compacto: un caso por línea dentro de cada lista de casos."""
    compact = {"ensure_ascii": False, "separators": (",", ":")}
    lines = ["{"]
    items = list(data.items())
    for index, (key, value) in enumerate(items):
        comma = "," if index < len(items) - 1 else ""
        if isinstance(value, list) and value:
            rows = ",\n".join(f"  {json.dumps(row, **compact)}" for row in value)
            lines.append(f" {json.dumps(key)}: [\n{rows}\n ]{comma}")
        else:
            lines.append(f" {json.dumps(key)}: {json.dumps(value, ensure_ascii=False)}{comma}")
    lines.append("}")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    if "--write" not in sys.argv[1:]:
        print("Uso: python tests/test_engine_parity.py --write")
        sys.exit(2)
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(_dumps(build_fixture()), encoding="utf-8")
    print(f"Escrito {FIXTURE.relative_to(ROOT)}")
