"""Construye el snapshot v2 con MOLA, NASADEM, Sentinel-2 y NASA POWER.

La topografía NASADEM se mosaica antes del recorte, evitando truncar sectores
que cruzan límites de tiles. Sentinel-2 L2A aporta estadísticas mensuales de
superficie con máscara SCL. La salida sigue siendo un screening, no una
certificación de terreno.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import zipfile
from pathlib import Path

import numpy as np

from pipelines import __version__
from pipelines.build_science_snapshot import (
    _area_km2,
    _block_mean,
    _dump,
    _mola_reference,
    _polygon,
    _power_metrics,
    _ratio_similarity,
    _sha256,
    _terrain_metrics,
)
from pipelines.constraints import evaluate_constraints
from pipelines.contracts import ROOT, load_profile, validate
from pipelines.scoring import aggregate, sensitivity

DEFAULT_CONFIG = ROOT / "config" / "science_snapshot_v2.json"
DEFAULT_PROFILE = ROOT / "config" / "mission_profiles" / "mars-rover-screening-v2.json"
DEFAULT_OUT = ROOT / "artifacts" / "science-v2"
OUTLINE = ROOT / "artifacts" / "demo" / "chile-outline.geojson"
EARTH_RADIUS_M = 6_371_008.8
NASADEM_SIDE = 3601
NASADEM_CELLS = NASADEM_SIDE - 1


def _percent(value: float, digits: int) -> str:
    """Porcentaje con coma decimal, igual que el resto de la interfaz."""
    return f"{value * 100:.{digits}f}".replace(".", ",") + " %"


class TerrainDataError(ValueError):
    """Los datos NASADEM de una ventana no permiten calcular métricas (fallo de datos, no de programa)."""


def _tile_name(latitude_base: int, longitude_base: int) -> str:
    latitude = f"n{latitude_base:02d}" if latitude_base >= 0 else f"s{abs(latitude_base):02d}"
    longitude = f"e{longitude_base:03d}" if longitude_base >= 0 else f"w{abs(longitude_base):03d}"
    return latitude + longitude


def _read_nasadem_tile(directory: Path, tile: str) -> tuple[np.ndarray, np.ndarray]:
    archive = directory / f"NASADEM_HGT_{tile}.zip"
    if not archive.exists():
        raise FileNotFoundError(f"Falta {archive}; ejecuta pipelines.fetch_precision_data")
    try:
        with zipfile.ZipFile(archive) as bundle:
            height_raw = bundle.read(f"{tile}.hgt")
            water_raw = bundle.read(f"{tile}.swb")
    except (zipfile.BadZipFile, KeyError) as error:
        raise TerrainDataError(f"La tesela {archive.name} está dañada o incompleta ({type(error).__name__}).") from error
    height = np.frombuffer(height_raw, dtype=">i2").reshape(NASADEM_SIDE, NASADEM_SIDE)
    water = np.frombuffer(water_raw, dtype=np.uint8).reshape(NASADEM_SIDE, NASADEM_SIDE)
    return height, water


def _nasadem_window(site: dict, config: dict) -> tuple[np.ndarray, np.ndarray, list[str]]:
    half = site["half_size_degree"]
    min_lat = site["latitude"] - half
    max_lat = site["latitude"] + half
    min_lon = site["longitude"] - half
    max_lon = site["longitude"] + half
    rows = round((max_lat - min_lat) * NASADEM_CELLS) + 1
    columns = round((max_lon - min_lon) * NASADEM_CELLS) + 1
    latitudes = max_lat - np.arange(rows) / NASADEM_CELLS
    longitudes = min_lon + np.arange(columns) / NASADEM_CELLS
    latitude_bases = np.floor(latitudes + 1e-10).astype(int)
    longitude_bases = np.floor(longitudes + 1e-10).astype(int)

    elevation = np.full((rows, columns), np.nan, dtype=np.float64)
    water = np.zeros((rows, columns), dtype=np.uint8)
    tiles: list[str] = []
    directory = ROOT / config["nasadem"]["directory"]

    for latitude_base in sorted(set(latitude_bases.tolist())):
        output_rows = np.flatnonzero(latitude_bases == latitude_base)
        tile_rows = np.rint((latitude_base + 1 - latitudes[output_rows]) * NASADEM_CELLS).astype(int)
        for longitude_base in sorted(set(longitude_bases.tolist())):
            output_columns = np.flatnonzero(longitude_bases == longitude_base)
            tile_columns = np.rint((longitudes[output_columns] - longitude_base) * NASADEM_CELLS).astype(int)
            tile = _tile_name(latitude_base, longitude_base)
            tile_elevation, tile_water = _read_nasadem_tile(directory, tile)
            elevation[np.ix_(output_rows, output_columns)] = tile_elevation[np.ix_(tile_rows, tile_columns)]
            water[np.ix_(output_rows, output_columns)] = tile_water[np.ix_(tile_rows, tile_columns)]
            tiles.append(tile)

    elevation[elevation <= -32768] = np.nan
    return elevation, water, sorted(set(tiles))


def _slope_distribution(elevation: np.ndarray, spacing_x_m: float, spacing_y_m: float) -> dict:
    dy, dx = np.gradient(elevation, spacing_y_m, spacing_x_m)
    slope = np.degrees(np.arctan(np.hypot(dx, dy)))
    valid = slope[np.isfinite(slope)]
    return {
        "slope_p90_degree": round(float(np.percentile(valid, 90)), 3),
        "slope_p95_degree": round(float(np.percentile(valid, 95)), 3),
        "fraction_over_15_degree": round(float(np.mean(valid > 15)), 6),
        "fraction_over_25_degree": round(float(np.mean(valid > 25)), 6),
    }


def _nasadem_metrics(site: dict, config: dict) -> dict:
    elevation, water, tiles = _nasadem_window(site, config)
    if not np.isfinite(elevation).any():
        raise TerrainDataError("Todos los píxeles NASADEM de la ventana son NoData.")
    factor = config["nasadem"]["aggregation_factor"]
    latitude = site["latitude"]
    source_spacing_y = math.pi * EARTH_RADIUS_M / 180 / NASADEM_CELLS
    source_spacing_x = source_spacing_y * math.cos(math.radians(latitude))
    aggregated = _block_mean(elevation, factor)
    analysis_spacing_x = source_spacing_x * factor
    analysis_spacing_y = source_spacing_y * factor
    return {
        "tiles": tiles,
        "center": [site["longitude"], site["latitude"]],
        "window_degree": site["half_size_degree"] * 2,
        "source_spacing_meter": round((source_spacing_x + source_spacing_y) / 2, 1),
        "analysis_spacing_meter": round((analysis_spacing_x + analysis_spacing_y) / 2, 1),
        "permanent_water_fraction": round(float(np.mean(water == 255)), 8),
        "source_valid_fraction": round(float(np.mean(np.isfinite(elevation))), 6),
        "source_scale": _slope_distribution(elevation, source_spacing_x, source_spacing_y),
        **_terrain_metrics(aggregated, analysis_spacing_x, analysis_spacing_y),
    }


def _sentinel_metrics(site_id: str, raw: dict, expected_intervals: int | None = None) -> dict:
    # ``expected_intervals`` permite medir la completitud contra los meses configurados (v3);
    # sin él se conserva el comportamiento v2: los intervalos devueltos por la API.
    rows = raw["sites"][site_id]["response"]["data"]
    monthly: list[dict] = []
    for row in rows:
        bands = row.get("outputs", {}).get("surface", {}).get("bands", {})
        if not bands:
            continue
        first = next(iter(bands.values()))["stats"]
        sample_count = int(first["sampleCount"])
        no_data_count = int(first["noDataCount"])
        valid_count = sample_count - no_data_count
        if valid_count <= 0:
            continue
        monthly.append({
            "from": row["interval"]["from"],
            "to": row["interval"]["to"],
            "valid_fraction": valid_count / sample_count,
            **{name: float(content["stats"]["mean"]) for name, content in bands.items()},
        })
    if not monthly:
        raise ValueError(f"Sentinel-2 no produjo intervalos válidos para {site_id}")

    def median(name: str) -> float:
        return float(np.median([row[name] for row in monthly]))

    expected_intervals = expected_intervals or len(rows)
    coverage = median("valid_fraction")
    interval_completeness = len(monthly) / expected_intervals if expected_intervals else 0.0
    quality = min(0.90, 0.90 * coverage * interval_completeness)
    return {
        "valid_intervals": len(monthly),
        "expected_intervals": expected_intervals,
        "median_valid_fraction": round(coverage, 6),
        "nonvegetated_fraction": round(median("nonvegetated"), 6),
        "vegetation_fraction": round(median("vegetation"), 6),
        "water_fraction": round(median("water"), 6),
        "maximum_monthly_water_fraction": round(max(row["water"] for row in monthly), 6),
        "median_ndvi": round(median("ndvi"), 6),
        "median_bsi": round(median("bsi"), 6),
        "temporal_ndvi_stdev": round(float(np.std([row["ndvi"] for row in monthly])), 6),
        "quality": round(quality, 4),
        "monthly": monthly,
    }


def _constraint_checks(earth: dict, sentinel: dict) -> list[dict]:
    permanent_water = earth["permanent_water_fraction"]
    return [
        {
            "constraint_id": "protected_or_sensitive_area",
            "authority": "IDE Chile y autoridad territorial competente",
            "source_url": "https://www.ide.cl/",
            "action": "exclude",
            "state": "not_evaluated",
            "triggered": False,
            "reason": "No se intersectó aún con el inventario oficial de áreas protegidas o sensibles.",
        },
        {
            "constraint_id": "permanent_water_major",
            "authority": "NASA LP DAAC — NASADEM SWB",
            "source_url": "https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001",
            "action": "exclude",
            "state": "evaluated",
            "triggered": permanent_water > 0.05,
            "reason": (
                f"NASADEM SWB detectó {_percent(permanent_water, 2)} de agua permanente; "
                f"Sentinel-2 observó hasta {_percent(sentinel['maximum_monthly_water_fraction'], 2)} en un mes."
            ),
        },
        {
            "constraint_id": "permanent_water_trace",
            "authority": "NASA LP DAAC — NASADEM SWB",
            "source_url": "https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001",
            "action": "warn",
            "state": "evaluated",
            "triggered": 0 < permanent_water <= 0.05,
            "reason": (
                f"NASADEM SWB detectó {_percent(permanent_water, 2)} de agua permanente. "
                "El polígono se conserva, pero el trazado de campaña debe evitar esos píxeles."
            ),
        },
        {
            "constraint_id": "urban_area",
            "authority": "IDE Chile y autoridad territorial competente",
            "source_url": "https://www.ide.cl/",
            "action": "exclude",
            "state": "not_evaluated",
            "triggered": False,
            "reason": "No se intersectó aún con límites urbanos e infraestructura oficial.",
        },
        {
            "constraint_id": "land_access",
            "authority": "Autoridad territorial, propietarios y operadores",
            "source_url": "https://www.ide.cl/",
            "action": "review",
            "state": "not_evaluated",
            "triggered": False,
            "reason": "Propiedad, accesos, seguridad y permisos requieren verificación humana.",
        },
        {
            "constraint_id": "field_scale_slope",
            "authority": "Equipo de campaña de rover",
            "source_url": "https://lpdaac.usgs.gov/documents/2237/NASADEM_User_Guide_V13.pdf",
            "action": "review",
            "state": "not_evaluated",
            "triggered": False,
            "reason": "NASADEM a 30 m no detecta obstáculos ni pendientes a escala de rueda.",
        },
    ]


def _nasadem_inventory(config: dict) -> tuple[dict, dict[str, dict]]:
    path = ROOT / config["nasadem"]["inventory_file"]
    if not path.exists():
        raise FileNotFoundError("Falta el inventario Earthdata; ejecuta pipelines.fetch_precision_data")
    inventory = json.loads(path.read_text(encoding="utf-8"))
    by_filename: dict[str, dict] = {}
    for site in inventory["sites"].values():
        for granule in site["nasadem"]:
            by_filename[granule["filename"]] = granule
    return inventory, by_filename


def _dataset_manifest(config: dict, summary_text: str, power_points: dict,
                      nasadem_records: dict[str, dict]) -> list[dict]:
    copernicus_path = ROOT / config["copernicus"]["file"]
    inventory_path = ROOT / config["nasadem"]["inventory_file"]
    power_path = ROOT / config["power"]["file"]
    datasets = [
        {
            "dataset_id": "nasa-pds-mola-meg128-jezero-v1",
            "provider": "NASA Planetary Data System — Geosciences Node",
            "product": "MGS MOLA MEGDR topography, MEGT44N000HB",
            "collection_version": "MGS-M-MOLA-5-MEGDR-L3-V1 / PDS4 maintained bundle",
            "landing_url": "https://pds-geosciences.wustl.edu/missions/mgs/megdr.html",
            "access_url": config["mola"]["url"],
            "downloaded_at": config["created_at"],
            "time_start": None,
            "time_end": None,
            "spatial_resolution": "128 píxeles/grado; ~463 m/píxel en latitud",
            "temporal_resolution": "mosaico de misión",
            "crs": "Mars simple cylindrical, planetocentric",
            "units": "metros sobre areoide",
            "license": "NASA PDS open data; atribución a MOLA y PDS",
            "checksum": _sha256(ROOT / config["mola"]["file"]),
            "nodata": -32768,
            "quality_notes": ["Ventana regional alrededor de Jezero; no modela obstáculos a escala de rueda."],
            "transformations": ["Subconjunto regional", "métricas topográficas a escala planetaria"],
        },
        {
            "dataset_id": "copernicus-sentinel2-l2a-surface-2025-v1",
            "provider": "Copernicus Data Space Ecosystem — Sentinel Hub",
            "product": "Sentinel-2 L2A Statistical API: SCL, NDVI y BSI",
            "collection_version": "sentinel-2-l2a / analogos-s2-surface-v1",
            "landing_url": "https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html",
            "access_url": config["copernicus"]["statistics_url"],
            "downloaded_at": config["created_at"],
            "time_start": config["copernicus"]["time_start"],
            "time_end": config["copernicus"]["time_end"],
            "spatial_resolution": "0,0003° nominal (~30 m)",
            "temporal_resolution": "mosaicos mensuales de menor nubosidad",
            "crs": "OGC CRS84",
            "units": "fracciones 0–1 e índices adimensionales",
            "license": "Modified Copernicus Sentinel data 2025 / Sentinel Hub",
            "checksum": _sha256(copernicus_path),
            "nodata": 0,
            "quality_notes": [
                "Se excluyen SCL no-data, saturado, sombra, nubes, cirrus, no clasificado y nieve.",
                "SCL clase 5 no distingue mineralogía, suelo consolidado ni infraestructura.",
            ],
            "transformations": ["12 intervalos mensuales", "mediana temporal", "SCL clase 5", "NDVI", "BSI"],
        },
        {
            "dataset_id": "nasa-earthdata-hls-s30-inventory-2025-v1",
            "provider": "NASA LP DAAC / Earthdata CMR",
            "product": "HLS Sentinel-2 Surface Reflectance Daily Global 30m v2.0 — inventario",
            "collection_version": "HLSS30 v2.0",
            "landing_url": "https://doi.org/10.5067/HLS/HLSS30.002",
            "access_url": "https://cmr.earthdata.nasa.gov/search/granules.json?short_name=HLSS30&version=2.0",
            "downloaded_at": config["created_at"],
            "time_start": "2025-01-01T00:00:00Z",
            "time_end": "2025-12-31T23:59:59Z",
            "spatial_resolution": "30 m",
            "temporal_resolution": "granules disponibles durante 2025",
            "crs": "MGRS/UTM por tile",
            "units": "metadatos de inventario; no entra al score",
            "license": "NASA open data; citar HLS y LP DAAC",
            "checksum": _sha256(inventory_path),
            "nodata": None,
            "quality_notes": ["Se valida disponibilidad de fuente NASA independiente; no se mezclan sus píxeles con Sentinel-2 en v2."],
            "transformations": ["Búsqueda CMR por AOI y periodo", "conteo de granules"],
        },
        {
            "dataset_id": "nasa-power-climatology-points-v1",
            "provider": "NASA POWER",
            "product": "Climatology Point API: PRECTOTCORR, TS, TS_MAX, TS_MIN",
            "collection_version": "API " + next(iter(power_points.values()))["response"]["header"]["api"]["version"],
            "landing_url": "https://power.larc.nasa.gov/docs/services/api/temporal/climatology/",
            "access_url": config["power"]["endpoint"],
            "downloaded_at": config["created_at"],
            "time_start": "2001-01-01T00:00:00Z",
            "time_end": "2025-12-31T23:59:59Z",
            "spatial_resolution": "celda climática regional más cercana",
            "temporal_resolution": "climatología mensual y anual de 25 años",
            "crs": "EPSG:4326",
            "units": "mm/día y °C",
            "license": "NASA open data; citar NASA POWER",
            "checksum": _sha256(power_path),
            "nodata": -999,
            "quality_notes": ["Contexto regional; no es una medición local de terreno."],
            "transformations": ["PRECTOTCORR ANN × 365,25", "TS_MAX ANN − TS_MIN ANN"],
        },
    ]

    directory = ROOT / config["nasadem"]["directory"]
    for filename in sorted(nasadem_records):
        record = nasadem_records[filename]
        archive = directory / filename
        datasets.append({
            "dataset_id": f"nasadem-{filename.removeprefix('NASADEM_HGT_').removesuffix('.zip')}-v1",
            "provider": "NASA LP DAAC vía Earthdata Login",
            "product": filename.removesuffix(".zip"),
            "collection_version": "NASADEM_HGT.001",
            "landing_url": config["nasadem"]["landing_url"],
            "access_url": record["data_links"][0],
            "downloaded_at": config["created_at"],
            "time_start": None,
            "time_end": None,
            "spatial_resolution": "1 arc-second (~30 m)",
            "temporal_resolution": "mosaico de misión",
            "crs": "EPSG:4326; alturas EGM96",
            "units": "metros y máscara agua 0/255",
            "license": "NASA open data; citar NASADEM y LP DAAC",
            "checksum": _sha256(archive),
            "nodata": None,
            "quality_notes": ["DEM void-filled; SWB 0=tierra y 255=agua según el User Guide NASADEM."],
            "transformations": ["Mosaico multitesela", "recorte 0,2°", "agregación 16×16", "métricas topográficas"],
        })

    datasets.extend([
        {
            "dataset_id": "natural-earth-admin0-50m",
            "provider": "Natural Earth",
            "product": "Admin 0 — Countries 1:50m",
            "collection_version": "world-atlas 2.0.2",
            "landing_url": "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/",
            "access_url": "https://www.npmjs.com/package/world-atlas",
            "downloaded_at": config["created_at"],
            "time_start": None,
            "time_end": None,
            "spatial_resolution": "1:50.000.000",
            "temporal_resolution": "estático",
            "crs": "EPSG:4326",
            "units": "grados",
            "license": "Dominio público",
            "checksum": _sha256(OUTLINE),
            "nodata": None,
            "quality_notes": ["Solo contexto visual; no es límite oficial ni entra al score."],
            "transformations": ["Extracción de Chile desde world-atlas"],
        },
        {
            "dataset_id": "derived-mola-nasadem-sentinel2-v2",
            "provider": "AnalogOS Chile",
            "product": "Métricas topográficas, espectrales y climáticas derivadas",
            "collection_version": config["snapshot_version"],
            "landing_url": "urn:analogos:science-screening-v2",
            "access_url": "urn:analogos:science-screening-v2:analysis-summary",
            "downloaded_at": config["created_at"],
            "time_start": None,
            "time_end": None,
            "spatial_resolution": "~30 m superficie; ~460–480 m comparación topográfica",
            "temporal_resolution": "snapshot",
            "crs": "mixto; ver fuentes",
            "units": "m, grados, fracciones, índices, mm/año y °C",
            "license": "Código MIT; datos conservan licencias de origen",
            "checksum": "sha256:" + hashlib.sha256(summary_text.encode("utf-8")).hexdigest(),
            "nodata": None,
            "quality_notes": ["Screening reproducible; geología y tres restricciones territoriales siguen pendientes."],
            "transformations": ["Mosaico", "agregación espacial", "medianas temporales", "media geométrica", "sensibilidad ±20 %"],
        },
    ])
    return datasets


V2_DATASETS = {
    "derived": "derived-mola-nasadem-sentinel2-v2",
    "sentinel2": "copernicus-sentinel2-l2a-surface-2025-v1",
    "power": "nasa-power-climatology-points-v1",
}
V2_GEOLOGY_NOTE = "Requiere cartografía SERNAGEOMIN y revisión geológica experta; permanece fuera del score v2."


def score_inputs(earth: dict, sentinel: dict, climate: dict, mola: dict,
                 datasets: dict = V2_DATASETS, geology_note: str = V2_GEOLOGY_NOTE) -> dict:
    """Entradas por criterio para ``aggregate``; mismas fórmulas en v2 y v3.

    Las calidades fijas (0,93 / 0,91 / 0,60) son valores asignados por tipo de
    fuente en ADR-003, no incertidumbres medidas. La topográfica se multiplica
    por la cobertura NASADEM válida (1,0 en todos los sitios v2).
    """
    coverage = earth["source_valid_fraction"]
    return {
        "slope": {
            "raw_value": earth["median_slope_degree"],
            "similarity": _ratio_similarity(earth["median_slope_degree"], mola["median_slope_degree"]),
            "quality": round(0.93 * coverage, 4),
            "dataset_id": datasets["derived"],
            "explanation": "Mediana de pendiente NASADEM mosaico, agregada 16×16 y comparada por razón con MOLA a escala equivalente.",
        },
        "terrain_roughness": {
            "raw_value": earth["median_neighbor_difference_meter"],
            "similarity": _ratio_similarity(earth["median_neighbor_difference_meter"], mola["median_neighbor_difference_meter"]),
            "quality": round(0.91 * coverage, 4),
            "dataset_id": datasets["derived"],
            "explanation": "Diferencia absoluta mediana entre celdas vecinas NASADEM y MOLA a escala aproximadamente equivalente.",
        },
        "local_relief": {
            "raw_value": earth["median_3x3_relief_meter"],
            "similarity": _ratio_similarity(earth["median_3x3_relief_meter"], mola["median_3x3_relief_meter"]),
            "quality": round(0.91 * coverage, 4),
            "dataset_id": datasets["derived"],
            "explanation": "Relieve mediano 3×3 sobre NASADEM agregado comparado con la ventana regional MOLA.",
        },
        "bare_ground_fraction": {
            "raw_value": sentinel["nonvegetated_fraction"],
            "similarity": sentinel["nonvegetated_fraction"],
            "quality": sentinel["quality"],
            "dataset_id": datasets["sentinel2"],
            "explanation": f"Mediana de {sentinel['valid_intervals']} mosaicos mensuales Sentinel-2 L2A: fracción SCL clase 5 dentro de píxeles válidos. La similitud usa directamente la continuidad no vegetada requerida por el perfil de prueba.",
        },
        "aridity_context": {
            "raw_value": climate["annual_precipitation_mm"],
            "similarity": round(1 / (1 + climate["annual_precipitation_mm"] / 25), 6),
            "quality": 0.60,
            "dataset_id": datasets["power"],
            "explanation": "Precipitación climatológica POWER como contexto regional; preferencia decreciente con escala de 25 mm/año heredada del perfil v1.",
        },
        "surface_temperature_variability": {
            "raw_value": climate["skin_temperature_range_c"],
            "similarity": round(min(climate["skin_temperature_range_c"] / 45, 1), 6),
            "quality": 0.60,
            "dataset_id": datasets["power"],
            "explanation": "Proxy regional de estrés térmico: rango climatológico POWER, saturado a 45 °C como en el perfil v1.",
        },
        "geologic_relevance": {
            "raw_value": None,
            "similarity": None,
            "quality": 0.0,
            "status": "needs_calibration",
            "dataset_id": "none",
            "explanation": geology_note,
        },
    }


def build(config_path: Path, profile_path: Path, out_dir: Path) -> dict[str, object]:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    profile = load_profile(profile_path)
    power_path = ROOT / config["power"]["file"]
    copernicus_path = ROOT / config["copernicus"]["file"]
    if not power_path.exists() or not copernicus_path.exists():
        raise FileNotFoundError("Faltan fuentes v2; ejecuta pipelines.fetch_precision_data")
    power_points = json.loads(power_path.read_text(encoding="utf-8"))
    copernicus_raw = json.loads(copernicus_path.read_text(encoding="utf-8"))
    inventory, nasadem_records = _nasadem_inventory(config)
    mola = _mola_reference(config)

    candidates = []
    site_analysis = []
    for site in config["sites"]:
        earth = _nasadem_metrics(site, config)
        sentinel = _sentinel_metrics(site["site_id"], copernicus_raw)
        climate = _power_metrics(site["site_id"], power_points)
        inputs = score_inputs(earth, sentinel, climate, mola)
        aggregation = profile["aggregation"]
        score = aggregate(profile["criteria"], inputs, aggregation["epsilon"], aggregation["minimum_valid_weight"])
        robustness = sensitivity(profile["criteria"], inputs, aggregation["epsilon"], aggregation["minimum_valid_weight"])
        constraints = evaluate_constraints(_constraint_checks(earth, sentinel))
        geometry = _polygon(site)
        hls_count = inventory["sites"][site["site_id"]]["hls"]["granule_count"]
        candidate = {
            "site_id": site["site_id"],
            "name": site["name"],
            "profile_id": profile["id"],
            "profile_version": profile["version"],
            "data_snapshot_version": config["snapshot_version"],
            "pipeline_version": __version__,
            "geometry": geometry,
            "area_km2": _area_km2(geometry),
            "status": "candidate",
            "similarity": score["similarity"],
            "confidence": score["confidence"],
            "feasibility": constraints["feasibility"],
            "stability": robustness["stability"],
            "score_breakdown": score["score_breakdown"],
            "warnings": [
                "SCREENING CIENTÍFICO: prioriza reconocimiento; no aprueba el sitio, no garantiza seguridad y no autoriza acceso.",
                *constraints["warnings"],
            ],
            "limitations": profile["limitations"],
            "field_checks": [
                "Confirmar límites, propiedad, acceso, seguridad y permisos con autoridades y propietarios.",
                "Levantar obstáculos, pendiente y rugosidad a escala centimétrica/decimétrica.",
                "Medir granulometría, cohesión, polvo, hundimiento y tracción del suelo para el rover.",
                "Intersectar cartografía oficial de áreas protegidas, urbano e infraestructura antes de planificar campaña.",
                "Solicitar revisión geológica de las unidades y afloramientos del polígono.",
            ],
            "evidence": [
                {
                    "evidence_id": f"{site['site_id']}-mola",
                    "dataset_id": "nasa-pds-mola-meg128-jezero-v1",
                    "claim": "Referencia marciana: topografía MOLA MEGDR del entorno regional de Jezero.",
                    "source_url": "https://pds-geosciences.wustl.edu/missions/mgs/megdr.html",
                },
                {
                    "evidence_id": f"{site['site_id']}-nasadem",
                    "dataset_id": "derived-mola-nasadem-sentinel2-v2",
                    "claim": f"Topografía terrestre: NASADEM_HGT.001 mosaico de {len(earth['tiles'])} tile(s), agregado a ~{earth['analysis_spacing_meter']:.0f} m.",
                    "source_url": config["nasadem"]["landing_url"],
                },
                {
                    "evidence_id": f"{site['site_id']}-sentinel2",
                    "dataset_id": "copernicus-sentinel2-l2a-surface-2025-v1",
                    "claim": f"Superficie: {_percent(sentinel['nonvegetated_fraction'], 1)} no vegetada, mediana de {sentinel['valid_intervals']} mosaicos mensuales Sentinel-2 L2A de 2025.",
                    "source_url": "https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html",
                },
                {
                    "evidence_id": f"{site['site_id']}-hls-inventory",
                    "dataset_id": "nasa-earthdata-hls-s30-inventory-2025-v1",
                    "claim": f"Disponibilidad NASA independiente: {hls_count} granules HLS Sentinel-2 intersectan el AOI en 2025; se registra como inventario, no entra al score.",
                    "source_url": "https://doi.org/10.5067/HLS/HLSS30.002",
                },
                {
                    "evidence_id": f"{site['site_id']}-power",
                    "dataset_id": "nasa-power-climatology-points-v1",
                    "claim": "Contexto regional: climatología NASA POWER 2001–2025 de precipitación y temperatura superficial.",
                    "source_url": climate["request_url"],
                },
            ],
        }
        validate(candidate, "candidate-site")
        candidates.append(candidate)
        site_analysis.append({
            "site_id": site["site_id"],
            "nasadem": earth,
            "sentinel2": sentinel,
            "hls_granule_count": hls_count,
            "nasa_power": climate,
            "valid_weight": score["valid_weight"],
            "sensitivity": robustness,
        })

    summary = {
        "snapshot_version": config["snapshot_version"],
        "method": "NASADEM mosaico agregado ~480 m vs MOLA ~463 m; Sentinel-2 L2A mensual ~30 m; POWER regional",
        "mola_reference": mola,
        "sites": site_analysis,
    }
    summary_text = _dump(summary)
    manifest = {
        "snapshot_version": config["snapshot_version"],
        "created_at": config["created_at"],
        "pipeline_version": __version__,
        "datasets": _dataset_manifest(config, summary_text, power_points, nasadem_records),
    }
    validate(manifest, "data-manifest")
    return {
        "manifest.json": manifest,
        "mission-profile.json": profile,
        "candidate-details.json": candidates,
        "analysis-summary.json": summary,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--profile", type=Path, default=DEFAULT_PROFILE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    result = build(args.config, args.profile, args.out)
    for name, content in result.items():
        (args.out / name).write_text(_dump(content), encoding="utf-8")
        print(f"escrito {args.out / name}")
    shutil.copyfile(OUTLINE, args.out / "chile-outline.geojson")
    print(f"copiado {args.out / 'chile-outline.geojson'}")
    print("AVISO: snapshot v2 de screening; geología y restricciones territoriales requieren revisión.")


if __name__ == "__main__":
    main()
