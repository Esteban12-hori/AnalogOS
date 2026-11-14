"""Búsqueda v3: rejilla, preselección, antecedentes, calidad de fuentes y snapshot. Sin red ni credenciales."""

import copy
import itertools
import json
import math
import shutil
from pathlib import Path

import numpy as np
import pytest

from pipelines import build_discovery_snapshot as snapshot
from pipelines import build_precision_snapshot as precision
from pipelines import discover_candidates as search
from pipelines import fetch_visual_context as visual
from pipelines.contracts import ROOT, ContractError, validate
from pipelines.fetch_discovery_data import cached, request_key, source_requests
from pipelines.scoring import aggregate

CONFIG, CATALOG, SCIENCE = search.load_inputs(search.DEFAULT_CONFIG)
WINDOWS = search.grid_windows(CONFIG)
V3 = ROOT / "artifacts" / "science-v3"
RAW_READY = (ROOT / "data" / "raw" / "nasadem" / "NASADEM_HGT_s26w067.zip").exists() and (ROOT / CONFIG["sources"]["sentinel2_file"]).exists()
MOLA = {"name": "referencia de test", "nominal_spacing_meter": 451.2, "median_slope_degree": 2.226,
        "median_neighbor_difference_meter": 11.0, "median_3x3_relief_meter": 47.0}
EMPTY_CATALOG = {**CATALOG, "precedents": [], "searches": []}


def load(name: str):
    return json.loads((V3 / name).read_text("utf-8"))


def metrics(slope=2.226, roughness=11.0, relief=47.0, valid=1.0, water=0.0) -> dict:
    return {"tiles": ["test"], "source_valid_fraction": valid, "permanent_water_fraction": water, "analysis_spacing_meter": 474.0,
            "median_slope_degree": slope, "median_neighbor_difference_meter": roughness, "median_3x3_relief_meter": relief}


def run(metrics_for, catalog=EMPTY_CATALOG, config=CONFIG) -> dict:
    return search.discover(config, catalog, SCIENCE, metrics_for=metrics_for, mola=MOLA)


def by_id(results: dict) -> dict:
    return {record["window_id"]: record for record in results["windows"]}


# --- Rejilla, áreas y distancias ---------------------------------------------------

def test_grid_is_derived_from_origin_and_step_with_stable_ids_and_limits():
    assert len(WINDOWS) == 50 and len({w["window_id"] for w in WINDOWS}) == 50
    for region in CONFIG["regions"]:
        own = [w for w in WINDOWS if w["region_id"] == region["region_id"]]
        west, south, east, north = region["bbox"]
        assert len(own) == 25 and all(w["window_id"].startswith(region["country"].lower() + "-win-") for w in own)
        assert sorted({round(w["longitude"], 6) for w in own}) == pytest.approx([west + 0.1 + 0.2 * i for i in range(5)])
        assert sorted({round(w["latitude"], 6) for w in own}) == pytest.approx([south + 0.1 + 0.2 * i for i in range(5)])
        boxes = [search.window_bbox(w) for w in own]
        assert min(b[0] for b in boxes) == west and max(b[2] for b in boxes) == east
        assert min(b[1] for b in boxes) == south and max(b[3] for b in boxes) == north
    assert search.window_id("CL", -24.6, -69.9) == "cl-win-s2460-w06990"
    assert search.required_tiles(WINDOWS) == ["s25w069", "s25w070", "s26w067", "s26w068", "s26w069", "s26w070", "s27w067", "s27w068"]
    broken = copy.deepcopy(CONFIG)
    broken["regions"][0]["bbox"][2] += 0.05
    with pytest.raises(ValueError, match="múltiplo exacto"):
        search.grid_windows(broken)
    with pytest.raises(ValueError, match="máximo de ventanas"):
        search.grid_windows({**CONFIG, "limits": {**CONFIG["limits"], "max_windows": 49}})


