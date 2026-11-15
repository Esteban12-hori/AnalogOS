"""Builds the preliminary science snapshot using MOLA, SRTM, and NASA POWER.

The topographic comparison matches scales: SRTM 30 m is aggregated to ~480 m and
compared with MOLA MEGDR 128 pixels/degree (~463 m on Mars). The output is a
reproducible screening, not an authorization or a wheel-scale assessment.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import shutil
from pathlib import Path

import numpy as np
from pyproj import Geod

from pipelines import __version__
from pipelines.constraints import evaluate_constraints
from pipelines.contracts import ROOT, load_profile, validate
from pipelines.scoring import aggregate, sensitivity

DEFAULT_CONFIG = ROOT / "config" / "science_snapshot_v1.json"
DEFAULT_PROFILE = ROOT / "config" / "mission_profiles" / "mars-rover-screening-v1.json"
DEFAULT_OUT = ROOT / "artifacts" / "science-v1"
OUTLINE = ROOT / "artifacts" / "demo" / "chile-outline.geojson"
_GEOD = Geod(ellps="WGS84")


def _dump(content: object) -> str:
    return json.dumps(content, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return "sha256:" + digest.hexdigest()


def _area_km2(geometry: dict) -> float:
    ring = geometry["coordinates"][0]
    area, _ = _GEOD.polygon_area_perimeter([point[0] for point in ring], [point[1] for point in ring])
    return round(abs(area) / 1e6, 1)


def _polygon(site: dict) -> dict:
    half = site["half_size_degree"]
    lon, lat = site["longitude"], site["latitude"]
    return {
        "type": "Polygon",
        "coordinates": [[
            [lon - half, lat - half], [lon + half, lat - half],
            [lon + half, lat + half], [lon - half, lat + half],
            [lon - half, lat - half],
        ]],
    }


def _terrain_metrics(elevation: np.ndarray, spacing_x_m: float, spacing_y_m: float) -> dict:
    if elevation.shape[0] < 5 or elevation.shape[1] < 5:
        raise ValueError("Topographic window too small")
    dy, dx = np.gradient(elevation, spacing_y_m, spacing_x_m)
    slope = np.degrees(np.arctan(np.hypot(dx, dy)))
    differences = np.concatenate([
        np.abs(np.diff(elevation, axis=0)).ravel(),
        np.abs(np.diff(elevation, axis=1)).ravel(),
    ])
    neighborhoods = np.stack([
        elevation[row: elevation.shape[0] - 2 + row, col: elevation.shape[1] - 2 + col]
        for row in range(3) for col in range(3)
    ])
    local_relief = np.nanmax(neighborhoods, axis=0) - np.nanmin(neighborhoods, axis=0)
    return {
        "median_slope_degree": round(float(np.nanmedian(slope)), 3),
        "median_neighbor_difference_meter": round(float(np.nanmedian(differences)), 3),
        "median_3x3_relief_meter": round(float(np.nanmedian(local_relief)), 3),
        "valid_fraction": round(float(np.count_nonzero(np.isfinite(elevation)) / elevation.size), 4),
        "elevation_p05_meter": round(float(np.nanpercentile(elevation, 5)), 1),
        "elevation_p95_meter": round(float(np.nanpercentile(elevation, 95)), 1),
    }


def _mola_reference(config: dict) -> dict:
    mola = config["mola"]
    path = ROOT / mola["file"]
    if not path.exists() or path.stat().st_size != mola["expected_bytes"]:
        raise FileNotFoundError("MOLA is missing or its size does not match; run pipelines.fetch_science_data")
    data = np.memmap(path, dtype=">i2", mode="r", shape=(mola["lines"], mola["samples"]))
    ref = mola["reference"]
    half = ref["half_size_degree"]
    north, west, ppd = mola["north"], mola["west"], mola["pixels_per_degree"]
    row_start = round((north - (ref["latitude"] + half)) * ppd)
    row_end = round((north - (ref["latitude"] - half)) * ppd)
    col_start = round(((ref["longitude"] - half) - west) * ppd)
    col_end = round(((ref["longitude"] + half) - west) * ppd)
    subset = np.asarray(data[row_start:row_end, col_start:col_end], dtype=np.float64)
    subset[subset <= -32768] = np.nan
    mars_radius_m = 3_396_000.0
    spacing_y = math.pi * mars_radius_m / 180 / ppd
    spacing_x = spacing_y * math.cos(math.radians(ref["latitude"]))
    return {
        "name": ref["name"],
        "center": [ref["longitude"], ref["latitude"]],
        "window_degree": half * 2,
        "nominal_spacing_meter": round((spacing_x + spacing_y) / 2, 1),
        **_terrain_metrics(subset, spacing_x, spacing_y),
    }


def _tile_origin(tile: str) -> tuple[float, float]:
    latitude = int(tile[1:3]) * (-1 if tile[0] == "S" else 1)
    longitude = int(tile[4:7]) * (-1 if tile[3] == "W" else 1)
    return latitude, longitude


def _block_mean(values: np.ndarray, factor: int) -> np.ndarray:
    height = values.shape[0] // factor * factor
    width = values.shape[1] // factor * factor
    trimmed = values[:height, :width]
    return np.nanmean(trimmed.reshape(height // factor, factor, width // factor, factor), axis=(1, 3))


def _srtm_metrics(site: dict) -> dict:
    tile = site["srtm_tile"]
    path = ROOT / "data" / "raw" / "srtm" / f"{tile}.hgt.gz"
    with gzip.open(path, "rb") as source:
        raw = source.read()
    values = np.frombuffer(raw, dtype=">i2")
    side = math.isqrt(values.size)
    if side * side != values.size:
        raise ValueError(f"Invalid HGT dimension in {path}")
    values = values.reshape((side, side)).astype(np.float64)
    values[values <= -32768] = np.nan

    south, west = _tile_origin(tile)
    north = south + 1
    half = site["half_size_degree"]
    min_lat, max_lat = site["latitude"] - half, site["latitude"] + half
    min_lon, max_lon = site["longitude"] - half, site["longitude"] + half
    cells = side - 1
    row_start = max(0, round((north - max_lat) * cells))
    row_end = min(side, round((north - min_lat) * cells) + 1)
    col_start = max(0, round((min_lon - west) * cells))
    col_end = min(side, round((max_lon - west) * cells) + 1)
    subset = values[row_start:row_end, col_start:col_end]
    aggregated = _block_mean(subset, 16)
    spacing_y = math.pi * 6_371_008.8 / 180 / cells * 16
    spacing_x = spacing_y * math.cos(math.radians(site["latitude"]))
    return {
        "tile": tile,
        "center": [site["longitude"], site["latitude"]],
        "window_degree": half * 2,
        "source_spacing_meter": round((spacing_x + spacing_y) / 32, 1),
        "analysis_spacing_meter": round((spacing_x + spacing_y) / 2, 1),
        **_terrain_metrics(aggregated, spacing_x, spacing_y),
    }


def _ratio_similarity(value: float, target: float) -> float:
    if value <= 0 and target <= 0:
        return 1.0
    if value <= 0 or target <= 0:
        return 0.0
    return round(min(value, target) / max(value, target), 6)


def _power_metrics(site_id: str, power_points: dict) -> dict:
    response = power_points[site_id]["response"]
    parameters = response["properties"]["parameter"]
    precipitation = float(parameters["PRECTOTCORR"]["ANN"]) * 365.25
    thermal_range = float(parameters["TS_MAX"]["ANN"]) - float(parameters["TS_MIN"]["ANN"])
    return {
        "annual_precipitation_mm": round(precipitation, 2),
        "skin_temperature_range_c": round(thermal_range, 2),
        "skin_temperature_mean_c": float(parameters["TS"]["ANN"]),
        "period": response["header"]["range"],
        "api_version": response["header"]["api"]["version"],
        "request_url": power_points[site_id]["request_url"],
    }


def _constraint_checks() -> list[dict]:
    source = "https://www.ide.cl/"
    return [
        {
            "constraint_id": constraint_id,
            "authority": "IDE Chile y autoridad territorial competente",
            "source_url": source,
            "action": action,
            "state": "not_evaluated",
            "triggered": False,
            "reason": reason,
        }
        for constraint_id, action, reason in (
            ("protected_or_sensitive_area", "exclude", "No se intersectó aún con áreas protegidas o sensibles."),
            ("permanent_water", "exclude", "No se intersectó aún con cuerpos de agua permanentes."),
            ("urban_area", "exclude", "No se intersectó aún con zonas urbanas o infraestructura."),
            ("land_access", "review", "Propiedad, accesos y permisos requieren verificación humana."),
            ("field_scale_slope", "review", "SRTM agregado no detecta obstáculos ni pendientes a escala de rueda."),
        )
    ]


def build(config_path: Path, profile_path: Path, out_dir: Path) -> dict[str, object]:
    config = json.loads(config_path.read_text("utf-8"))
    profile = load_profile(profile_path)
    power_path = ROOT / config["power"]["file"]
    if not power_path.exists():
        raise FileNotFoundError("NASA POWER responses are missing; run pipelines.fetch_science_data")
    power_points = json.loads(power_path.read_text("utf-8"))
    mola = _mola_reference(config)

    site_analysis = []
    candidates = []
    for site in config["sites"]:
        earth = _srtm_metrics(site)
        climate = _power_metrics(site["site_id"], power_points)
        topography_dataset = "derived-srtm-mola-scale-matched-v1"
        inputs = {
            "slope": {
                "raw_value": earth["median_slope_degree"],
                "similarity": _ratio_similarity(earth["median_slope_degree"], mola["median_slope_degree"]),
                "quality": 0.90,
                "dataset_id": topography_dataset,
                "explanation": "Mediana de pendiente SRTM agregada a ~480 m comparada por razón con la mediana MOLA del entorno de Jezero.",
            },
            "terrain_roughness": {
                "raw_value": earth["median_neighbor_difference_meter"],
                "similarity": _ratio_similarity(earth["median_neighbor_difference_meter"], mola["median_neighbor_difference_meter"]),
                "quality": 0.88,
                "dataset_id": topography_dataset,
                "explanation": "Diferencia absoluta mediana entre celdas vecinas, calculada a escala aproximadamente equivalente en Tierra y Marte.",
            },
            "local_relief": {
                "raw_value": earth["median_3x3_relief_meter"],
                "similarity": _ratio_similarity(earth["median_3x3_relief_meter"], mola["median_3x3_relief_meter"]),
                "quality": 0.88,
                "dataset_id": topography_dataset,
                "explanation": "Relieve local mediano en ventanas 3×3 a ~480 m, comparado con la referencia MOLA regional.",
            },
            "bare_ground_fraction": {
                "raw_value": None, "similarity": None, "quality": 0.0,
                "status": "missing", "dataset_id": "none",
                "explanation": "No se incorporó una clasificación óptica defendible al snapshot v1; el criterio queda fuera del score.",
            },
            "aridity_context": {
                "raw_value": climate["annual_precipitation_mm"],
                "similarity": round(1 / (1 + climate["annual_precipitation_mm"] / 25), 6),
                "quality": 0.60,
                "dataset_id": "nasa-power-climatology-points-v1",
                "explanation": "Precipitación climatológica POWER; preferencia de screening decreciente con escala de 25 mm/año. Es contexto regional, no medición local.",
            },
            "surface_temperature_variability": {
                "raw_value": climate["skin_temperature_range_c"],
                "similarity": round(min(climate["skin_temperature_range_c"] / 45, 1), 6),
                "quality": 0.60,
                "dataset_id": "nasa-power-climatology-points-v1",
                "explanation": "Proxy de estrés térmico: rango climatológico de temperatura de piel POWER, con preferencia saturada a 45 °C.",
            },
            "geologic_relevance": {
                "raw_value": None, "similarity": None, "quality": 0.0,
                "status": "needs_calibration", "dataset_id": "none",
                "explanation": "Requiere cartografía SERNAGEOMIN y revisión geológica experta; queda fuera del score v1.",
            },
        }
        aggregation = profile["aggregation"]
        score = aggregate(profile["criteria"], inputs, aggregation["epsilon"], aggregation["minimum_valid_weight"])
        robustness = sensitivity(profile["criteria"], inputs, aggregation["epsilon"], aggregation["minimum_valid_weight"])
        constraints = evaluate_constraints(_constraint_checks())
        geometry = _polygon(site)
        warnings = [
            "SCREENING PRELIMINAR: el score prioriza investigación; no aprueba el sitio ni autoriza acceso.",
            *constraints["warnings"],
        ]
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
            "warnings": warnings,
            "limitations": profile["limitations"],
            "field_checks": [
                "Confirmar límites, propiedad, acceso y permisos con autoridades y propietarios.",
                "Levantar obstáculos, pendiente y rugosidad a escala centimétrica/decimétrica en terreno.",
                "Verificar mecánica de suelo, polvo, cohesión y riesgo de hundimiento para el rover.",
                "Revisar áreas sensibles, agua, infraestructura y restricciones operacionales antes de planificar una prueba.",
            ],
            "evidence": [
                {
                    "evidence_id": f"{site['site_id']}-mola",
                    "dataset_id": "nasa-pds-mola-meg128-jezero-v1",
                    "claim": "Referencia planetaria: topografía MOLA MEGDR del entorno regional de Jezero a 128 píxeles/grado.",
                    "source_url": "https://pds-geosciences.wustl.edu/missions/mgs/megdr.html",
                },
                {
                    "evidence_id": f"{site['site_id']}-srtm",
                    "dataset_id": f"srtm-{site['srtm_tile'].lower()}-v1",
                    "claim": f"Relieve terrestre: SRTM 1 arc-second, tile {site['srtm_tile']}, agregado a ~480 m para comparar escalas.",
                    "source_url": "https://www.earthdata.nasa.gov/data/instruments/srtm",
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
            "site_id": site["site_id"], "srtm": earth, "nasa_power": climate,
            "valid_weight": score["valid_weight"],
            "sensitivity": robustness,
        })

    summary = {
        "snapshot_version": config["snapshot_version"],
        "method": "SRTM agregado ~480 m vs MOLA MEGDR ~463 m; POWER como contexto regional",
        "mola_reference": mola,
        "sites": site_analysis,
    }
    summary_text = _dump(summary)

    datasets = [
        {
            "dataset_id": "nasa-pds-mola-meg128-jezero-v1",
            "provider": "NASA Planetary Data System — Geosciences Node",
            "product": "MGS MOLA MEGDR topography, MEGT44N000HB",
            "collection_version": "MGS-M-MOLA-5-MEGDR-L3-V1 / PDS4 maintained bundle",
            "landing_url": "https://pds-geosciences.wustl.edu/missions/mgs/megdr.html",
            "access_url": config["mola"]["url"],
            "downloaded_at": config["created_at"],
            "time_start": None, "time_end": None,
            "spatial_resolution": "128 píxeles/grado; ~463 m/píxel en latitud",
            "temporal_resolution": "mosaico de misión",
            "crs": "Mars simple cylindrical, planetocentric",
            "units": "metros sobre areoide",
            "license": "NASA PDS open data; atribución al instrumento MOLA y PDS",
            "checksum": _sha256(ROOT / config["mola"]["file"]),
            "nodata": -32768,
            "quality_notes": ["Se usa una ventana regional de 1,6° alrededor de Jezero; no modela obstáculos a escala de rueda."],
            "transformations": ["Subconjunto regional", "métricas de pendiente, diferencia vecina y relieve 3×3"],
        },
        {
            "dataset_id": "nasa-power-climatology-points-v1",
            "provider": "NASA POWER",
            "product": "Climatology Point API: PRECTOTCORR, TS, TS_MAX, TS_MIN",
            "collection_version": "API " + next(iter(power_points.values()))["response"]["header"]["api"]["version"],
            "landing_url": "https://power.larc.nasa.gov/docs/services/api/temporal/climatology/",
            "access_url": config["power"]["endpoint"],
            "downloaded_at": config["created_at"],
            "time_start": "2001-01-01T00:00:00Z", "time_end": "2025-12-31T23:59:59Z",
            "spatial_resolution": "resolución nativa de la fuente POWER; punto = celda más cercana",
            "temporal_resolution": "climatología mensual y anual de 25 años",
            "crs": "EPSG:4326", "units": "mm/día y °C",
            "license": "NASA open data; citar NASA POWER",
            "checksum": _sha256(power_path), "nodata": -999,
            "quality_notes": ["Contexto regional; no debe interpretarse como medición de sitio."],
            "transformations": ["PRECTOTCORR ANN × 365,25", "TS_MAX ANN − TS_MIN ANN"],
        },
    ]
    for site in config["sites"]:
        tile_path = ROOT / "data" / "raw" / "srtm" / f"{site['srtm_tile']}.hgt.gz"
        datasets.append({
            "dataset_id": f"srtm-{site['srtm_tile'].lower()}-v1",
            "provider": "NASA SRTM, redistribuido por AWS Terrain Tiles",
            "product": f"SRTM HGT 1 arc-second {site['srtm_tile']}",
            "collection_version": "SRTMGL1 / AWS terrain tiles",
            "landing_url": "https://www.earthdata.nasa.gov/data/instruments/srtm",
            "access_url": f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{site['srtm_tile'][:3]}/{site['srtm_tile']}.hgt.gz",
            "downloaded_at": config["created_at"], "time_start": None, "time_end": None,
            "spatial_resolution": "1 arc-second (~30 m)", "temporal_resolution": "mosaico de misión 2000",
            "crs": "EPSG:4326", "units": "metros", "license": "NASA open data / AWS Open Data",
            "checksum": _sha256(tile_path), "nodata": -32768,
            "quality_notes": ["Resolución agregada 16×16 para análisis comparable con MOLA."],
            "transformations": ["Recorte de 0,2°", "media de bloques 16×16", "métricas topográficas"],
        })
    datasets.extend([
        {
            "dataset_id": "natural-earth-admin0-50m",
            "provider": "Natural Earth", "product": "Admin 0 — Countries 1:50m",
            "collection_version": "world-atlas 2.0.2",
            "landing_url": "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/",
            "access_url": "https://www.npmjs.com/package/world-atlas",
            "downloaded_at": config["created_at"], "time_start": None, "time_end": None,
            "spatial_resolution": "1:50.000.000", "temporal_resolution": "estático",
            "crs": "EPSG:4326", "units": "grados", "license": "Dominio público",
            "checksum": _sha256(OUTLINE), "nodata": None,
            "quality_notes": ["Solo contexto visual; no es límite oficial ni entra al score."],
            "transformations": ["Extracción de Chile desde world-atlas"],
        },
        {
            "dataset_id": "derived-srtm-mola-scale-matched-v1",
            "provider": "AnalogOS Chile", "product": "Métricas topográficas y climáticas derivadas",
            "collection_version": config["snapshot_version"],
            "landing_url": "urn:analogos:science-screening-v1",
            "access_url": "urn:analogos:science-screening-v1:analysis-summary",
            "downloaded_at": config["created_at"], "time_start": None, "time_end": None,
            "spatial_resolution": "~460–480 m para comparación topográfica",
            "temporal_resolution": "snapshot", "crs": "mixto; ver fuentes", "units": "m, grados, mm/año, °C",
            "license": "Código MIT; datos conservan licencias de origen",
            "checksum": "sha256:" + hashlib.sha256(summary_text.encode("utf-8")).hexdigest(),
            "nodata": None,
            "quality_notes": ["Screening preliminar; dos criterios permanecen fuera del score."],
            "transformations": ["Agregación espacial", "estadísticos robustos", "media geométrica ponderada", "sensibilidad ±20 %"],
        },
    ])
    manifest = {
        "snapshot_version": config["snapshot_version"],
        "created_at": config["created_at"],
        "pipeline_version": __version__,
        "datasets": datasets,
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
        (args.out / name).write_text(_dump(content), "utf-8")
        print(f"wrote {args.out / name}")
    shutil.copyfile(OUTLINE, args.out / "chile-outline.geojson")
    print(f"copied {args.out / 'chile-outline.geojson'}")
    print("WARNING: preliminary scientific screening; requires field validation and constraint checks.")


if __name__ == "__main__":
    main()
