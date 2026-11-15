"""Etapa 1 de la búsqueda v3: rejilla regional, prioridad topográfica y preselección.

Evalúa todas las ventanas de ``config/discovery_search_v3.json`` con el mismo
código NASADEM del snapshot v2, registra por qué cada una se rechaza, se
descarta o se selecciona, y escribe ``artifacts/science-v3/search-results.json``.

La «prioridad topográfica» solo ordena la preselección: no es el score final ni
una medida de confianza. Ninguna ventana se elige a mano y una ventana con
antecedentes los conserva; no encontrar antecedentes no prueba novedad.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from pyproj import Geod

from pipelines.build_precision_snapshot import TerrainDataError, _nasadem_metrics, _tile_name
from pipelines.build_science_snapshot import _area_km2, _dump, _mola_reference, _polygon, _ratio_similarity
from pipelines.contracts import ROOT, validate
from pipelines.scoring import aggregate

DEFAULT_CONFIG = ROOT / "config" / "discovery_search_v3.json"
DEFAULT_OUT = ROOT / "artifacts" / "science-v3" / "search-results.json"
TOPOGRAPHY = {
    "slope": "median_slope_degree",
    "terrain_roughness": "median_neighbor_difference_meter",
    "local_relief": "median_3x3_relief_meter",
}
OVERLAP_RELATIONS = {"contains_published_sampling_coordinate", "study_area_overlap"}
_GEOD = Geod(ellps="WGS84")


def _coordinate(value: float, negative: str, positive: str, digits: int) -> str:
    return f"{negative if value < 0 else positive}{abs(round(value * 100)):0{digits}d}"


def window_id(country: str, latitude: float, longitude: float) -> str:
    """ID estable derivado del centro, p. ej. ``cl-win-s2460-w06990``."""
    return f"{country.lower()}-win-{_coordinate(latitude, 's', 'n', 4)}-{_coordinate(longitude, 'w', 'e', 5)}"


def window_bbox(window: dict) -> list[float]:
    half = window["half_size_degree"]
    return [round(window["longitude"] - half, 6), round(window["latitude"] - half, 6),
            round(window["longitude"] + half, 6), round(window["latitude"] + half, 6)]


def grid_windows(config: dict) -> list[dict]:
    """Ventanas no solapadas derivadas de origen y paso; nunca dibujadas a mano."""
    size = config["window_size_degree"]
    windows = []
    for region in config["regions"]:
        west, south, east, north = region["bbox"]
        if not (math.isclose(west + region["columns"] * size, east, abs_tol=1e-9)
                and math.isclose(south + region["rows"] * size, north, abs_tol=1e-9)):
            raise ValueError(f"{region['region_id']}: la bbox no es un múltiplo exacto del tamaño de ventana.")
        for row in range(region["rows"]):
            for column in range(region["columns"]):
                latitude = round(south + (row + 0.5) * size, 6)
                longitude = round(west + (column + 0.5) * size, 6)
                label = f"{abs(latitude):.1f}° {'S' if latitude < 0 else 'N'}, {abs(longitude):.1f}° {'O' if longitude < 0 else 'E'}"
                windows.append({
                    "window_id": window_id(region["country"], latitude, longitude),
                    "region_id": region["region_id"],
                    "country": region["country"],
                    "name": f"{region['name']} · {label.replace('.', ',')}",
                    "latitude": latitude,
                    "longitude": longitude,
                    "half_size_degree": size / 2,
                })
    if len(windows) > config["limits"]["max_windows"] or len({w["window_id"] for w in windows}) != len(windows):
        raise ValueError("La rejilla supera el máximo de ventanas autorizado o repite identificadores.")
    return windows


def required_tiles(windows: list[dict]) -> list[str]:
    """Teselas NASADEM que tocará el lector v2 (misma regla de ``floor`` por coordenada)."""
    tiles = set()
    for window in windows:
        west, south, east, north = window_bbox(window)
        for latitude in (south, north):
            for longitude in (west, east):
                tiles.add(_tile_name(math.floor(latitude + 1e-10), math.floor(longitude + 1e-10)))
    return sorted(tiles)


def distance_km(first: tuple[float, float], second: tuple[float, float]) -> float:
    """Distancia geodésica WGS84 entre dos pares (longitud, latitud)."""
    return _GEOD.line_length([first[0], second[0]], [first[1], second[1]]) / 1000


def precedent_matches(window: dict, catalog: dict, proximity_km: float) -> list[dict]:
    """Relación de la ventana con cada antecedente; como mucho una entrada por antecedente.

    Distingue contener una coordenada de muestreo publicada, superponerse a un área
    de estudio publicada, estar cerca de una coordenada (heurística) y pertenecer a
    una región con antecedentes. Un punto no delimita toda una campaña.
    """
    west, south, east, north = window_bbox(window)
    center = (window["longitude"], window["latitude"])
    matches = []
    for precedent in catalog["precedents"]:
        regional = window["region_id"] in precedent["region_ids"]
        points = precedent["points"]
        inside = [p["label"] for p in points if west <= p["longitude"] <= east and south <= p["latitude"] <= north]
        area = (precedent["study_area"] or {}).get("geometry")
        match = None
        if inside:
            match = {"relation": "contains_published_sampling_coordinate", "points": inside}
        elif area and area["type"] == "BBox" and not (
            area["bbox"][2] < west or area["bbox"][0] > east or area["bbox"][3] < south or area["bbox"][1] > north
        ):
            match = {"relation": "study_area_overlap"}
        elif points:
            nearest = min(points, key=lambda p: (distance_km(center, (p["longitude"], p["latitude"])), p["label"]))
            distance = distance_km(center, (nearest["longitude"], nearest["latitude"]))
            if distance <= proximity_km:
                match = {"relation": "proximity_heuristic", "nearest_point": nearest["label"], "distance_km": round(distance, 1)}
        if match is None and regional:
            match = {"relation": "regional_precedent"}
        if match:
            matches.append({"precedent_id": precedent["precedent_id"], "in_region_with_precedent": regional, **match})
    return matches


def literature_status(window_id_: str, matches: list[dict], catalog: dict) -> str:
    """Estado de revisión bibliográfica de una ventana; nunca afirma novedad."""
    if any(match["relation"] in OVERLAP_RELATIONS for match in matches):
        return "known_analogue_overlap"
    if matches:
        return "regional_precedent"
    reviewed = {wid for search in catalog["searches"] for wid in search.get("windows_without_match", [])}
    return "no_match_in_reviewed_sources" if window_id_ in reviewed else "literature_review_pending"


def topographic_priority(metrics: dict, mola: dict, stage1: dict) -> tuple[dict, float | None]:
    """Media geométrica ponderada de las tres similitudes topográficas (0–100). Solo ordena."""
    values = {criterion: metrics[key] for criterion, key in TOPOGRAPHY.items()}
    if not all(isinstance(value, (int, float)) and math.isfinite(value) for value in values.values()):
        return {criterion: None for criterion in TOPOGRAPHY}, None
    similarities = {criterion: _ratio_similarity(values[criterion], mola[TOPOGRAPHY[criterion]]) for criterion in TOPOGRAPHY}
    inputs = {criterion: {"similarity": value, "quality": 1.0} for criterion, value in similarities.items()}
    return similarities, aggregate(stage1["criteria"], inputs, stage1["epsilon"], 0.0)["similarity"]


def window_metrics(window: dict, science_config: dict, metrics_for) -> tuple[dict | None, str | None]:
    """Métricas de una ventana o el motivo del fallo de datos.

    Solo captura fallos de datos esperados (tesela ausente, dañada o ventana sin
    píxeles válidos); un error de programación se propaga y aborta la búsqueda.
    """
    try:
        return metrics_for(window, science_config), None
    except FileNotFoundError as error:
        return None, f"Falta una tesela NASADEM en la caché local: {error}"
    except TerrainDataError as error:
        return None, str(error)


def evaluate_window(window: dict, metrics: dict | None, mola: dict, config: dict, catalog: dict,
                    failure: str | None = None) -> dict:
    """Registro completo de una ventana: métricas, prioridad, antecedentes y elegibilidad."""
    stage1 = config["stage1"]
    matches = precedent_matches(window, catalog, config["precedents"]["proximity_km"])
    status = literature_status(window["window_id"], matches, catalog)
    geometry = _polygon(window)
    record = {
        "window_id": window["window_id"],
        "region_id": window["region_id"],
        "country": window["country"],
        "name": window["name"],
        "center": [window["longitude"], window["latitude"]],
        "bbox": window_bbox(window),
        "area_km2": _area_km2(geometry),
        "nasadem": None,
        "topographic_similarities": {criterion: None for criterion in TOPOGRAPHY},
        "topographic_priority": None,
        "literature": {"status": status, "matches": matches},
        "decision": "evaluation_failed",
        "decision_reason": failure or "",
        "selection_rank": None,
        "blocked_by": None,
    }
    if metrics is None:
        return record  # se intentó evaluar, pero no hay métricas: sin prioridad ni preselección
    similarities, priority = topographic_priority(metrics, mola, stage1)
    valid, water = metrics["source_valid_fraction"], metrics["permanent_water_fraction"]
    if valid < stage1["min_valid_fraction"] or priority is None:
        decision = ("rejected_coverage", f"Cobertura NASADEM válida {valid:.1%}; mínimo {stage1['min_valid_fraction']:.0%}.")
    elif water > stage1["max_permanent_water_fraction"]:
        decision = ("rejected_water", f"Agua permanente NASADEM SWB {water:.2%}; máximo {stage1['max_permanent_water_fraction']:.0%}.")
    elif status == "known_analogue_overlap":
        decision = ("rejected_precedent_overlap", "Contiene coordenadas de muestreo o un área de estudio publicadas; se conserva como antecedente, no como candidato.")
    else:
        decision = ("eligible", "Elegible para la preselección.")
    return {
        **record,
        "nasadem": {key: metrics[key] for key in (
            "tiles", "source_valid_fraction", "permanent_water_fraction", "analysis_spacing_meter",
            "median_slope_degree", "median_neighbor_difference_meter", "median_3x3_relief_meter",
        )},
        "topographic_similarities": similarities,
        "topographic_priority": priority,
        "decision": decision[0],
        "decision_reason": decision[1],
    }


def select_shortlist(records: list[dict], selection: dict, limit: int) -> list[str]:
    """Diversificación voraz y determinista; anota en cada registro por qué quedó fuera."""
    chosen: list[dict] = []
    per_country: dict[str, int] = {}
    eligible = sorted((r for r in records if r["decision"] == "eligible"),
                      key=lambda r: (-r["topographic_priority"], r["window_id"]))
    for record in eligible:
        near = next((c for c in chosen if distance_km(tuple(record["center"]), tuple(c["center"])) < selection["min_center_distance_km"]), None)
        if per_country.get(record["country"], 0) >= selection["max_per_country"] or len(chosen) >= limit:
            record["decision"] = "not_selected_quota"
            record["decision_reason"] = f"El país ya tiene {selection['max_per_country']} ventanas con mayor prioridad topográfica."
        elif near:
            record["decision"], record["blocked_by"] = "not_selected_proximity", near["window_id"]
            record["decision_reason"] = (f"Centro a menos de {selection['min_center_distance_km']} km de "
                                         f"{near['window_id']}, que tiene mayor prioridad.")
        else:
            chosen.append(record)
            per_country[record["country"]] = per_country.get(record["country"], 0) + 1
            record["decision"], record["selection_rank"] = "selected", len(chosen)
            record["decision_reason"] = "Preseleccionada por prioridad topográfica y separación mínima entre centros."
    return [record["window_id"] for record in chosen]


def summarize(config: dict, catalog: dict, mola: dict, records: list[dict], shortlist: list[str]) -> dict:
    counts: dict[str, int] = {}
    for record in records:
        counts[record["decision"]] = counts.get(record["decision"], 0) + 1
    regions = []
    for region in config["regions"]:
        own = [r for r in records if r["region_id"] == region["region_id"]]
        regions.append({
            **{key: region[key] for key in ("region_id", "country", "name", "bbox")},
            "windows_evaluated": sum(r["nasadem"] is not None for r in own),
            "windows_selected": sum(r["decision"] == "selected" for r in own),
            "explored_area_km2": round(sum(r["area_km2"] for r in own), 1),
        })
    return {
        "search_id": config["search_id"],
        "snapshot_version": config["snapshot_version"],
        "created_at": config["created_at"],
        "scope_note": config["description"],
        "crs": config["crs"],
        "window_size_degree": config["window_size_degree"],
        "stage1": config["stage1"],
        "selection": config["selection"],
        "precedents": {**config["precedents"], "catalog_version": catalog["catalog_version"], "reviewed_at": catalog["reviewed_at"]},
        "limits": config["limits"],
        "mola_reference": {key: mola[key] for key in ("name", "nominal_spacing_meter", *TOPOGRAPHY.values())},
        "regions": regions,
        # «attempted» cuenta todas las ventanas; «evaluated», solo las que tienen métricas válidas.
        "counts": {"attempted": len(records), "evaluated": sum(r["nasadem"] is not None for r in records),
                   **dict(sorted(counts.items()))},
        "explored_area_km2": round(sum(r["area_km2"] for r in records), 1),
        "shortlist": shortlist,
        "windows": records,
    }


def discover(config: dict, catalog: dict, science_config: dict, metrics_for=_nasadem_metrics, mola: dict | None = None) -> dict:
    """Ejecuta la etapa 1 completa. ``metrics_for`` y ``mola`` permiten probar la lógica sin datos crudos."""
    mola = mola or _mola_reference(science_config)
    records = []
    for window in grid_windows(config):
        metrics, failure = window_metrics(window, science_config, metrics_for)
        records.append(evaluate_window(window, metrics, mola, config, catalog, failure))
    shortlist = select_shortlist(records, config["selection"], config["limits"]["max_multisource_windows"])
    results = summarize(config, catalog, mola, records, shortlist)
    validate(results, "discovery-search")
    return results


def load_inputs(config_path: Path) -> tuple[dict, dict, dict]:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    catalog = json.loads((ROOT / config["precedents"]["catalog"]).read_text(encoding="utf-8"))
    validate(catalog, "precedent-catalog")
    science_config = json.loads((ROOT / config["sources"]["science_config"]).read_text(encoding="utf-8"))
    return config, catalog, science_config


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    results = discover(*load_inputs(args.config))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(_dump(results), encoding="utf-8")
    print(f"escrito {args.out}")
    print(f"ventanas: {results['counts']}; preselección: {results['shortlist']}")


if __name__ == "__main__":
    main()