def test_windows_are_about_20_km_wide_and_neighbours_are_closer_than_the_separation_rule():
    areas = [by_id(load("search-results.json"))[w["window_id"]]["area_km2"] for w in WINDOWS]
    assert 440 < min(areas) and max(areas) < 450  # ~20 × 22 km, no una rejilla de 5 km
    first, east, north, diagonal = (WINDOWS[i] for i in (0, 1, 5, 6))
    centre = lambda w: (w["longitude"], w["latitude"])  # noqa: E731
    assert 19.5 < search.distance_km(centre(first), centre(east)) < 20.5
    assert 21.9 < search.distance_km(centre(first), centre(north)) < 22.4
    assert search.distance_km(centre(first), centre(diagonal)) > CONFIG["selection"]["min_center_distance_km"]
    assert search.distance_km(centre(first), centre(first)) == 0


# --- Prioridad topográfica y selección ----------------------------------------------

def test_topographic_priority_is_the_weighted_geometric_mean_and_only_an_ordering():
    similarities, priority = search.topographic_priority(metrics(slope=4.452, roughness=5.5, relief=47.0), MOLA, CONFIG["stage1"])
    assert similarities == {"slope": 0.5, "terrain_roughness": 0.5, "local_relief": 1.0}
    assert priority == pytest.approx(100 * math.exp((0.20 * math.log(0.5) + 0.20 * math.log(0.5)) / 0.55), abs=0.01)
    assert search.topographic_priority(metrics(), MOLA, CONFIG["stage1"])[1] == 100
    assert search.topographic_priority(metrics(slope=float("nan")), MOLA, CONFIG["stage1"])[1] is None


def test_selection_is_deterministic_diversified_and_never_forced():
    tied = run(lambda window, _config: metrics())  # todas empatan: decide el ID y la distancia
    again = run(lambda window, _config: metrics())
    assert tied == again and len(tied["shortlist"]) == 6
    records = by_id(tied)
    chosen = [records[window_id] for window_id in tied["shortlist"]]
    assert [c["selection_rank"] for c in chosen] == [1, 2, 3, 4, 5, 6]
    assert sorted(c["country"] for c in chosen) == ["AR"] * 3 + ["CL"] * 3
    assert chosen[0]["window_id"] == min(w["window_id"] for w in WINDOWS)
    for first, second in itertools.combinations(chosen, 2):
        assert search.distance_km(tuple(first["center"]), tuple(second["center"])) >= 25
    assert tied["counts"]["not_selected_proximity"] > 0 and all(
        records[r["blocked_by"]]["decision"] == "selected" for r in tied["windows"] if r["decision"] == "not_selected_proximity")

    # Con una sola ventana elegible por país no se completa la lista con otras.
    keep = {"cl-win-s2460-w06990", "ar-win-s2560-w06770"}
    few = run(lambda window, _config: metrics() if window["window_id"] in keep else metrics(valid=0.5))
    assert sorted(few["shortlist"]) == sorted(keep) and few["counts"]["rejected_coverage"] == 48
    none = run(lambda window, _config: metrics(water=0.2))
    assert none["shortlist"] == [] and none["counts"]["rejected_water"] == 50


def test_coverage_water_and_published_coordinates_reject_with_a_recorded_reason():
    low, wet = "cl-win-s2460-w06910", "ar-win-s2560-w06690"
    results = run(lambda window, _config: metrics(valid=0.94) if window["window_id"] == low
                  else metrics(water=0.051) if window["window_id"] == wet else metrics(), catalog=CATALOG)
    records = by_id(results)
    assert (records[low]["decision"], records[wet]["decision"]) == ("rejected_coverage", "rejected_water")
    overlap = sorted(r["window_id"] for r in results["windows"] if r["decision"] == "rejected_precedent_overlap")
    assert overlap == ["cl-win-s2460-w06970", "cl-win-s2480-w06970", "cl-win-s2500-w06990", "cl-win-s2540-w06990"]
    for window_id in overlap:
        match = records[window_id]["literature"]["matches"][0]
        assert match["relation"] == "contains_published_sampling_coordinate" and match["points"]
        assert records[window_id]["topographic_priority"] is not None  # se conserva la evaluación, no se oculta
    assert not set(results["shortlist"]) & {low, wet, *overlap}
    assert all(len(r["decision_reason"]) > 10 for r in results["windows"])
    assert sum(v for k, v in results["counts"].items() if k not in ("attempted", "evaluated")) == results["counts"]["attempted"] == 50


