"""Geological coverage per sector: clipping, conservative repair and area partitioning.

Pure logic (no network). Validity and repair are evaluated on the original lon/lat coordinates
(CRS84). Afterwards the vertices are projected to EPSG:6933 (Lambert cylindrical equal-area) and ALL the
overlay (clipping, dissolve, overlaps, gaps) is done in that plane, with straight edges in it. This way
areas are additive: operating in degrees and measuring in the plane produced discrepancies of ~1e-7 of the sector
because a straight edge in lon/lat is not straight after projection. No fraction is renormalized: without
coverage + unambiguous cover + ambiguous + unusable zone add up to 1 only if the geometry does so,
and the contract checks it with a tolerance.

The repair and availability thresholds are provisional engineering criteria approved by
Codex for this version; they are not a scientific standard and do not validate the cartography.
"""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass

import numpy as np
import shapely
from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon, box, shape
from shapely.ops import unary_union
from shapely.validation import explain_validity

from pipelines.geology_policy import (  # noqa: F401  (re-exported: the policy lives in geology_policy)
    AREA_CRS, AREA_FLOOR_M2, AVAILABLE_TOLERANCE, CLIP_CRS, FRACTION_DECIMALS, POLICY, REPAIR_AOI_FRACTION_LIMIT,
    REPAIR_ENTITY_RELATIVE_LIMIT, REPAIR_TOTAL_AREA_LIMIT, SUM_TOLERANCE, availability,
)

_TO_AREA = Transformer.from_crs(4326, 6933, always_xy=True).transform

class GeologyError(ValueError):
    """The data or the geometry do not allow building a reliable result."""


@dataclass(frozen=True)
class Feature:
    feature_id: str
    properties: dict
    geometry: object  # shapely, unmodified


@dataclass(frozen=True)
class LayerConfig:
    """Unit identity and descriptive fields of a layer; it does not classify lithologies."""
    source_id: str
    identity_fields: tuple[str, ...]
    code_field: str
    name_field: str
    description_field: str
    sheet_field: str | None = None


def processing_versions() -> dict:
    import pyproj
    return {"shapely": shapely.__version__, "geos": shapely.geos_version_string, "pyproj": pyproj.__version__}


def project(geometry):
    """Lon/lat vertices -> EPSG:6933. plane. Edges become straight in the plane."""
    return geometry if geometry.is_empty else shapely.transform(geometry, _project)


def area_m2(planar_geometry) -> float:
    """Area (m²) of a geometry ALREADY projected to the equal-area plane."""
    if planar_geometry is None or planar_geometry.is_empty:
        return 0.0
    return float(planar_geometry.area)


def _project(coords):
    x, y = _TO_AREA(coords[:, 0], coords[:, 1])
    return np.column_stack((x, y))


def polygonal(geometry):
    """Only the parts of dimension 2; no lines or contact points."""
    if geometry is None or geometry.is_empty:
        return Polygon()
    if isinstance(geometry, (Polygon, MultiPolygon)):
        return geometry
    if isinstance(geometry, GeometryCollection):
        parts = [part for part in geometry.geoms if isinstance(part, (Polygon, MultiPolygon))]
        return unary_union(parts) if parts else Polygon()
    return Polygon()


def _discarded(geometry) -> list[dict]:
    if isinstance(geometry, GeometryCollection):
        counts: dict[str, int] = {}
        for part in geometry.geoms:
            if not isinstance(part, (Polygon, MultiPolygon)):
                counts[part.geom_type] = counts.get(part.geom_type, 0) + 1
        return [{"type": name, "count": counts[name]} for name in sorted(counts)]
    return [] if isinstance(geometry, (Polygon, MultiPolygon)) else [{"type": geometry.geom_type, "count": 1}]


def _usable(geometry) -> bool:
    return isinstance(geometry, (Polygon, MultiPolygon)) and geometry.is_valid and not geometry.is_empty


def _check_position(position, where: str) -> None:
    if not isinstance(position, (list, tuple)) or len(position) != 2 or not all(
        isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in position
    ):
        raise GeologyError(f"{where}: malformed, non-2D or non-finite vertex.")
    if not (-180 <= position[0] <= 180 and -90 <= position[1] <= 90):
        raise GeologyError(f"{where}: vertex outside valid lon/lat.")


