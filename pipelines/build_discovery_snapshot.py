"""Construye el snapshot v3: candidatos de la búsqueda y Yungay como referencia conocida.

Usa las mismas fórmulas, pesos y tolerancias del snapshot v2 (``score_inputs``,
``aggregate`` y ``sensitivity``). Los candidatos salen de la preselección de
``pipelines.discover_candidates``; Yungay se recalcula con sus datos v2 y debe
conservar sus valores. Es un screening: no aprueba sitios ni declara novedad.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime
from pathlib import Path

from pipelines import __version__
from pipelines.build_precision_snapshot import (
    _constraint_checks,
    _dataset_manifest,
    _nasadem_inventory,
    _nasadem_metrics,
    _sentinel_metrics,
    score_inputs,
)
from pipelines.build_science_snapshot import _area_km2, _dump, _mola_reference, _polygon, _power_metrics, _sha256
from pipelines.constraints import evaluate_constraints
from pipelines.contracts import ROOT, load_profile, validate
from pipelines.discover_candidates import (
    DEFAULT_CONFIG,
    discover,
    grid_windows,
    literature_status,
    load_inputs,
    precedent_matches,
    topographic_priority,
)
from pipelines.fetch_discovery_data import request_key, source_requests
from pipelines.scoring import aggregate, sensitivity

DEFAULT_PROFILE = ROOT / "config" / "mission_profiles" / "mars-rover-screening-v3.json"
DEFAULT_OUT = ROOT / "artifacts" / "science-v3"
OUTLINE = DEFAULT_OUT / "context-outline.geojson"

DERIVED = "derived-mola-nasadem-sentinel2-v3"
SEARCH_DATASETS = {
    "derived": DERIVED,
    "sentinel2": "copernicus-sentinel2-l2a-surface-2025-v3-search",
    "power": "nasa-power-climatology-points-v3-search",
    "hls": "nasa-earthdata-hls-s30-inventory-2025-v3-search",
}
REFERENCE_DATASETS = {
    "derived": DERIVED,
    "sentinel2": "copernicus-sentinel2-l2a-surface-2025-v1",
    "power": "nasa-power-climatology-points-v1",
    "hls": "nasa-earthdata-hls-s30-inventory-2025-v1",
}
PRECEDENTS_DATASET = "analog-precedents-catalog-v1"
# Autoridad territorial por país para las restricciones no evaluadas. No implica permiso alguno.
TERRITORIAL = {
    "CL": {"name": "IDE Chile", "url": "https://www.ide.cl/", "geology": "SERNAGEOMIN"},
    "AR": {"name": "IDERA", "url": "https://www.idera.gob.ar/", "geology": "SEGEMAR"},
}
FIELD_CHECKS = [
    "Confirmar límites, propiedad, acceso, seguridad y permisos con autoridades y propietarios.",
    "Levantar obstáculos, pendiente y rugosidad a escala centimétrica/decimétrica.",
    "Medir granulometría, cohesión, polvo, hundimiento y tracción del suelo para el rover.",
    "Intersectar cartografía oficial de áreas protegidas, urbano e infraestructura antes de planificar campaña.",
    "Solicitar revisión geológica de las unidades y afloramientos del polígono.",
]
RELATION_LABEL = {
    "contains_published_sampling_coordinate": "contiene coordenadas de muestreo publicadas",
    "study_area_overlap": "se superpone a un área de estudio publicada",
    "proximity_heuristic": "cercanía a una coordenada publicada (heurística de 25 km, no perímetro del estudio)",
    "regional_precedent": "región con antecedentes publicados",
}
LITERATURE_NOTE = {
    "known_reference": "Referencia conocida: se muestra para comparar y no participa en el ranking de candidatos.",
    "known_analogue_overlap": "La ventana contiene coordenadas o un área de estudio publicadas.",
    "regional_precedent": "La región tiene antecedentes publicados como análogo. Las fuentes revisadas no ubican coordenadas "
                          "de muestreo dentro de esta ventana; eso no prueba que sea nueva.",
    "literature_review_pending": "Sin antecedentes en el catálogo revisado; la revisión bibliográfica específica sigue pendiente.",
    "no_match_in_reviewed_sources": "Sin coincidencias en las fuentes revisadas, que son incompletas; no prueba novedad.",
}


def expected_months(time_start: str, time_end: str) -> list[str]:
    """Inicios de mes (UTC) que debe cubrir la serie, p. ej. los 12 de 2025."""
    current = datetime.strptime(time_start, "%Y-%m-%dT%H:%M:%SZ")
    end = datetime.strptime(time_end, "%Y-%m-%dT%H:%M:%SZ")
    months = []
    while current < end:
        months.append(current.strftime("%Y-%m-%dT%H:%M:%SZ"))
        current = current.replace(year=current.year + current.month // 12, month=current.month % 12 + 1)
    return months


def _finite(value: object) -> bool:
    try:
        return not isinstance(value, bool) and math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


class SourceMismatch(ValueError):
    """Un dato crudo en caché pertenece a otra petición (otra bbox, periodo, producto o transformación)."""


def cached_response(store: dict, site_id: str, request: object, label: str) -> dict | None:
    """Entrada cruda de un sitio solo si corresponde exactamente a la petición vigente.

    Sin entrada o con fallo registrado devuelve ``None`` (dato faltante). Si la entrada
    es de otra petición se detiene el build: nunca se atribuyen datos viejos al experimento.
    """
    entry = store["sites"].get(site_id)
    if entry is None or entry.get("status") != "ok":
        return None
    if entry.get("request_key") != request_key(request) or entry.get("request") != request:
        raise SourceMismatch(
            f"{label} de {site_id} en caché no corresponde a la configuración vigente; "
            "ejecuta python -m pipelines.fetch_discovery_data --stage sources."
        )
    return entry


# Bandas del evalscript de superficie y su rango físico: fracciones 0–1 e índices normalizados −1–1.
SENTINEL_BANDS = {"nonvegetated": (0.0, 1.0), "vegetation": (0.0, 1.0), "water": (0.0, 1.0), "ndvi": (-1.0, 1.0), "bsi": (-1.0, 1.0)}
POWER_UNITS = {"PRECTOTCORR": "mm/day", "TS": "C", "TS_MAX": "C", "TS_MIN": "C"}


def _row_problem(row: dict, months: dict[str, str], seen: set[str]) -> str | None:
    """Motivo por el que una fila mensual no es utilizable, o ``None`` si lo es."""
    interval = row.get("interval") if isinstance(row.get("interval"), dict) else {}
    start = interval.get("from")
    if start not in months:
        return "intervalo fuera del periodo configurado"
    if interval.get("to") != months[start]:
        return "el intervalo no es un mes completo"
    if start in seen:
        return "intervalo duplicado"
    if "error" in row:
        return "error de la API en el intervalo"
    bands = row.get("outputs", {}).get("surface", {}).get("bands", {})
    for name, (low, high) in SENTINEL_BANDS.items():
        stats = bands.get(name, {}).get("stats") if isinstance(bands.get(name), dict) else None
        if not isinstance(stats, dict):
            return f"falta la banda {name}"
        samples, nodata = stats.get("sampleCount"), stats.get("noDataCount")
        if not (isinstance(samples, int) and isinstance(nodata, int)) or isinstance(samples, bool) or isinstance(nodata, bool):
            return f"conteos no enteros en {name}"
        if not 0 <= nodata <= samples or samples == 0:
            return f"conteos incoherentes en {name}"
        if nodata == samples:
            return "sin píxeles válidos (NoData)"
        if not _finite(stats.get("mean")) or not low <= float(stats["mean"]) <= high:
            return f"media no finita o fuera de rango en {name}"
    return None


def checked_sentinel(site_id: str, entry: dict | None, copernicus: dict) -> tuple[dict | None, list[dict]]:
    """Métricas Sentinel-2 solo con meses únicos, dentro del periodo, sin error y con datos finitos.

    Devuelve ``(métricas | None, intervalos rechazados)``. La completitud se mide
    contra los meses configurados, no contra los que devolvió la API.
    """
    starts = expected_months(copernicus["time_start"], copernicus["time_end"])
    months = dict(zip(starts, [*starts[1:], copernicus["time_end"]]))
    rows = (entry or {}).get("response", {}).get("data") if (entry or {}).get("status", "ok") == "ok" else None
    if not isinstance(rows, list):
        return None, [{"interval": None, "reason": "sin respuesta utilizable de la Statistical API"}]
    valid, rejected, seen = [], [], set()
    for row in rows:
        reason = _row_problem(row, months, seen) if isinstance(row, dict) else "fila con formato inesperado"
        if reason is None:
            seen.add(row["interval"]["from"])
            valid.append(row)
        else:
            interval = row.get("interval") if isinstance(row, dict) and isinstance(row.get("interval"), dict) else {}
            rejected.append({"interval": interval.get("from"), "reason": reason})
    if not valid:
        return None, rejected
    metrics = _sentinel_metrics(site_id, {"sites": {site_id: {"response": {"data": valid}}}}, expected_intervals=len(months))
    return {**metrics, "rejected_intervals": rejected}, rejected


def checked_power(site_id: str, response: object, request_url: str) -> tuple[dict | None, str | None]:
    """Climatología POWER solo si trae las unidades esperadas y valores anuales reales.

    Un valor de relleno (``fill_value``, normalmente −999), no finito o incoherente deja
    el contexto climático como faltante; nunca se convierte en precipitación o temperatura.
    """
    if not isinstance(response, dict):
        return None, "respuesta POWER con formato inesperado"
    fill = response.get("header", {}).get("fill_value") if isinstance(response.get("header"), dict) else None
    annual = {}
    for name, unit in POWER_UNITS.items():
        declared = (response.get("parameters") or {}).get(name, {})
        if not isinstance(declared, dict) or declared.get("units") != unit:
            return None, f"unidad inesperada o ausente en {name} (se esperaba {unit})"
        value = ((response.get("properties") or {}).get("parameter") or {}).get(name, {})
        value = value.get("ANN") if isinstance(value, dict) else None
        if not _finite(value) or (_finite(fill) and float(value) == float(fill)):
            return None, f"{name} sin valor anual válido (relleno o no finito)"
        annual[name] = float(value)
    if annual["PRECTOTCORR"] < 0 or annual["TS_MAX"] < annual["TS_MIN"]:
        return None, "valores anuales fuera de rango"
    return _power_metrics(site_id, {site_id: {"response": response, "request_url": request_url}}), None


def constraint_checks(country: str, earth: dict, sentinel: dict | None) -> list[dict]:
    """Restricciones v2 con la autoridad territorial del país; las no evaluadas siguen pendientes."""
    checks = _constraint_checks(earth, sentinel or {"maximum_monthly_water_fraction": 0.0})
    authority = TERRITORIAL[country]
    for check in checks:
        if check["source_url"] == TERRITORIAL["CL"]["url"]:
            check["source_url"] = authority["url"]
            check["authority"] = check["authority"].replace(TERRITORIAL["CL"]["name"], authority["name"])
        if sentinel is None and "Sentinel-2 observó" in check["reason"]:
            check["reason"] = check["reason"].split("; Sentinel-2 observó")[0] + "; Sentinel-2 no entregó meses válidos."
    return checks


def _missing(dataset_id: str, explanation: str) -> dict:
    return {"raw_value": None, "similarity": None, "quality": 0.0, "status": "missing",
            "dataset_id": dataset_id, "explanation": explanation}


def site_inputs(country: str, earth: dict, sentinel: dict | None, climate: dict | None, mola: dict, datasets: dict) -> dict:
    """``score_inputs`` de v2; un criterio sin dato real queda como faltante, nunca con un valor supuesto."""
    geology = (f"Requiere cartografía geológica oficial ({TERRITORIAL[country]['geology']}) y revisión experta; "
               "permanece fuera del score v3.")
    inputs = score_inputs(
        earth,
        sentinel or {"valid_intervals": 0, "nonvegetated_fraction": 0.0, "quality": 0.0},
        climate or {"annual_precipitation_mm": 0.0, "skin_temperature_range_c": 0.0},
        mola, datasets, geology,
    )
    if sentinel is None:
        inputs["bare_ground_fraction"] = _missing(datasets["sentinel2"], "Sentinel-2 no entregó meses válidos para esta ventana.")
    if climate is None:
        for criterion in ("aridity_context", "surface_temperature_variability"):
            inputs[criterion] = _missing(datasets["power"], "NASA POWER no entregó climatología para esta ventana.")
    return inputs


def literature_review(status: str, matches: list[dict], catalog: dict) -> dict:
    return {"status": status, "catalog_version": catalog["catalog_version"], "reviewed_at": catalog["reviewed_at"],
            "matches": matches, "note": LITERATURE_NOTE[status]}


def site_entry(*, site_id: str, name: str, country: str, role: str, geometry: dict, profile: dict, config: dict,
               earth: dict, sentinel: dict | None, climate: dict | None, hls_count: int | None, mola: dict,
               datasets: dict, discovery: dict, review: dict, catalog: dict, extra_warnings: list[str]) -> tuple[dict, dict]:
    """Ficha contractual de un sitio y su análisis auditable."""
    inputs = site_inputs(country, earth, sentinel, climate, mola, datasets)
    aggregation = profile["aggregation"]
    score = aggregate(profile["criteria"], inputs, aggregation["epsilon"], aggregation["minimum_valid_weight"])
    robustness = sensitivity(profile["criteria"], inputs, aggregation["epsilon"], aggregation["minimum_valid_weight"])
    constraints = evaluate_constraints(constraint_checks(country, earth, sentinel))
    nasadem_url = "https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001"
    evidence = [
        {"evidence_id": f"{site_id}-mola", "dataset_id": "nasa-pds-mola-meg128-jezero-v1",
         "claim": "Referencia marciana: topografía MOLA MEGDR del entorno regional de Jezero.",
         "source_url": "https://pds-geosciences.wustl.edu/missions/mgs/megdr.html"},
        {"evidence_id": f"{site_id}-nasadem", "dataset_id": datasets["derived"],
         "claim": f"Topografía terrestre: NASADEM_HGT.001 mosaico de {len(earth['tiles'])} tile(s), agregado a ~{earth['analysis_spacing_meter']:.0f} m.",
         "source_url": nasadem_url},
    ]
    if sentinel is not None:
        fraction = f"{sentinel['nonvegetated_fraction'] * 100:.1f}".replace(".", ",")
        evidence.append({"evidence_id": f"{site_id}-sentinel2", "dataset_id": datasets["sentinel2"],
                         "claim": f"Superficie: {fraction} % no vegetada, mediana de {sentinel['valid_intervals']} de "
                                  f"{sentinel['expected_intervals']} mosaicos mensuales Sentinel-2 L2A de 2025.",
                         "source_url": "https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html"})
    if hls_count is not None:
        evidence.append({"evidence_id": f"{site_id}-hls-inventory", "dataset_id": datasets["hls"],
                         "claim": f"Disponibilidad NASA independiente: {hls_count} granules HLS Sentinel-2 intersectan el AOI en 2025; "
                                  "se registra como inventario, no entra al score.",
                         "source_url": "https://doi.org/10.5067/HLS/HLSS30.002"})
    if climate is not None:
        evidence.append({"evidence_id": f"{site_id}-power", "dataset_id": datasets["power"],
                         "claim": "Contexto regional: climatología NASA POWER 2001–2025 de una celda MERRA-2 de 0,5° × 0,625°, "
                                  "mayor que la ventana; no es lluvia medida en el sitio y requiere contraste local.",
                         "source_url": climate["request_url"]})
    by_id = {precedent["precedent_id"]: precedent for precedent in catalog["precedents"]}
    for match in review["matches"]:
        precedent = by_id[match["precedent_id"]]
        evidence.append({"evidence_id": f"{site_id}-precedent-{match['precedent_id']}", "dataset_id": PRECEDENTS_DATASET,
                         "claim": f"Antecedente ({RELATION_LABEL[match['relation']]}): {precedent['name']}.",
                         "source_url": precedent["sources"][0]["url"]})
    status = "reference" if role == "reference" else ("candidate" if score["similarity"] is not None else "insufficient_data")
    entry = {
        "site_id": site_id,
        "name": name,
        "country": country,
        "role": role,
        "profile_id": profile["id"],
        "profile_version": profile["version"],
        "data_snapshot_version": config["snapshot_version"],
        "pipeline_version": __version__,
        "geometry": geometry,
        "area_km2": _area_km2(geometry),
        "status": status,
        "similarity": score["similarity"],
        "confidence": score["confidence"],
        "feasibility": constraints["feasibility"],
        "stability": robustness["stability"],
        "score_breakdown": score["score_breakdown"],
        "warnings": [
            "SCREENING CIENTÍFICO: prioriza reconocimiento; no aprueba el sitio, no garantiza seguridad y no autoriza acceso.",
            *extra_warnings,
            *constraints["warnings"],
        ],
        "limitations": profile["limitations"],
        "field_checks": FIELD_CHECKS,
        "evidence": evidence,
        "discovery": discovery,
        "literature_review": review,
    }
    validate(entry, "candidate-site")
    analysis = {"site_id": site_id, "role": role, "nasadem": earth, "sentinel2": sentinel, "hls_granule_count": hls_count,
                "nasa_power": climate, "valid_weight": score["valid_weight"], "sensitivity": robustness}
    return entry, analysis


def _dataset(base: dict, **changes) -> dict:
    return {**base, **changes}


def manifest_datasets(config: dict, science_config: dict, reference_tiles: list[str], search_tiles: list[str],
                      raw: dict, log: dict, texts: dict) -> list[dict]:
    """Manifiesto real: fuentes v2 de la referencia, fuentes nuevas de la búsqueda y derivados."""
    inventory_v2, nasadem_records = _nasadem_inventory(science_config)
    v2 = {item["dataset_id"]: item for item in _dataset_manifest(science_config, "", raw["power_v2"], nasadem_records)}
    keep = ["nasa-pds-mola-meg128-jezero-v1", REFERENCE_DATASETS["sentinel2"], REFERENCE_DATASETS["hls"], REFERENCE_DATASETS["power"]]
    datasets = [v2[name] for name in keep] + [v2[f"nasadem-{tile}-v1"] for tile in reference_tiles]
    sources = config["sources"]

    def latest(store: dict) -> str:
        return max(entry["acquired_at"] for entry in store["sites"].values())

    # Las fuentes de la etapa 2 solo se declaran si realmente se adquirieron: una búsqueda sin
    # preselección produce un experimento negativo sin datasets inventados.
    if raw["sentinel2"]["sites"]:
        datasets.append(_dataset(
            v2[REFERENCE_DATASETS["sentinel2"]], dataset_id=SEARCH_DATASETS["sentinel2"],
            downloaded_at=latest(raw["sentinel2"]), checksum=_sha256(ROOT / sources["sentinel2_file"]),
            quality_notes=[*v2[REFERENCE_DATASETS["sentinel2"]]["quality_notes"],
                           "Solo ventanas preseleccionadas; la completitud se mide contra los 12 meses configurados y se "
                           "descartan intervalos duplicados, fuera de periodo, con error o no finitos."],
        ))
    if raw["inventory"]["sites"]:
        datasets.append(_dataset(
            v2[REFERENCE_DATASETS["hls"]], dataset_id=SEARCH_DATASETS["hls"],
            downloaded_at=latest(raw["inventory"]), checksum=_sha256(ROOT / sources["inventory_file"]),
        ))
    if raw["power"]["sites"]:
        datasets.append(_dataset(
            v2[REFERENCE_DATASETS["power"]], dataset_id=SEARCH_DATASETS["power"],
            downloaded_at=latest(raw["power"]), checksum=_sha256(ROOT / sources["power_file"]),
            spatial_resolution="celda MERRA-2 de 0,5° × 0,625°, mayor que la ventana de ~20 km",
            quality_notes=["Contexto climático regional, no lluvia medida en el sitio; ventanas vecinas pueden compartir celda. "
                           "Requiere contraste con datos locales."],
        ))
    directory = ROOT / science_config["nasadem"]["directory"]
    template = v2[f"nasadem-{reference_tiles[0]}-v1"]
    for tile in search_tiles:
        if tile in reference_tiles:
            continue
        filename = f"NASADEM_HGT_{tile}.zip"
        acquired = log.get("tiles", {}).get(filename)
        if acquired is None:
            raise ValueError(f"Falta el registro de adquisición de {filename}; ejecuta "
                             "python -m pipelines.fetch_discovery_data --stage tiles.")
        datasets.append(_dataset(
            template, dataset_id=f"nasadem-{tile}-v1", product=filename.removesuffix(".zip"),
            access_url=acquired["data_link"], downloaded_at=acquired["acquired_at"], checksum=_sha256(directory / filename),
            transformations=["Mosaico multitesela", "recorte 0,2° por ventana de la rejilla", "agregación 16×16", "métricas topográficas"],
        ))
    created = config["created_at"]
    derived = {
        "provider": "AnalogOS", "collection_version": config["snapshot_version"], "downloaded_at": created,
        "time_start": None, "time_end": None, "temporal_resolution": "snapshot", "crs": "OGC CRS84",
        "license": "Código MIT; datos conservan licencias de origen", "nodata": None,
    }
    datasets += [
        _dataset(v2["natural-earth-admin0-50m"], product="Admin 0 — Countries 1:50m (Chile y Argentina)",
                 downloaded_at=created, checksum=_sha256(OUTLINE),
                 quality_notes=["Solo contexto visual; no es límite oficial ni autoridad territorial y no entra al score."],
                 transformations=["Extracción de Chile y Argentina desde world-atlas"]),
        {**derived, "dataset_id": PRECEDENTS_DATASET, "product": "Catálogo revisado de antecedentes de análogos",
         "landing_url": "urn:analogos:precedents-catalog-v1", "access_url": "urn:analogos:science-screening-v3:precedents",
         "spatial_resolution": "coordenadas publicadas o descripción regional, según la fuente", "units": "no aplica",
         "checksum": "sha256:" + hashlib.sha256(texts["precedents"].encode("utf-8")).hexdigest(),
         "quality_notes": ["Catálogo incompleto; no encontrar coincidencias no prueba novedad."],
         "transformations": ["Transcripción literal de coordenadas publicadas", "conversión a grados decimales"]},
        {**derived, "dataset_id": "analogos-discovery-search-v3", "product": "Resultados de la búsqueda por rejilla (50 ventanas)",
         "landing_url": "urn:analogos:discovery-search-v3", "access_url": "urn:analogos:science-screening-v3:search-results",
         "spatial_resolution": "ventanas de 0,2° (~20 km); métricas a ~460–480 m", "units": "m, grados, fracciones y prioridad 0–100",
         "checksum": "sha256:" + hashlib.sha256(texts["search"].encode("utf-8")).hexdigest(),
         "quality_notes": ["La prioridad topográfica solo ordena la preselección; no es score final ni confianza."],
         "transformations": ["Rejilla regular", "métricas NASADEM v2", "media geométrica topográfica", "diversificación por distancia"]},
        {**derived, "dataset_id": DERIVED, "product": "Métricas topográficas, espectrales y climáticas derivadas",
         "landing_url": "urn:analogos:science-screening-v3", "access_url": "urn:analogos:science-screening-v3:analysis-summary",
         "spatial_resolution": "~30 m superficie; ~460–480 m comparación topográfica",
         "units": "m, grados, fracciones, índices, mm/año y °C", "crs": "mixto; ver fuentes",
         "checksum": "sha256:" + hashlib.sha256(texts["summary"].encode("utf-8")).hexdigest(),
         "quality_notes": ["Screening reproducible; geología y restricciones territoriales siguen pendientes en ambos países."],
         "transformations": ["Mosaico", "agregación espacial", "medianas temporales", "media geométrica", "sensibilidad ±20 %"]},
    ]
    return datasets


def build(config_path: Path, profile_path: Path) -> dict[str, object]:
    config, catalog, science_config = load_inputs(config_path)
    profile = load_profile(profile_path)
    sources = config["sources"]
    def store(name: str) -> dict:
        # Sin preselección la etapa 2 no se ejecuta y estos archivos pueden no existir.
        path = ROOT / sources[name]
        return json.loads(path.read_text("utf-8")) if path.exists() else {"sites": {}}

    raw = {
        "sentinel2": store("sentinel2_file"),
        "power": store("power_file"),
        "inventory": store("inventory_file"),
        "sentinel2_v2": json.loads((ROOT / science_config["copernicus"]["file"]).read_text("utf-8")),
        "power_v2": json.loads((ROOT / science_config["power"]["file"]).read_text("utf-8")),
    }
    log_path = ROOT / sources["acquisition_log"]
    log = json.loads(log_path.read_text("utf-8")) if log_path.exists() else {}
    inventory_v2, _records = _nasadem_inventory(science_config)
    mola = _mola_reference(science_config)
    search = discover(config, catalog, science_config, mola=mola)
    records = {record["window_id"]: record for record in search["windows"]}
    windows = {window["window_id"]: window for window in grid_windows(config)}
    copernicus = science_config["copernicus"]

    entries, analyses = [], []
    for window_id in search["shortlist"]:
        window, record = windows[window_id], records[window_id]
        earth = _nasadem_metrics(window, science_config)
        requests_ = source_requests(science_config, window)
        sentinel, rejected = checked_sentinel(
            window_id, cached_response(raw["sentinel2"], window_id, requests_["sentinel2"], "Sentinel-2"), copernicus)
        power_entry = cached_response(raw["power"], window_id, requests_["power"], "NASA POWER")
        climate, power_problem = (checked_power(window_id, power_entry["response"], power_entry["request"])
                                  if power_entry else (None, "sin respuesta POWER registrada"))
        hls = cached_response(raw["inventory"], window_id, requests_["hls"], "el inventario HLS") or {}
        entry, analysis = site_entry(
            site_id=window_id, name=window["name"], country=window["country"], role="candidate",
            geometry=_polygon(window), profile=profile, config=config, earth=earth, sentinel=sentinel, climate=climate,
            hls_count=hls["response"]["granule_count"] if hls.get("status") == "ok" else None, mola=mola,
            datasets=SEARCH_DATASETS,
            discovery={"origin": "grid_search", "search_id": config["search_id"], "region_id": window["region_id"],
                       "window_id": window_id, "selection_rank": record["selection_rank"],
                       "topographic_priority": record["topographic_priority"],
                       "note": "Preseleccionada por prioridad topográfica y separación mínima; no es un hallazgo validado."},
            review=literature_review(record["literature"]["status"], record["literature"]["matches"], catalog),
            catalog=catalog, extra_warnings=[],
        )
        analysis["source_problems"] = [
            *(f"Sentinel-2 {item['interval'] or 'sin intervalo'}: {item['reason']}" for item in rejected),
            *([f"NASA POWER: {power_problem}"] if power_problem else []),
            *([] if hls else ["Inventario HLS: sin respuesta registrada"]),
        ]
        entries.append(entry)
        analyses.append(analysis)

    # Valores POWER idénticos sugieren una celda compartida, pero la respuesta no identifica la celda.
    for entry, analysis in zip(entries, analyses):
        power = analysis["nasa_power"]
        matching = sorted(other["site_id"] for other in analyses if other is not analysis and power and other["nasa_power"]
                          and (other["nasa_power"]["annual_precipitation_mm"], other["nasa_power"]["skin_temperature_range_c"])
                          == (power["annual_precipitation_mm"], power["skin_temperature_range_c"]))
        analysis["power_values_matching"] = matching
        if matching:
            entry["warnings"].insert(1, "ADVERTENCIA — valores de contexto POWER coincidentes con " + ", ".join(matching)
                                     + "; posible celda compartida: no son observaciones climáticas independientes.")
    entries.sort(key=lambda item: (item["similarity"] is None, -(item["similarity"] or 0), item["site_id"]))
    analyses.sort(key=lambda item: [entry["site_id"] for entry in entries].index(item["site_id"]))

    reference = config["reference"]
    site = next(item for item in science_config["sites"] if item["site_id"] == reference["site_id"])
    earth = _nasadem_metrics(site, science_config)
    sentinel, rejected = checked_sentinel(site["site_id"], raw["sentinel2_v2"]["sites"].get(site["site_id"]), copernicus)
    power_v2 = raw["power_v2"][site["site_id"]]
    climate, power_problem = checked_power(site["site_id"], power_v2["response"], power_v2["request_url"])
    matches = precedent_matches({**site, "window_id": site["site_id"], "region_id": None}, catalog, config["precedents"]["proximity_km"])
    _similarities, priority = topographic_priority(earth, mola, config["stage1"])
    entry, analysis = site_entry(
        site_id=site["site_id"], name=site["name"], country="CL", role="reference", geometry=_polygon(site), profile=profile,
        config=config, earth=earth, sentinel=sentinel, climate=climate,
        hls_count=inventory_v2["sites"][site["site_id"]]["hls"]["granule_count"], mola=mola, datasets=REFERENCE_DATASETS,
        discovery={"origin": "known_reference", "search_id": config["search_id"], "region_id": None, "window_id": None,
                   "selection_rank": None, "topographic_priority": priority,
                   "source_snapshot": reference["source_snapshot"], "note": reference["note"]},
        review=literature_review("known_reference", matches, catalog), catalog=catalog,
        extra_warnings=["REFERENCIA CONOCIDA: Yungay se muestra para comparar; no es un candidato de la búsqueda."],
    )
    analysis["power_values_matching"] = []
    analysis["source_problems"] = [*(f"Sentinel-2 {item['interval']}: {item['reason']}" for item in rejected),
                                   *([f"NASA POWER: {power_problem}"] if power_problem else [])]
    entries.append(entry)
    analyses.append(analysis)
    assert literature_status(site["site_id"], matches, catalog) == "known_analogue_overlap", "Yungay debe contener coordenadas publicadas"

    # Observaciones visuales preliminares: van a la ficha como advertencia y nunca cambian score ni factibilidad.
    observations = json.loads((ROOT / sources["visual_observations"]).read_text("utf-8"))
    for item, analysis in zip(entries, analyses):
        seen = observations["sites"].get(item["site_id"])
        analysis["visual_observation"] = seen
        if seen:
            item["warnings"].insert(1, f"OBSERVACIÓN VISUAL PRELIMINAR (Sentinel-2, diciembre de 2025; revisada el "
                                       f"{observations['observed_at']}): {seen}. Es apariencia a contrastar: no identifica "
                                       "instalaciones, propietarios ni permisos, no cambia el score ni la factibilidad y requiere cruce territorial.")

    summary = {
        "snapshot_version": config["snapshot_version"],
        "method": "Rejilla de 50 ventanas → prioridad topográfica NASADEM vs MOLA → hasta 6 ventanas con Sentinel-2 L2A mensual y POWER; "
                  "fórmulas y pesos v2. Yungay recalculado como referencia.",
        "mola_reference": mola,
        "search": {"search_id": search["search_id"], "counts": search["counts"], "shortlist": search["shortlist"],
                   "explored_area_km2": search["explored_area_km2"]},
        "sites": analyses,
    }
    texts = {"summary": _dump(summary), "search": _dump(search), "precedents": _dump(catalog)}
    search_tiles = sorted({tile for record in search["windows"] if record["nasadem"] for tile in record["nasadem"]["tiles"]})
    manifest = {
        "snapshot_version": config["snapshot_version"],
        "created_at": config["created_at"],
        "pipeline_version": __version__,
        "datasets": manifest_datasets(config, science_config, earth["tiles"], search_tiles, raw, log, texts),
    }
    validate(manifest, "data-manifest")
    return {"manifest.json": manifest, "mission-profile.json": profile, "candidate-details.json": entries,
            "analysis-summary.json": summary, "search-results.json": search, "precedents.json": catalog}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--profile", type=Path, default=DEFAULT_PROFILE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for name, content in build(args.config, args.profile).items():
        (args.out / name).write_text(_dump(content), encoding="utf-8")
        print(f"escrito {args.out / name}")
    print("AVISO: snapshot v3 de screening; ningún candidato se declara nuevo ni validado.")


if __name__ == "__main__":
    main()