def test_expected_data_failures_are_recorded_per_window_and_programming_errors_propagate():
    missing, empty = "cl-win-s2460-w06990", "ar-win-s2560-w06770"

    def metrics_for(window, _config):
        if window["window_id"] == missing:
            raise FileNotFoundError("Falta data/raw/nasadem/NASADEM_HGT_s25w070.zip")
        if window["window_id"] == empty:
            raise precision.TerrainDataError("Todos los píxeles NASADEM de la ventana son NoData.")
        return metrics()

    results = run(metrics_for)
    records = by_id(results)
    for window_id, text in ((missing, "Falta una tesela"), (empty, "NoData")):
        record = records[window_id]
        assert record["decision"] == "evaluation_failed" and text in record["decision_reason"]
        assert record["nasadem"] is None and record["topographic_priority"] is None and record["selection_rank"] is None
        assert set(record["topographic_similarities"].values()) == {None}
    assert results["counts"]["attempted"] == 50 and results["counts"]["evaluated"] == 48
    assert not {missing, empty} & set(results["shortlist"]) and len(results["shortlist"]) == 6
    validate(results, "discovery-search")

    with pytest.raises(KeyError):  # un error de programación no se disfraza de dato faltante
        run(lambda window, _config: {"tiles": []})


def test_fully_nodata_window_raises_a_data_error_instead_of_crashing_in_numpy(monkeypatch):
    blank = (np.full((721, 721), np.nan), np.zeros((721, 721), dtype=np.uint8), ["s25w070"])
    monkeypatch.setattr(precision, "_nasadem_window", lambda site, config: blank)
    with pytest.raises(precision.TerrainDataError, match="NoData"):
        precision._nasadem_metrics(WINDOWS[0], SCIENCE)
    assert search.window_metrics(WINDOWS[0], SCIENCE, precision._nasadem_metrics) == (None, "Todos los píxeles NASADEM de la ventana son NoData.")


# --- Antecedentes ---------------------------------------------------------------------

def catalog_with(**precedent) -> dict:
    base = {"precedent_id": "cl-test", "name": "t", "country": "CL", "activity": "t", "spatial_precision": "prueba de test",
            "study_area": {"description": "t", "geometry": None}, "region_ids": [], "points": [],
            "sources": [{"title": "t", "url": "https://example.org/", "accessed_at": "2026-11-14", "finding": "t"}]}
    return {**CATALOG, "precedents": [{**base, **precedent}], "searches": []}


def point(longitude: float, latitude: float) -> dict:
    return {"label": "P1", "as_published": "test", "latitude": latitude, "longitude": longitude}


def test_precedent_relations_distinguish_point_area_proximity_and_region():
    window = next(w for w in WINDOWS if w["window_id"] == "cl-win-s2500-w06970")  # centro −69,7; −25,0
    region = [window["region_id"]]
    relation = lambda catalog: [m["relation"] for m in search.precedent_matches(window, catalog, 25)]  # noqa: E731
    assert relation(catalog_with(points=[point(-69.75, -25.05)])) == ["contains_published_sampling_coordinate"]
    assert relation(catalog_with(points=[point(-69.85, -25.0)])) == ["proximity_heuristic"]  # ~15 km, fuera de la ventana
    assert relation(catalog_with(points=[point(-69.0, -24.0)])) == []
    # Un punto lejano no borra el antecedente regional.
    assert relation(catalog_with(points=[point(-69.0, -24.0)], region_ids=region)) == ["regional_precedent"]
    area = {"description": "t", "geometry": {"type": "BBox", "bbox": [-69.9, -25.3, -69.75, -25.05]}}
    assert relation(catalog_with(study_area=area)) == ["study_area_overlap"]
    near = search.precedent_matches(window, catalog_with(points=[point(-69.85, -25.0)], region_ids=region), 25)[0]
    assert near["distance_km"] == pytest.approx(15.1, abs=0.3) and near["in_region_with_precedent"] is True

    status = lambda catalog: search.literature_status(  # noqa: E731
        window["window_id"], search.precedent_matches(window, catalog, 25), catalog)
    assert status(catalog_with(points=[point(-69.75, -25.05)])) == "known_analogue_overlap"
    assert status(catalog_with(study_area=area)) == "known_analogue_overlap"
    assert status(catalog_with(region_ids=region)) == "regional_precedent"
    assert status(EMPTY_CATALOG) == "literature_review_pending"  # sin antecedentes no significa «nuevo»
    reviewed = {**EMPTY_CATALOG, "searches": [{"date": "2026-11-14", "query": "q", "scope": "s", "finding": "f",
                                               "windows_without_match": [window["window_id"]]}]}
    assert status(reviewed) == "no_match_in_reviewed_sources"


