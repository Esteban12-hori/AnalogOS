"""Geological package validation: JSON Schema and semantics, including exact geometry and area closure.

The TypeScript validator in shared/geology/context.ts enforces the corresponding package semantics.
This Python module anchors each sector to the trusted candidates through exact geometry, site_id,
country and snapshot version, and checks the SHA-256 of the original candidate file bytes. The
packager uses the same validator. Source metadata and legacy export wording remain unchanged.
"""

from __future__ import annotations

import hashlib
import math
from urllib.parse import parse_qsl, urlsplit

from pipelines.contracts import ContractError, validate
from pipelines.geology_policy import (
    ALLOWED_HOSTS, AVAILABLE_TOLERANCE, CKAN_URL, POLICY, REPAIR_AOI_FRACTION_LIMIT, REPAIR_ENTITY_RELATIVE_LIMIT,
    REPAIR_TOTAL_AREA_LIMIT, SUM_TOLERANCE, WFS_BASE, WFS_LAYER, WFS_MAX_FEATURES, aoi_bounds, availability,
    request_digest,
)

EXTERNAL_HOSTS = ALLOWED_HOSTS  # The package URLs only point to the two official sources


def _fail(message: str) -> None:
    raise ContractError(f"geology-context: {message}")


def _finite(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def geometries_equal(first, second) -> bool:
    """Strict structural equality: same rings, same number of vertices and same exact numbers."""
    if isinstance(first, dict) and isinstance(second, dict):
        return first.keys() == second.keys() and all(geometries_equal(first[k], second[k]) for k in first)
    if isinstance(first, list) and isinstance(second, list):
        return len(first) == len(second) and all(geometries_equal(a, b) for a, b in zip(first, second))
    if isinstance(first, bool) or isinstance(second, bool):
        return False
    if isinstance(first, (int, float)) and isinstance(second, (int, float)):
        return first == second
    return first == second


def validate_package(index: dict, candidates: list[dict], candidates_bytes: bytes) -> None:
    """Raises ContractError if the package is not valid or does not correspond exactly to the candidates."""
    validate(index, "geology-context")
    if index["candidates_sha256"] != hashlib.sha256(candidates_bytes).hexdigest():
        _fail("candidates_sha256 does not match the bytes of candidate-details.json.")
    versions = {candidate["data_snapshot_version"] for candidate in candidates}
    if versions != {index["snapshot_version"]}:
        _fail("snapshot_version does not match the candidates one.")
    if [site["site_id"] for site in index["sites"]] != [candidate["site_id"] for candidate in candidates]:
        _fail("the sectors are not exactly the candidates, in the same order.")

    sources = _check_sources(index, [c["site_id"] for c in candidates if c["country"] == "AR"])
    for site, candidate in zip(index["sites"], candidates):
        _site(site, sources, candidate)


def _check_sources(container: dict, ar_site_ids: list[str]) -> dict:
    """Policy, allowed URLs and acquisition of each source. ``ar_site_ids``: Argentine sectors that it must cover."""
    if container["policy"] != POLICY:
        _fail("policy does not match the current pipeline policy (approved provisional thresholds).")
    sources = {source["source_id"]: source for source in container["sources"]}
    if len(sources) != len(container["sources"]):
        _fail("repeated source_id.")
    for source in container["sources"]:
        urls = [source["dataset_url"], source["license"]["url"], *(request["url"] for request in source["requests"])]
        if any(urlsplit(url).hostname not in EXTERNAL_HOSTS for url in urls):
            _fail(f"{source['source_id']}: URL outside the allowed sources.")
        ids = [request["request_id"] for request in source["requests"]]
        if len(set(ids)) != len(ids):
            _fail(f"{source['source_id']}: repeated request_id.")
        if source["map_date"] is not None:
            _fail(f"{source['source_id']}: map_date must be null while the source does not declare it.")
        _source_requests(source, ar_site_ids)
    return sources


def wfs_bbox(url: str) -> list[float]:
    """Validates the exact form of a WFS request and returns its bbox with exact numeric parsing (no rounding)."""
    target = urlsplit(url)
    expected_base = urlsplit(WFS_BASE)
    if (target.scheme, target.hostname, target.path) != (expected_base.scheme, expected_base.hostname, expected_base.path):
        _fail("WFS request outside the expected service.")
    try:
        pairs = parse_qsl(target.query, keep_blank_values=True, strict_parsing=True)
    except ValueError:
        _fail("WFS request with an unreadable query.")
    params = dict(pairs)
    fixed = {"service": "WFS", "version": "1.0.0", "request": "GetFeature", "typeName": WFS_LAYER,
             "maxFeatures": str(WFS_MAX_FEATURES), "srsName": "EPSG:4326", "outputFormat": "application/json"}
    if len(params) != len(pairs) or set(params) != {*fixed, "bbox"} or any(params[k] != v for k, v in fixed.items()):
        _fail("WFS request with parameters other than the expected ones.")
    parts = params["bbox"].split(",")
    if len(parts) != 5 or parts[4] != "EPSG:4326":
        _fail("malformed WFS bbox.")
    try:
        bbox = [float(value) for value in parts[:4]]
    except ValueError:
        _fail("non-numeric WFS bbox.")
    if not all(math.isfinite(value) for value in bbox):
        _fail("non-finite WFS bbox.")
    return bbox


def _source_requests(source: dict, ar_site_ids: list[str]) -> None:
    name = source["source_id"]
    for request in source["requests"]:
        if request["request_id"] != request_digest({"method": request["method"], "url": request["url"]}):
            _fail(f"{name}: request_id does not match the request method+URL.")
    roles = [request["role"] for request in source["requests"]]
    if source["country"] == "CL":
        if sorted(roles) != ["chile_catalog_metadata", "chile_layer"]:
            _fail(f"{name}: the Chilean source must declare exactly CKAN metadata and the layer download.")
        catalog = next(r for r in source["requests"] if r["role"] == "chile_catalog_metadata")
        layer = next(r for r in source["requests"] if r["role"] == "chile_layer")
        if catalog["url"] != CKAN_URL:
            _fail(f"{name}: the metadata is not the expected CKAN one.")
        if layer.get("actual_format") != "geojson" or "member_sha256" not in layer:
            _fail(f"{name}: the Chilean layer must be the inspected GeoJSON, with the member hash.")
        declared = source["license"]["declared_id"]
        if not declared or declared not in source["license"]["name"]:
            _fail(f"{name}: the license does not cite the id declared by the catalog.")
        return
    if any(role != "argentina_wfs" for role in roles):
        _fail(f"{name}: the Argentine source only allows WFS requests.")
    expected = set(ar_site_ids)
    found = [request.get("site_id") for request in source["requests"]]
    if sorted(found, key=str) != sorted(expected) or len(set(found)) != len(found):
        _fail(f"{name}: there must be exactly one WFS request per sector, with its site_id.")
    for request in source["requests"]:
        wfs_bbox(request["url"])
        if request.get("number_matched") != request.get("number_returned") or "number_returned" not in request:
            _fail(f"{name}: truncated or inconsistent WFS response in {request['site_id']}.")


def _site(site: dict, sources: dict, candidate: dict | None = None) -> None:
    name = site["site_id"]
    if candidate is not None:
        if site["country"] != candidate["country"] or site["name"] != candidate["name"]:
            _fail(f"{name}: country or name differs from the candidate.")
        if not geometries_equal(site["geometry"], candidate["geometry"]):
            _fail(f"{name}: the geometry is not identical to the candidate one.")
    _check_geometry_shape(site["geometry"], name)
    source = sources.get(site["source_id"])
    if source is None or source["country"] != site["country"]:
        _fail(f"{name}: nonexistent source or from another country.")
    by_id = {request["request_id"]: request for request in source["requests"]}
    cited = site["request_ids"]
    if len(set(cited)) != len(cited) or not set(cited) <= by_id.keys():
        _fail(f"{name}: request_ids repeated or not declared by the source.")
    if site["country"] == "AR":
        # Exact acquisition of the sector itself: role, site_id and URL bbox against the AOI, without rounding.
        if len(cited) != 1:
            _fail(f"{name}: an Argentine sector must cite exactly its WFS request.")
        request = by_id[cited[0]]
        if request["role"] != "argentina_wfs" or request.get("site_id") != name:
            _fail(f"{name}: the cited request does not belong to this sector.")
        if wfs_bbox(request["url"]) != aoi_bounds(site["geometry"]):
            _fail(f"{name}: the WFS request bbox is not the sector one.")
        if site["feature_counts"]["bbox_candidates"] > request["number_returned"]:
            _fail(f"{name}: more candidate features than those returned by the request.")
    else:
        roles = {by_id[request_id]["role"] for request_id in cited}
        if "chile_layer" not in roles or not roles <= {"chile_layer", "chile_catalog_metadata"}:
            _fail(f"{name}: a Chilean sector must cite the layer download (the metadata may be additional).")

    fractions = site["area_fractions"]
    if not all(_finite(value) for value in fractions.values()):
        _fail(f"{name}: non-finite fractions.")
    closure = fractions["unmapped"] + fractions["covered_unambiguous"] + fractions["covered_ambiguous"] \
        + fractions["unusable_upper_bound"]
    if abs(closure - 1) > SUM_TOLERANCE:
        _fail(f"{name}: unmapped + unambiguous + ambiguous + unusable add up to {closure}, not 1.")
    if abs(fractions["covered_total"] - fractions["covered_unambiguous"] - fractions["covered_ambiguous"]) > SUM_TOLERANCE:
        _fail(f"{name}: covered_total does not reconcile with its components.")
    if fractions["covered_by_units_without_description"] > fractions["covered_total"] + SUM_TOLERANCE:
        _fail(f"{name}: the part without description exceeds the coverage.")
    if site["availability"] != availability(fractions):
        _fail(f"{name}: availability does not match the fractions (conservative: only complete coverage is available).")

    units = site["units"]
    if len({unit["unit_id"] for unit in units}) != len(units):
        _fail(f"{name}: repeated unit_id.")
    if bool(units) != (fractions["covered_total"] > 0):
        _fail(f"{name}: units and coverage do not agree.")
    unambiguous_sum = 0.0
    for unit in units:
        included, clean, shared = (unit["fraction_including_overlap"], unit["fraction_unambiguous"],
                                   unit["fraction_in_ambiguity"])
        if not all(_finite(value) for value in (included, clean, shared)):
            _fail(f"{name}/{unit['unit_id']}: non-finite fractions.")
        if abs(included - clean - shared) > SUM_TOLERANCE or clean > included + SUM_TOLERANCE \
                or included > fractions["covered_total"] + SUM_TOLERANCE:
            _fail(f"{name}/{unit['unit_id']}: inconsistent unit fractions.")
        if unit["description_present"] != (unit["description"] is not None):
            _fail(f"{name}/{unit['unit_id']}: description_present does not agree with description.")
        unambiguous_sum += clean
    if abs(unambiguous_sum - fractions["covered_unambiguous"]) > SUM_TOLERANCE * max(1, len(units)):
        _fail(f"{name}: the sum of unambiguous units does not reconcile with the sector.")
    if len(units) == 1 and fractions["covered_ambiguous"] > AVAILABLE_TOLERANCE:
        _fail(f"{name}: a single unit cannot have ambiguity between distinct units.")

    diagnostics = site["geometry_diagnostics"]
    rejected = [item for item in diagnostics if item["status"] == "rejected"]
    for item in diagnostics:
        _diagnostic(name, item)
    if site["feature_counts"]["rejected"] != len(rejected):
        _fail(f"{name}: feature_counts.rejected does not match the diagnostics.")
    if fractions["unusable_upper_bound"] > 0 and not rejected:
        _fail(f"{name}: there is an unusable area without rejected features to explain it.")
    if site["feature_counts"]["positive_area"] < len(units):
        _fail(f"{name}: there are more units than features with positive area.")


def _diagnostic(name: str, item: dict) -> None:
    """An accepted repair must meet the three independent limits; a rejected one must be explained."""
    if item["status"] == "rejected":
        if not item.get("rejection_reasons"):
            _fail(f"{name}/{item['feature_id']}: rejected feature without reasons.")
        return
    change = item.get("total_area_relative_change")
    if not _finite(change) or change > REPAIR_TOTAL_AREA_LIMIT:
        _fail(f"{name}/{item['feature_id']}: repair accepted with a total area change outside the limit.")
    relative, fraction = item.get("symmetric_difference_relative_to_entity"), item.get("symmetric_difference_fraction_of_aoi")
    if not _finite(relative) or relative > REPAIR_ENTITY_RELATIVE_LIMIT \
            or not _finite(fraction) or fraction > REPAIR_AOI_FRACTION_LIMIT:
        _fail(f"{name}/{item['feature_id']}: repair accepted with a difference between methods outside the limits.")


def _check_geometry_shape(geometry: dict, name: str) -> None:
    """Polygon(s) with closed rings and finite 2D vertices in range (the contract only requires arrays)."""
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    for rings in polygons:
        if not isinstance(rings, list) or not rings:
            _fail(f"{name}: geometry without rings.")
        for ring in rings:
            if not isinstance(ring, list) or len(ring) < 4 or ring[0] != ring[-1] or not all(
                isinstance(p, list) and len(p) == 2 and all(_finite(v) for v in p)
                and -180 <= p[0] <= 180 and -90 <= p[1] <= 90 for p in ring
            ):
                _fail(f"{name}: malformed, open or out-of-lon/lat ring.")


# --- Independent geological export (subset of ONE sector, self-describing) -------------------------

EXPORT_DESCRIPTION = (
    "Contexto geológico cartográfico de un sector de AnalogOS, exportado de forma independiente. Describe qué "
    "unidades están cartografiadas en la capa oficial citada y qué parte del sector no tiene cobertura; no mide "
    "el terreno ni expresa aptitud, confianza ni compatibilidad planetaria."
)
EXPORT_HOW_TO_READ = [
    "availability describe evidencia cartográfica, nunca aptitud: available = cobertura completa de esta capa sin "
    "ambigüedad ni descripciones ausentes; partial = hay huecos, solapes o descripciones ausentes; no_coverage = "
    "esta capa no cubre el sector; unavailable = hay evidencia no utilizable.",
    "area_fractions son fracciones del área del sector y suman 1 sin renormalizar: unmapped + covered_unambiguous + "
    "covered_ambiguous + unusable_upper_bound. Cobertura no es precisión.",
    "Este archivo es un subconjunto: contiene un solo sector y las peticiones que lo respaldan. "
    "full_candidates_file_sha256 es el hash del archivo completo candidate-details.json del que salió el paquete; "
    "este subconjunto no es ese archivo.",
    "Las verification_questions son orientación editorial, no mediciones.",
]
# The Spanish texts above are FROZEN: they are the export_info of historical schema_version 1 exports. Version 2 has
# the same content with English export_info (mirrored in shared/geology/text.ts; a parity test checks both).
EXPORT_DESCRIPTION_EN = (
    "Map-based geological context for one AnalogOS sector, exported on its own. It describes which units are mapped in the "
    "cited official layer and which part of the sector has no coverage; it does not measure the terrain or express suitability, "
    "confidence or planetary compatibility."
)
EXPORT_HOW_TO_READ_EN = [
    "availability describes map evidence, never suitability: available = complete coverage by this layer with no ambiguity "
    "or missing descriptions; partial = there are gaps, overlaps or missing descriptions; no_coverage = this layer does not "
    "cover the sector; unavailable = there is unusable evidence.",
    "area_fractions are fractions of the sector area and add up to 1 without renormalization: unmapped + covered_unambiguous + "
    "covered_ambiguous + unusable_upper_bound. Coverage is not precision.",
    "This file is a subset: it contains a single sector and the requests that support it. full_candidates_file_sha256 is the "
    "hash of the complete candidate-details.json file the package came from; this subset is not that file.",
    "The verification_questions are editorial guidance, not measurements.",
    "Language: authored text is English. Values copied verbatim from the official sources and the stored geology package "
    "(unit names, codes and descriptions, source and dataset titles, attribution, license, transformations, limitations, "
    "editorial_note and verification_questions) keep their original wording, mostly Spanish; they are source evidence and are not translated.",
]
EXPORT_TEXT = {1: (EXPORT_DESCRIPTION, EXPORT_HOW_TO_READ), 2: (EXPORT_DESCRIPTION_EN, EXPORT_HOW_TO_READ_EN)}


def build_export(index: dict, site_id: str, schema_version: int = 1) -> dict:
    """Self-contained subset of a sector. Raises ContractError if the sector is not in the package.

    ``schema_version`` 1 (default, kept for reproducibility of existing outputs) has the frozen Spanish export_info;
    2 has English export_info. Any other value is rejected. The stored geology package is never affected.
    """
    if schema_version not in EXPORT_TEXT or isinstance(schema_version, bool):
        _fail(f"unsupported geology export schema_version {schema_version!r}.")
    description, how_to_read = EXPORT_TEXT[schema_version]
    site = next((item for item in index["sites"] if item["site_id"] == site_id), None)
    if site is None:
        _fail(f"{site_id}: the sector is not in the package.")
    source = next(item for item in index["sources"] if item["source_id"] == site["source_id"])
    cited = set(site["request_ids"])
    keep = [r for r in source["requests"] if r["request_id"] in cited or r["role"] == "chile_catalog_metadata"]
    export = {
        "kind": "analogos-geology-export", "schema_version": schema_version, "status": index["status"],
        "export_info": {
            "description": description, "how_to_read": how_to_read, "subset": True,
            "package_kind": index["kind"], "package_schema_version": index["schema_version"],
            "snapshot_version": index["snapshot_version"], "pipeline_version": index["pipeline_version"],
            "full_candidates_file": index["candidates_file"], "full_candidates_file_sha256": index["candidates_sha256"],
        },
        "site": site, "source": {**source, "requests": keep}, "processing": index["processing"],
        "policy": index["policy"], "limitations": index["limitations"], "editorial_note": index["editorial_note"],
    }
    validate_export(export)
    return export


def validate_export(export: dict) -> None:
    """Validates the self-contained contract and semantics of an exported subset (without access to the candidates)."""
    validate(export, "geology-export")
    description, how_to_read = EXPORT_TEXT[export["schema_version"]]
    if export["export_info"]["description"] != description or export["export_info"]["how_to_read"] != how_to_read:
        _fail(f"export_info does not match the wording of schema_version {export['schema_version']}.")
    site, source = export["site"], export["source"]
    if source["source_id"] != site["source_id"]:
        _fail("the exported source is not the sector one.")
    sources = _check_sources({"policy": export["policy"], "sources": [source]},
                             [site["site_id"]] if site["country"] == "AR" else [])
    _site(site, sources)