def _check_polygon(rings, where: str) -> None:
    if not isinstance(rings, (list, tuple)) or not rings:
        raise GeologyError(f"{where}: polygon without rings.")
    for ring in rings:
        if not isinstance(ring, (list, tuple)) or len(ring) < 4:
            raise GeologyError(f"{where}: malformed ring or fewer than 4 vertices.")
        for position in ring:
            _check_position(position, where)
        if list(ring[0]) != list(ring[-1]):  # GeoJSON requires the first vertex to be repeated; Shapely would close silently
            raise GeologyError(f"{where}: ring without exact closure (the last vertex does not repeat the first).")


def check_geometry_dict(geometry, where: str) -> None:
    """Structure and every vertex of a GeoJSON Polygon/MultiPolygon, BEFORE building Shapely geometries.

    The bounds are not enough: an internal NaN coordinate can leave finite bounds. No malformed leaf is ignored
    .
    """
    if not isinstance(geometry, dict) or geometry.get("type") not in ("Polygon", "MultiPolygon"):
        raise GeologyError(f"{where}: the geometry is neither Polygon nor MultiPolygon.")
    coordinates = geometry.get("coordinates")
    if geometry["type"] == "Polygon":
        _check_polygon(coordinates, where)
    else:
        if not isinstance(coordinates, (list, tuple)) or not coordinates:
            raise GeologyError(f"{where}: MultiPolygon without polygons.")
        for polygon in coordinates:
            _check_polygon(polygon, where)


def parse_features(collection: dict, id_property: str) -> tuple[list[Feature], int]:
    """Features with geometry; also returns how many arrived null or empty.

    Validates type, lon/lat range and finiteness. The identifier comes from ``id`` or, if missing, from the property.
    """
    if not isinstance(collection, dict) or collection.get("type") != "FeatureCollection" \
            or not isinstance(collection.get("features"), list):
        raise GeologyError("The response is not a FeatureCollection.")
    result, empty, seen = [], 0, set()
    for raw in collection["features"]:
        if not isinstance(raw, dict) or raw.get("type") != "Feature" or not isinstance(raw.get("properties"), dict):
            raise GeologyError("Feature with an unexpected shape.")
        properties = raw["properties"]
        feature_id = raw.get("id")
        if feature_id is None:
            feature_id = properties.get(id_property)
        if feature_id is None or str(feature_id) in seen:
            raise GeologyError("Feature identifier missing or repeated.")
        seen.add(str(feature_id))
        if raw.get("geometry") is None:
            empty += 1
            continue
        geometry_dict = raw["geometry"]
        if isinstance(geometry_dict, dict) and geometry_dict.get("coordinates") == []:
            empty += 1  # explicit empty geometry
            continue
        check_geometry_dict(geometry_dict, f"feature {feature_id}")
        try:
            geometry = shape(geometry_dict)
        except (ValueError, TypeError, KeyError, AttributeError, shapely.errors.ShapelyError):
            raise GeologyError(f"Unreadable geometry in feature {feature_id}.") from None
        result.append(Feature(str(feature_id), properties, geometry))
    return result, empty


def _km2(square_meters: float) -> float | None:
    """km² with 9 decimals; None if not finite (JSON does not support NaN or infinities)."""
    return round(square_meters / 1e6, 9) if math.isfinite(square_meters) else None