def test_real_catalog_keeps_the_whole_published_transect_not_a_single_point():
    validate(CATALOG, "precedent-catalog")
    transect = next(p for p in CATALOG["precedents"] if p["precedent_id"] == "cl-atacama-transect-navarro-gonzalez-2003")
    assert len(transect["points"]) == 30
    first = next(p for p in transect["points"] if p["label"] == "AT01-03, AT02-03A")
    assert (first["latitude"], first["longitude"]) == pytest.approx((-(24 + 4 / 60 + 9.6 / 3600), -(69 + 51 / 60 + 58.8 / 3600)), abs=1e-6)
    inside = [p for p in transect["points"] if -70.0 <= p["longitude"] <= -69.0 and -25.5 <= p["latitude"] <= -24.5]
    assert sorted(p["label"] for p in inside) == ["AT01-16, AT02-16", "AT02-26", "AT02-27", "AT02-28", "AT02-29"]
    assert all(p["points"] == [] for p in CATALOG["precedents"] if p["country"] == "AR")  # sin coordenadas inventadas
    assert "no prueba" in CATALOG["scope_note"] and len(CATALOG["searches"]) >= 3


# --- Calidad de las fuentes -----------------------------------------------------------

COPERNICUS = SCIENCE["copernicus"]
MONTHS = snapshot.expected_months(COPERNICUS["time_start"], COPERNICUS["time_end"])


def row(index: int, **changes) -> dict:
    stats = lambda mean: {"mean": mean, "sampleCount": 1000, "noDataCount": 100}  # noqa: E731
    bands = {"nonvegetated": 0.99, "vegetation": 0.0, "water": 0.0, "ndvi": 0.05, "bsi": 0.2}
    base = {"interval": {"from": MONTHS[index], "to": [*MONTHS[1:], COPERNICUS["time_end"]][index]},
            "outputs": {"surface": {"bands": {name: {"stats": stats(mean)} for name, mean in bands.items()}}}}
    return {**base, **changes}


def band_change(index: int, band: str, **stats) -> dict:
    changed = row(index)
    changed["outputs"]["surface"]["bands"][band]["stats"].update(stats)
    return changed


def entry(rows: list[dict]) -> dict:
    return {"status": "ok", "response": {"status": "OK", "data": rows}}


def test_sentinel_completeness_is_measured_against_the_twelve_configured_months():
    assert len(MONTHS) == 12 and MONTHS[0] == "2025-01-01T00:00:00Z" and MONTHS[-1] == "2025-12-01T00:00:00Z"
    full, rejected = snapshot.checked_sentinel("s", entry([row(i) for i in range(12)]), COPERNICUS)
    assert rejected == [] and (full["valid_intervals"], full["expected_intervals"]) == (12, 12)
    assert full["quality"] == pytest.approx(0.9 * 0.9, abs=1e-4)
    partial, _ = snapshot.checked_sentinel("s", entry([row(i) for i in range(9)]), COPERNICUS)
    assert (partial["valid_intervals"], partial["expected_intervals"]) == (9, 12)
    assert partial["quality"] == pytest.approx(0.9 * 0.9 * 9 / 12, abs=1e-4)  # la API devolvió 9: no cuentan como 9 de 9


