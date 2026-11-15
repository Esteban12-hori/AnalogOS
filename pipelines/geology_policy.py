"""Constantes y reglas PURAS del contexto geológico: sin Shapely, numpy, pyproj ni requests.

Las comparten el pipeline, el validador del contrato y el empaquetador. Aquí solo hay política (umbrales
provisionales de ingeniería aprobados por Codex, no un estándar científico), URLs permitidas, el estado de
disponibilidad derivado de fracciones y dos utilidades triviales (hash de petición y bbox exacta).
"""

from __future__ import annotations

import hashlib
import json

AREA_CRS = "EPSG:6933"
CLIP_CRS = "Validez y reparación en lon/lat (CRS84); recorte y superposición en el plano EPSG:6933 (aristas rectas en ese plano)"

REPAIR_ENTITY_RELATIVE_LIMIT = 0.001   # 0,1 % del área recortada de la entidad
REPAIR_TOTAL_AREA_LIMIT = 0.001        # 0,1 % de cambio entre el área TOTAL original y la reparada
REPAIR_AOI_FRACTION_LIMIT = 0.0005     # 0,05 % del área del sector
AREA_FLOOR_M2 = 1e-6                   # por debajo es ruido numérico, no intersección positiva
AVAILABLE_TOLERANCE = 1e-8             # tolerancia numérica para «completo»
SUM_TOLERANCE = 1e-9                   # tolerancia de cierre de la partición
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
    """Estado de evidencia derivado SOLO de las fracciones; nunca de aptitud ni de umbrales de calidad."""
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
    """Bbox exacta (sin redondeo) del polígono del candidato; las coordenadas se conservan tal cual."""
    xs = [p[0] for ring in geometry["coordinates"] for p in ring]
    ys = [p[1] for ring in geometry["coordinates"] for p in ring]
    return [min(xs), min(ys), max(xs), max(ys)]