def _diagnose(feature: Feature, aoi, aoi_area: float) -> tuple[object | None, dict]:
    """Repair of an invalid geometry with two methods and independent limits.

    Returns (accepted clip | None, record). The invalid original is never clipped.
    """
    geometry = feature.geometry
    # Frozen output text (Spanish): method, rejection reasons and limitation strings are stored in the geology package.
    record: dict = {
        "feature_id": feature.feature_id,
        "validity_reason": explain_validity(geometry),
        "method": "make_valid (aceptación condicionada a contraste con buffer(0))",
        "original_total_area_km2": _km2(area_m2(project(geometry))),
    }
    reasons: list[str] = []
    try:
        primary_raw = make_valid(geometry)
        record["make_valid_discarded_dimensions"] = _discarded(primary_raw)
        primary = project(polygonal(primary_raw))
        control = project(polygonal(geometry.buffer(0)))
        record["make_valid_total_area_km2"] = _km2(area_m2(primary))
        record["buffer0_total_area_km2"] = _km2(area_m2(control))
        original = area_m2(project(geometry))
        if not (math.isfinite(original) and original > 0):
            reasons.append("el área total original no es positiva o no es finita")
            record["total_area_relative_change"] = None
        else:
            change = abs(area_m2(primary) - original) / original
            record["total_area_relative_change"] = change
            if change > REPAIR_TOTAL_AREA_LIMIT:
                reasons.append("el área total reparada difiere del original más que el límite de cambio total")
        if not _usable(primary):
            reasons.append("make_valid no produjo polígonos válidos no vacíos")
        if not _usable(control):
            reasons.append("buffer(0) no produjo polígonos válidos no vacíos")
        if _usable(primary) and _usable(control):
            # The symmetric contrast between methods is retained even if another criterion has already rejected.
            clip_primary, clip_control = polygonal(primary.intersection(aoi)), polygonal(control.intersection(aoi))
            primary_area, control_area = area_m2(clip_primary), area_m2(clip_control)
            difference = area_m2(clip_primary.symmetric_difference(clip_control))
            reference = max(primary_area, control_area)
            relative = difference / reference if reference > 0 else 0.0
            record.update({
                "clipped_area_km2": _km2(primary_area),
                "buffer0_clipped_area_km2": _km2(control_area),
                "symmetric_difference_km2": _km2(difference),
                "symmetric_difference_relative_to_entity": relative,
                "symmetric_difference_fraction_of_aoi": difference / aoi_area,
            })
            if relative > REPAIR_ENTITY_RELATIVE_LIMIT:
                reasons.append("la diferencia entre métodos supera el límite relativo de la entidad")
            if difference / aoi_area > REPAIR_AOI_FRACTION_LIMIT:
                reasons.append("la diferencia entre métodos supera el límite relativo del sector")
            if not reasons:
                if primary_area <= AREA_FLOOR_M2:
                    record["status"] = "accepted_no_positive_intersection"
                    return None, record
                record["status"] = "accepted"
                return clip_primary, record
    except (shapely.errors.GEOSException, ValueError) as error:
        reasons.append(f"error de geometría al reparar ({type(error).__name__})")
    record["status"] = "rejected"
    record["rejection_reasons"] = reasons
    record["limitation"] = (
        "Entidad no utilizable: se resta su bbox∩sector de todas las unidades como cota superior "
        "conservadora de la zona desconocida."
    )
    return None, record


def _fraction(geometry, aoi_area: float) -> float:
    return round(area_m2(geometry) / aoi_area, FRACTION_DECIMALS)


def _text(value) -> str:
    return str(value if value is not None else "").strip()


def description_present(value) -> bool:
    return _text(value) not in ("", "*")