@pytest.mark.parametrize("bad, reason", [
    (row(0), "duplicado"),
    ({**row(1), "interval": {"from": "2024-12-01T00:00:00Z", "to": "2025-01-01T00:00:00Z"}}, "fuera del periodo"),
    ({**row(1), "interval": {"from": MONTHS[1], "to": "2028-01-01T00:00:00Z"}}, "mes completo"),
    ({**row(1), "error": {"type": "EXECUTION_ERROR"}}, "error de la API"),
    ({**row(1), "outputs": {"surface": {"bands": {k: v for k, v in row(1)["outputs"]["surface"]["bands"].items() if k != "nonvegetated"}}}}, "falta la banda nonvegetated"),
    (band_change(1, "water", noDataCount=-1000), "incoherentes"),
    (band_change(1, "water", noDataCount=2000), "incoherentes"),
    (band_change(1, "ndvi", sampleCount=0, noDataCount=0), "incoherentes"),
    (band_change(1, "bsi", noDataCount=1000), "NoData"),
    (band_change(1, "nonvegetated", mean=float("nan")), "no finita"),
    (band_change(1, "nonvegetated", mean="NaN"), "no finita"),
    (band_change(1, "vegetation", mean=1.5), "fuera de rango"),
    (band_change(1, "ndvi", sampleCount=1000.5), "no enteros"),
    ({**row(1), "interval": None}, "fuera del periodo"),
    ("no es una fila", "formato inesperado"),
])
def test_malformed_monthly_rows_are_rejected_and_never_become_valid_months(bad, reason: str):
    metrics_, rejected = snapshot.checked_sentinel("s", entry([row(0), bad]), COPERNICUS)
    assert metrics_["valid_intervals"] == 1 and metrics_["expected_intervals"] == 12
    assert len(rejected) == 1 and reason in rejected[0]["reason"]


def test_sentinel_without_usable_months_is_missing_not_invented():
    assert snapshot.checked_sentinel("s", entry([band_change(i, "water", noDataCount=1000) for i in range(12)]), COPERNICUS)[0] is None
    assert snapshot.checked_sentinel("s", {"status": "failed", "error": "HTTP 500"}, COPERNICUS)[0] is None
    assert snapshot.checked_sentinel("s", None, COPERNICUS)[0] is None
    inputs = snapshot.site_inputs("AR", metrics(), None, None, MOLA, snapshot.SEARCH_DATASETS)
    assert {inputs[c]["status"] for c in ("bare_ground_fraction", "aridity_context", "surface_temperature_variability")} == {"missing"}
    assert all(inputs[c]["similarity"] is None and inputs[c]["quality"] == 0 for c in ("bare_ground_fraction", "aridity_context"))
    profile = load("mission-profile.json")
    score = aggregate(profile["criteria"], inputs, 0.01, profile["aggregation"]["minimum_valid_weight"])
    assert score["similarity"] is None and score["valid_weight"] == pytest.approx(0.55)  # no se relaja el mínimo 0,70
    assert "SEGEMAR" in inputs["geologic_relevance"]["explanation"]


def power_response(**annual) -> dict:
    values = {"PRECTOTCORR": 0.05, "TS": 15.0, "TS_MAX": 40.0, "TS_MIN": -5.0, **annual}
    return {"header": {"fill_value": -999.0, "range": "2001-2025", "api": {"version": "v2"}},
            "parameters": {name: {"units": "mm/day" if name == "PRECTOTCORR" else "C"} for name in values},
            "properties": {"parameter": {name: {"ANN": value} for name, value in values.items()}}}


def test_power_fill_values_units_and_ranges_are_checked_before_scoring():
    climate, problem = snapshot.checked_power("s", power_response(), "https://power.larc.nasa.gov/x")
    assert problem is None and climate["annual_precipitation_mm"] == pytest.approx(0.05 * 365.25, abs=0.01)
    for response, text in [
        (power_response(PRECTOTCORR=-999.0), "relleno"),
        (power_response(TS_MAX=-999), "relleno"),
        (power_response(TS=float("inf")), "no finito"),
        (power_response(TS_MIN=None), "no finito"),
        (power_response(PRECTOTCORR=-0.1), "fuera de rango"),
        (power_response(TS_MAX=-10.0), "fuera de rango"),
        ({**power_response(), "parameters": {**power_response()["parameters"], "PRECTOTCORR": {"units": "mm/month"}}}, "unidad"),
        ({**power_response(), "parameters": {}}, "unidad"),
        ("texto", "formato inesperado"),
    ]:
        assert snapshot.checked_power("s", response, "u")[0] is None and text in snapshot.checked_power("s", response, "u")[1]


