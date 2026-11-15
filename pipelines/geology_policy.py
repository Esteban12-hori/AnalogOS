"""PURE geological context constants and rules: no Shapely, numpy, pyproj or requests.

Shared by the pipeline, contract validator and packager. This module contains policy (provisional
engineering thresholds approved by Codex, not a scientific standard), permitted URLs, availability
derived from area fractions, and two small utilities: request hashing and exact bounding boxes.
"""

from __future__ import annotations

import hashlib
import json

AREA_CRS = "EPSG:6933"
# Frozen Spanish metadata: these literals are part of the stored geological package.
# English display translations must not change the canonical source values.
CLIP_CRS = "Validez y reparación en lon/lat (CRS84); recorte y superposición en el plano EPSG:6933 (aristas rectas en ese plano)"

REPAIR_ENTITY_RELATIVE_LIMIT = 0.001   # 0.1% of the clipped feature area
REPAIR_TOTAL_AREA_LIMIT = 0.001        # 0.1% change between the original and repaired TOTAL area
REPAIR_AOI_FRACTION_LIMIT = 0.0005     # 0.05% of the sector area
AREA_FLOOR_M2 = 1e-6                   # below this is numerical noise, not a positive intersection
AVAILABLE_TOLERANCE = 1e-8             # numerical tolerance for complete coverage
SUM_TOLERANCE = 1e-9                   # tolerance for closure of the area partition
FRACTION_DECIMALS = 15

POLICY = {
    "area_crs": AREA_CRS,
    "clip_space": CLIP_CRS,
    "repair_entity_relative_limit": REPAIR_ENTITY_RELATIVE_LIMIT,
    "repair_aoi_fraction_limit": REPAIR_AOI_FRACTION_LIMIT,
    "repair_total_area_relative_limit": REPAIR_TOTAL_AREA_LIMIT,
    "repair_methods_compared": ["make_valid", "buffer(0)"],
    "area_floor_m2": AREA_FLOOR_M2,
    "available_tolerance": AVAILABLE_TOLERANCE,
    "sum_tolerance": SUM_TOLERANCE,
    "provisional": True,
    "note": "Umbrales de ingeniería provisionales aprobados por Codex; no son un estándar científico.",
}

ALLOWED_HOSTS = frozenset({"lineasdebasepublicas.mma.gob.cl", "sigam.segemar.gov.ar"})
CKAN_PAGE = "https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/geologia-base"
CKAN_URL = "https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/api/3/action/package_show?id=geologia-base"
WFS_BASE = "https://sigam.segemar.gov.ar/geoserver217/ows"
WFS_LAYER = "sigam:e250K_UnidadGeologica"
WFS_PAGE = "https://sigam.segemar.gov.ar/sigam/geoservicios/"
WFS_MAX_FEATURES = 2000


def availability(fractions: dict) -> str:
    """Evidence availability derived ONLY from area fractions; never suitability or quality thresholds."""
    covered, unusable = fractions["covered_total"], fractions["unusable_upper_bound"]
    if covered == 0:
        return "no_coverage" if unusable == 0 else "unavailable"
    complete = (
        fractions["unmapped"] <= AVAILABLE_TOLERANCE
        and fractions["covered_ambiguous"] <= AVAILABLE_TOLERANCE
        and unusable == 0
        and fractions["covered_by_units_without_description"] <= AVAILABLE_TOLERANCE
    )
    return "available" if complete else "partial"


def request_digest(request: dict) -> str:
    return hashlib.sha256(json.dumps(request, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def aoi_bounds(geometry: dict) -> list[float]:
    """Exact bounding box of the candidate polygon, without rounding; coordinates are preserved unchanged."""
    xs = [p[0] for ring in geometry["coordinates"] for p in ring]
    ys = [p[1] for ring in geometry["coordinates"] for p in ring]
    return [min(xs), min(ys), max(xs), max(ys)]