def analyze_site(aoi_lonlat, features: list[Feature], layer: LayerConfig) -> dict:
    """Sector partition. ``features`` already come from the source of THIS sector (without inheriting from others)."""
    aoi = project(aoi_lonlat)
    aoi_area = area_m2(aoi)
    if aoi_area <= 0:
        raise GeologyError("The sector has zero area.")
    counts = {"bbox_candidates": 0, "positive_area": 0, "no_positive_intersection": 0,
              "invalid_geometry": 0, "repaired_accepted": 0, "rejected": 0}
    groups: dict[tuple, list] = {}
    members: dict[tuple, list[Feature]] = {}
    diagnostics, masks = [], []
    for feature in sorted(features, key=lambda item: item.feature_id):
        if not box(*feature.geometry.bounds).intersects(aoi_lonlat):
            continue
        counts["bbox_candidates"] += 1
        clipped = None
        if feature.geometry.is_valid:
            try:
                planar = project(feature.geometry)
                if not planar.is_valid:
                    raise ValueError("inválida tras proyectar")
                clipped = polygonal(planar.intersection(aoi))
            except (shapely.errors.GEOSException, ValueError) as error:
                diagnostics.append({
                    "feature_id": feature.feature_id, "validity_reason": "Valid Geometry",
                    "method": "intersection", "status": "rejected",
                    "rejection_reasons": [f"error de geometría al recortar ({type(error).__name__})"],
                    "limitation": "Entidad no utilizable: se resta su bbox∩sector como cota superior conservadora.",
                })
                clipped = False
        else:
            counts["invalid_geometry"] += 1
            clipped, record = _diagnose(feature, aoi, aoi_area)
            diagnostics.append(record)
            if record["status"] == "accepted":
                counts["repaired_accepted"] += 1
            if record["status"] == "rejected":
                clipped = False
        if clipped is False:
            counts["rejected"] += 1
            masks.append(project(box(*feature.geometry.bounds)).intersection(aoi))
            continue
        if clipped is None or area_m2(clipped) <= AREA_FLOOR_M2:
            counts["no_positive_intersection"] += 1
            continue
        counts["positive_area"] += 1
        key = tuple(_text(feature.properties.get(name)) for name in layer.identity_fields)
        groups.setdefault(key, []).append(clipped)
        members.setdefault(key, []).append(feature)

    mask = polygonal(unary_union(masks)) if masks else Polygon()
    units_geometry = {}
    for key, parts in groups.items():
        merged = polygonal(unary_union(parts))
        units_geometry[key] = polygonal(merged.difference(mask)) if not mask.is_empty else merged
    units_geometry = {key: geometry for key, geometry in units_geometry.items() if area_m2(geometry) > AREA_FLOOR_M2}
    keys = list(units_geometry)
    covered = polygonal(unary_union(list(units_geometry.values()))) if keys else Polygon()
    pairs = [polygonal(units_geometry[a].intersection(units_geometry[b]))
             for index, a in enumerate(keys) for b in keys[index + 1:]]
    conflict = polygonal(unary_union(pairs)) if pairs else Polygon()
    without_description = [units_geometry[key] for key in keys
                           if not description_present(members[key][0].properties.get(layer.description_field))]
    unmapped = polygonal(aoi.difference(covered).difference(mask))

    units = []
    for key in keys:
        geometry = units_geometry[key]
        first = min(members[key], key=lambda item: item.feature_id).properties
        identity = dict(zip(layer.identity_fields, key))
        units.append({
            "unit_id": "unit-" + hashlib.sha256(json.dumps([layer.source_id, key], ensure_ascii=False)
                                                .encode("utf-8")).hexdigest()[:12],
            "identity": identity,
            "code": _text(first.get(layer.code_field)) or None,
            "name": _text(first.get(layer.name_field)) or None,
            "description": first.get(layer.description_field) if description_present(first.get(layer.description_field)) else None,
            "description_present": description_present(first.get(layer.description_field)),
            "sheet": (_text(first.get(layer.sheet_field)) or None) if layer.sheet_field else None,
            "fraction_including_overlap": _fraction(geometry, aoi_area),
            "fraction_unambiguous": _fraction(geometry.difference(conflict), aoi_area),
            "source_features": [{"feature_id": item.feature_id, "properties": item.properties}
                                for item in sorted(members[key], key=lambda item: item.feature_id)],
        })
    for unit in units:
        unit["fraction_in_ambiguity"] = max(0.0, round(unit["fraction_including_overlap"] - unit["fraction_unambiguous"], FRACTION_DECIMALS))
    units.sort(key=lambda unit: (-unit["fraction_including_overlap"], unit["unit_id"]))

    unamb = _fraction(covered.difference(conflict), aoi_area)
    amb = _fraction(conflict, aoi_area)
    fractions = {
        "unmapped": _fraction(unmapped, aoi_area),
        "covered_unambiguous": unamb,
        "covered_ambiguous": amb,
        "unusable_upper_bound": _fraction(mask, aoi_area),
        "covered_total": round(unamb + amb, FRACTION_DECIMALS),
        "covered_by_units_without_description": _fraction(polygonal(unary_union(without_description)) if without_description else Polygon(), aoi_area),
    }
    return {
        "aoi_area_km2": round(aoi_area / 1e6, 6),
        "availability": availability(fractions),
        "area_fractions": fractions,
        "feature_counts": counts,
        "units": units,
        "geometry_diagnostics": diagnostics,
    }