def test_raw_cache_is_bound_to_the_exact_request_and_stale_data_stops_the_build():
    window = WINDOWS[0]
    requests_ = source_requests(SCIENCE, window)
    assert requests_["sentinel2"]["input"]["bounds"]["bbox"] == pytest.approx(search.window_bbox(window))
    changed = copy.deepcopy(SCIENCE)
    changed["copernicus"]["time_start"] = "2024-01-01T00:00:00Z"
    moved = {**window, "longitude": window["longitude"] + 0.2}
    for other in (source_requests(changed, window), source_requests(SCIENCE, moved)):
        assert request_key(other["sentinel2"]) != request_key(requests_["sentinel2"])
    assert request_key(source_requests(SCIENCE, moved)["power"]) != request_key(requests_["power"])
    assert request_key(source_requests(SCIENCE, moved)["hls"]) != request_key(requests_["hls"])

    good = {"request_key": request_key(requests_["power"]), "request": requests_["power"], "status": "ok", "response": {}}
    store = {"sites": {"s": good}}
    assert cached(store["sites"], "s", good["request_key"]) and not cached(store["sites"], "s", "otra-clave")
    assert not cached({"s": {**good, "status": "failed"}}, "s", good["request_key"])
    assert snapshot.cached_response(store, "s", requests_["power"], "POWER") is good
    assert snapshot.cached_response(store, "otro", requests_["power"], "POWER") is None
    assert snapshot.cached_response({"sites": {"s": {**good, "status": "failed"}}}, "s", requests_["power"], "POWER") is None
    with pytest.raises(snapshot.SourceMismatch, match="no corresponde a la configuración vigente"):
        snapshot.cached_response(store, "s", source_requests(SCIENCE, moved)["power"], "POWER")


def test_territorial_authorities_follow_the_country_and_stay_unevaluated():
    sentinel = {"maximum_monthly_water_fraction": 0.0}
    for country, name, url in (("CL", "IDE Chile", "https://www.ide.cl/"), ("AR", "IDERA", "https://www.idera.gob.ar/")):
        checks = snapshot.constraint_checks(country, metrics(), sentinel)
        pending = [c for c in checks if c["state"] == "not_evaluated"]
        assert len(pending) == 4 and {c["constraint_id"] for c in pending} >= {"protected_or_sensitive_area", "urban_area", "land_access"}
        assert any(name in c["authority"] for c in checks) and any(c["source_url"] == url for c in checks)
    argentina = json.dumps(snapshot.constraint_checks("AR", metrics(), sentinel), ensure_ascii=False)
    assert "IDE Chile" not in argentina and "ide.cl" not in argentina
    assert "no entregó meses válidos" in json.dumps(snapshot.constraint_checks("AR", metrics(water=0.01), None), ensure_ascii=False)


# --- Snapshot v3 versionado -------------------------------------------------------------

def test_v3_snapshot_separates_role_from_literature_review_and_keeps_references_out_of_the_ranking():
    candidates, results, manifest = load("candidate-details.json"), load("search-results.json"), load("manifest.json")
    validate(manifest, "data-manifest")
    validate(results, "discovery-search")
    for item in candidates:
        validate(item, "candidate-site")
        assert item["site_id"].startswith(item["country"].lower() + "-") and item["feasibility"] == "requires_review"
        assert item["data_snapshot_version"] == manifest["snapshot_version"] == "science-screening-v3"
    references = [c for c in candidates if c["role"] == "reference"]
    ranked = [c for c in candidates if c["role"] == "candidate"]
    assert [c["site_id"] for c in references] == ["cl-pampa-yungay-screening"]
    assert references[0]["status"] == "reference" and references[0]["literature_review"]["status"] == "known_reference"
    assert references[0]["discovery"]["origin"] == "known_reference" and references[0]["site_id"] not in results["shortlist"]
    assert sorted(c["site_id"] for c in ranked) == sorted(results["shortlist"])
    assert {c["country"] for c in ranked} == {"CL", "AR"}
    for item in ranked:
        record = by_id(results)[item["site_id"]]
        assert item["discovery"]["origin"] == "grid_search" and item["discovery"]["selection_rank"] == record["selection_rank"]
        assert item["literature_review"]["status"] in ("regional_precedent", "literature_review_pending")
        assert item["literature_review"]["matches"] == record["literature"]["matches"]
        assert any("OBSERVACIÓN VISUAL PRELIMINAR" in w for w in item["warnings"])
    # Ninguna ficha declara novedad ni aprobación.
    text = json.dumps(candidates, ensure_ascii=False).lower()
    assert "no_match_in_reviewed_sources" not in text and "análogo nuevo" not in text and "sitio aprobado" not in text


def test_v3_yungay_reference_keeps_the_v2_baseline_numbers():
    reference = next(c for c in load("candidate-details.json") if c["role"] == "reference")
    baseline = next(c for c in json.loads((ROOT / "artifacts/science-v2/candidate-details.json").read_text("utf-8"))
                    if c["site_id"] == reference["site_id"])
    assert baseline["similarity"] == 75.67
    for key in ("similarity", "confidence", "stability", "feasibility", "geometry", "area_km2"):
        assert reference[key] == baseline[key]
    numeric = ("criterion_id", "raw_value", "normalized_similarity", "weight", "contribution", "quality", "status")
    assert [{k: i[k] for k in numeric} for i in reference["score_breakdown"]] == [{k: i[k] for k in numeric} for i in baseline["score_breakdown"]]


def test_v3_manifest_links_every_dataset_and_records_real_acquisition_times():
    candidates, manifest = load("candidate-details.json"), load("manifest.json")
    datasets = {d["dataset_id"]: d for d in manifest["datasets"]}
    used = {i["dataset_id"] for c in candidates for i in c["score_breakdown"] + c["evidence"]} - {"none"}
    assert used <= set(datasets)
    v2_time = SCIENCE["created_at"]
    for name in ("copernicus-sentinel2-l2a-surface-2025-v3-search", "nasa-power-climatology-points-v3-search", "nasadem-s26w067-v1"):
        assert datasets[name]["downloaded_at"] > v2_time  # hora real de adquisición, no la fecha v2 copiada
    assert datasets["nasadem-s24w070-v1"]["downloaded_at"] == v2_time
    assert "0,5° × 0,625°" in datasets["nasa-power-climatology-points-v3-search"]["spatial_resolution"]
    matching = [w for c in candidates for w in c["warnings"] if "POWER coincidentes" in w]
    assert matching and all("posible celda compartida" in w for w in matching)
    text = (V3 / "manifest.json").read_text("utf-8") + (V3 / "analysis-summary.json").read_text("utf-8")
    assert not any(term in text for term in ("access_token", "client_secret", "Bearer ", "EARTHDATA_PASSWORD"))


def test_contract_requires_v3_metadata_and_keeps_historic_snapshots_valid():
    candidate = next(c for c in load("candidate-details.json") if c["role"] == "candidate")
    for broken in (
        {k: v for k, v in candidate.items() if k != "role"},
        {k: v for k, v in candidate.items() if k != "literature_review"},
        {**candidate, "country": "AR"},
        {**candidate, "role": "reference"},
        {**candidate, "site_id": "pe-win-s2500-w06970"},
        {**candidate, "literature_review": {**candidate["literature_review"], "status": "new_discovery"}},
        {**candidate, "campo_sin_contrato": 1},
    ):
        with pytest.raises(ContractError):
            validate(broken, "candidate-site")
    for name in ("demo", "science-v1", "science-v2"):
        for item in json.loads((ROOT / "artifacts" / name / "candidate-details.json").read_text("utf-8")):
            validate(item, "candidate-site")


@pytest.mark.skipif(not RAW_READY, reason="integración opcional: requiere data/raw (fetch_discovery_data)")
def test_v3_artifacts_are_reproducible_from_raw_data():
    built = snapshot.build(search.DEFAULT_CONFIG, snapshot.DEFAULT_PROFILE)
    for name, content in built.items():
        assert content == load(name), name
    assert search.discover(CONFIG, CATALOG, SCIENCE) == load("search-results.json")


@pytest.mark.skipif(not RAW_READY, reason="integración opcional: requiere data/raw para recalcular la referencia")
@pytest.mark.parametrize("stores", ["ausentes", "vacíos"])
def test_search_without_shortlist_builds_an_honest_negative_experiment(tmp_path: Path, monkeypatch, stores: str):
    negative = run(lambda window, _config: {**metrics(water=0.2), "tiles": []}, catalog=CATALOG)
    assert negative["shortlist"] == []
    monkeypatch.setattr(snapshot, "discover", lambda *args, **kwargs: negative)
    config = copy.deepcopy(CONFIG)
    for name in ("sentinel2_file", "power_file", "inventory_file", "acquisition_log"):
        path = tmp_path / f"{name}.json"
        config["sources"][name] = str(path)  # ruta absoluta: no se leen los datos reales de la etapa 2
        if stores == "vacíos":
            path.write_text(json.dumps({"sites": {}}), encoding="utf-8")
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config), encoding="utf-8")

    built = snapshot.build(config_path, snapshot.DEFAULT_PROFILE)

    sites = built["candidate-details.json"]
    assert [(s["site_id"], s["role"], s["similarity"]) for s in sites] == [("cl-pampa-yungay-screening", "reference", 75.67)]
    validate(sites[0], "candidate-site")
    validate(built["manifest.json"], "data-manifest")
    validate(built["search-results.json"], "discovery-search")
    counts = built["search-results.json"]["counts"]
    assert (counts["attempted"], counts["evaluated"], counts.get("selected", 0), counts["rejected_water"]) == (50, 50, 0, 50)
    declared = {d["dataset_id"] for d in built["manifest.json"]["datasets"]}
    assert not declared & set(snapshot.SEARCH_DATASETS.values()) - {snapshot.DERIVED}  # ningún dataset de etapa 2 inventado
    used = {i["dataset_id"] for i in sites[0]["score_breakdown"] + sites[0]["evidence"]} - {"none"}
    assert used <= declared
    assert built["analysis-summary.json"]["search"]["shortlist"] == [] and len(built["analysis-summary.json"]["sites"]) == 1


# --- Contexto visual v3 -----------------------------------------------------------------

def test_v3_visual_package_is_bound_to_the_snapshot_and_reuses_the_v2_yungay_view(tmp_path: Path):
    options = visual.v3_options()
    index = visual.load_valid_package(visual.V3_OUT, options["plans"])
    assert index is not None and index["snapshot_version"] == "science-screening-v3"
    assert [s["site_id"] for s in index["sites"]] == [c["site_id"] for c in load("candidate-details.json")]
    v2 = json.loads((visual.DEFAULT_OUT / "index.json").read_text("utf-8"))
    reused = next(s for s in index["sites"] if s["site_id"] == "cl-pampa-yungay-screening")
    assert reused == next(s for s in v2["sites"] if s["site_id"] == reused["site_id"])
    assert options["max_new"] == 6 and len(index["sites"]) - 1 <= options["max_new"]

    def no_network(_request):
        raise AssertionError("no debe consultar")

    # El paquete válido se reutiliza; sin él, superar el límite de imágenes nuevas se rechaza antes de consultar.
    package = tmp_path / "visual-context-v3"
    shutil.copytree(visual.V3_OUT, package)
    assert visual.build(package, no_network, **options)[1] is True
    with pytest.raises(visual.VisualContextError, match="límite autorizado"):
        visual.build(tmp_path / "otro", no_network, **{**options, "max_new": 5})
    # Un sitio con otra bbox no reutiliza la imagen de la referencia.
    moved = copy.deepcopy(options["plans"][-1])
    moved["bbox"][0] -= 0.01
    assert visual._reusable(moved, visual.DEFAULT_OUT) is None and visual._reusable(options["plans"][-1], visual.DEFAULT_OUT) is not None
