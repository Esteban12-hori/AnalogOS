"""Validación del paquete geológico: JSON Schema y semántica (geometría exacta, cierre de áreas, estados).

La semántica es la misma que reimplementará la web (fase B). No hay criptografía en el navegador: el
vínculo con el snapshot es la geometría exacta de cada sector (igualdad estructural y numérica estricta
contra ``candidate-details.json``), más ``site_id``, país y versión de snapshot. El SHA-256 del archivo de
candidatos se comprueba en pipeline y empaquetador leyendo los bytes.
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

EXTERNAL_HOSTS = ALLOWED_HOSTS  # las URL del paquete solo apuntan a las dos fuentes oficiales


def _fail(message: str) -> None:
    raise ContractError(f"geology-context: {message}")


def _finite(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def geometries_equal(first, second) -> bool:
    """Igualdad estructural estricta: mismos anillos, mismo número de vértices y mismos números exactos."""
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
    """Lanza ContractError si el paquete no es válido o no corresponde exactamente a los candidatos."""
    validate(index, "geology-context")
    if index["candidates_sha256"] != hashlib.sha256(candidates_bytes).hexdigest():
        _fail("candidates_sha256 no coincide con los bytes de candidate-details.json.")
    versions = {candidate["data_snapshot_version"] for candidate in candidates}
    if versions != {index["snapshot_version"]}:
        _fail("snapshot_version no coincide con el de los candidatos.")
    if [site["site_id"] for site in index["sites"]] != [candidate["site_id"] for candidate in candidates]:
        _fail("los sectores no son exactamente los candidatos, en el mismo orden.")

    sources = _check_sources(index, [c["site_id"] for c in candidates if c["country"] == "AR"])
    for site, candidate in zip(index["sites"], candidates):
        _site(site, sources, candidate)


def _check_sources(container: dict, ar_site_ids: list[str]) -> dict:
    """Política, URL permitidas y adquisición de cada fuente. ``ar_site_ids``: sectores argentinos que debe cubrir."""
    if container["policy"] != POLICY:
        _fail("policy no coincide con la política vigente del pipeline (umbrales provisionales aprobados).")
    sources = {source["source_id"]: source for source in container["sources"]}
    if len(sources) != len(container["sources"]):
        _fail("source_id repetido.")
    for source in container["sources"]:
        urls = [source["dataset_url"], source["license"]["url"], *(request["url"] for request in source["requests"])]
        if any(urlsplit(url).hostname not in EXTERNAL_HOSTS for url in urls):
            _fail(f"{source['source_id']}: URL fuera de las fuentes permitidas.")
        ids = [request["request_id"] for request in source["requests"]]
        if len(set(ids)) != len(ids):
            _fail(f"{source['source_id']}: request_id repetido.")
        if source["map_date"] is not None:
            _fail(f"{source['source_id']}: map_date debe ser null mientras la fuente no lo declare.")
        _source_requests(source, ar_site_ids)
    return sources


def wfs_bbox(url: str) -> list[float]:
    """Valida la forma exacta de una petición WFS y devuelve su bbox con parse numérico exacto (sin redondeo)."""
    target = urlsplit(url)
    expected_base = urlsplit(WFS_BASE)
    if (target.scheme, target.hostname, target.path) != (expected_base.scheme, expected_base.hostname, expected_base.path):
        _fail("petición WFS fuera del servicio esperado.")
    try:
        pairs = parse_qsl(target.query, keep_blank_values=True, strict_parsing=True)
    except ValueError:
        _fail("petición WFS con query ilegible.")
    params = dict(pairs)
    fixed = {"service": "WFS", "version": "1.0.0", "request": "GetFeature", "typeName": WFS_LAYER,
             "maxFeatures": str(WFS_MAX_FEATURES), "srsName": "EPSG:4326", "outputFormat": "application/json"}
    if len(params) != len(pairs) or set(params) != {*fixed, "bbox"} or any(params[k] != v for k, v in fixed.items()):
        _fail("petición WFS con parámetros distintos de los esperados.")
    parts = params["bbox"].split(",")
    if len(parts) != 5 or parts[4] != "EPSG:4326":
        _fail("bbox WFS mal formado.")
    try:
        bbox = [float(value) for value in parts[:4]]
    except ValueError:
        _fail("bbox WFS no numérico.")
    if not all(math.isfinite(value) for value in bbox):
        _fail("bbox WFS no finito.")
    return bbox


def _source_requests(source: dict, ar_site_ids: list[str]) -> None:
    name = source["source_id"]
    for request in source["requests"]:
        if request["request_id"] != request_digest({"method": request["method"], "url": request["url"]}):
            _fail(f"{name}: request_id no corresponde a método+URL de la petición.")
    roles = [request["role"] for request in source["requests"]]
    if source["country"] == "CL":
        if sorted(roles) != ["chile_catalog_metadata", "chile_layer"]:
            _fail(f"{name}: la fuente chilena debe declarar exactamente metadata CKAN y la descarga de la capa.")
        catalog = next(r for r in source["requests"] if r["role"] == "chile_catalog_metadata")
        layer = next(r for r in source["requests"] if r["role"] == "chile_layer")
        if catalog["url"] != CKAN_URL:
            _fail(f"{name}: la metadata no es la de CKAN esperada.")
        if layer.get("actual_format") != "geojson" or "member_sha256" not in layer:
            _fail(f"{name}: la capa chilena debe ser el GeoJSON inspeccionado, con hash del miembro.")
        declared = source["license"]["declared_id"]
        if not declared or declared not in source["license"]["name"]:
            _fail(f"{name}: la licencia no cita el id declarado por el catálogo.")
        return
    if any(role != "argentina_wfs" for role in roles):
        _fail(f"{name}: la fuente argentina solo admite peticiones WFS.")
    expected = set(ar_site_ids)
    found = [request.get("site_id") for request in source["requests"]]
    if sorted(found, key=str) != sorted(expected) or len(set(found)) != len(found):
        _fail(f"{name}: debe haber exactamente una petición WFS por sector, con su site_id.")
    for request in source["requests"]:
        wfs_bbox(request["url"])
        if request.get("number_matched") != request.get("number_returned") or "number_returned" not in request:
            _fail(f"{name}: respuesta WFS truncada o inconsistente en {request['site_id']}.")


def _site(site: dict, sources: dict, candidate: dict | None = None) -> None:
    name = site["site_id"]
    if candidate is not None:
        if site["country"] != candidate["country"] or site["name"] != candidate["name"]:
            _fail(f"{name}: país o nombre distinto del candidato.")
        if not geometries_equal(site["geometry"], candidate["geometry"]):
            _fail(f"{name}: la geometría no es idéntica a la del candidato.")
    _check_geometry_shape(site["geometry"], name)
    source = sources.get(site["source_id"])
    if source is None or source["country"] != site["country"]:
        _fail(f"{name}: fuente inexistente o de otro país.")
    by_id = {request["request_id"]: request for request in source["requests"]}
    cited = site["request_ids"]
    if len(set(cited)) != len(cited) or not set(cited) <= by_id.keys():
        _fail(f"{name}: request_ids repetidos o no declarados por la fuente.")
    if site["country"] == "AR":
        # Adquisición exacta del propio sector: rol, site_id y bbox de la URL contra el AOI, sin redondeo.
        if len(cited) != 1:
            _fail(f"{name}: un sector argentino cita exactamente su petición WFS.")
        request = by_id[cited[0]]
        if request["role"] != "argentina_wfs" or request.get("site_id") != name:
            _fail(f"{name}: la petición citada no pertenece a este sector.")
        if wfs_bbox(request["url"]) != aoi_bounds(site["geometry"]):
            _fail(f"{name}: la bbox de la petición WFS no es la del sector.")
        if site["feature_counts"]["bbox_candidates"] > request["number_returned"]:
            _fail(f"{name}: más entidades candidatas que las devueltas por la petición.")
    else:
        roles = {by_id[request_id]["role"] for request_id in cited}
        if "chile_layer" not in roles or not roles <= {"chile_layer", "chile_catalog_metadata"}:
            _fail(f"{name}: un sector chileno debe citar la descarga de la capa (la metadata puede ser adicional).")

    fractions = site["area_fractions"]
    if not all(_finite(value) for value in fractions.values()):
        _fail(f"{name}: fracciones no finitas.")
    closure = fractions["unmapped"] + fractions["covered_unambiguous"] + fractions["covered_ambiguous"] \
        + fractions["unusable_upper_bound"]
    if abs(closure - 1) > SUM_TOLERANCE:
        _fail(f"{name}: sin cobertura + sin ambigüedad + ambigua + no utilizable suman {closure}, no 1.")
    if abs(fractions["covered_total"] - fractions["covered_unambiguous"] - fractions["covered_ambiguous"]) > SUM_TOLERANCE:
        _fail(f"{name}: covered_total no reconcilia con sus componentes.")
    if fractions["covered_by_units_without_description"] > fractions["covered_total"] + SUM_TOLERANCE:
        _fail(f"{name}: la parte sin descripción excede la cobertura.")
    if site["availability"] != availability(fractions):
        _fail(f"{name}: availability no corresponde a las fracciones (conservador: solo cobertura completa es available).")

    units = site["units"]
    if len({unit["unit_id"] for unit in units}) != len(units):
        _fail(f"{name}: unit_id repetido.")
    if bool(units) != (fractions["covered_total"] > 0):
        _fail(f"{name}: unidades y cobertura no concuerdan.")
    unambiguous_sum = 0.0
    for unit in units:
        included, clean, shared = (unit["fraction_including_overlap"], unit["fraction_unambiguous"],
                                   unit["fraction_in_ambiguity"])
        if not all(_finite(value) for value in (included, clean, shared)):
            _fail(f"{name}/{unit['unit_id']}: fracciones no finitas.")
        if abs(included - clean - shared) > SUM_TOLERANCE or clean > included + SUM_TOLERANCE \
                or included > fractions["covered_total"] + SUM_TOLERANCE:
            _fail(f"{name}/{unit['unit_id']}: fracciones de unidad incoherentes.")
        if unit["description_present"] != (unit["description"] is not None):
            _fail(f"{name}/{unit['unit_id']}: description_present no concuerda con description.")
        unambiguous_sum += clean
    if abs(unambiguous_sum - fractions["covered_unambiguous"]) > SUM_TOLERANCE * max(1, len(units)):
        _fail(f"{name}: la suma de unidades sin ambigüedad no reconcilia con el sector.")
    if len(units) == 1 and fractions["covered_ambiguous"] > AVAILABLE_TOLERANCE:
        _fail(f"{name}: una sola unidad no puede tener ambigüedad entre unidades distintas.")

    diagnostics = site["geometry_diagnostics"]
    rejected = [item for item in diagnostics if item["status"] == "rejected"]
    for item in diagnostics:
        _diagnostic(name, item)
    if site["feature_counts"]["rejected"] != len(rejected):
        _fail(f"{name}: feature_counts.rejected no coincide con los diagnósticos.")
    if fractions["unusable_upper_bound"] > 0 and not rejected:
        _fail(f"{name}: hay zona no utilizable sin entidades rechazadas que la expliquen.")
    if site["feature_counts"]["positive_area"] < len(units):
        _fail(f"{name}: hay más unidades que entidades con área positiva.")


def _diagnostic(name: str, item: dict) -> None:
    """Una reparación aceptada debe cumplir los tres límites independientes; una rechazada debe explicarse."""
    if item["status"] == "rejected":
        if not item.get("rejection_reasons"):
            _fail(f"{name}/{item['feature_id']}: entidad rechazada sin razones.")
        return
    change = item.get("total_area_relative_change")
    if not _finite(change) or change > REPAIR_TOTAL_AREA_LIMIT:
        _fail(f"{name}/{item['feature_id']}: reparación aceptada con cambio de área total fuera del límite.")
    relative, fraction = item.get("symmetric_difference_relative_to_entity"), item.get("symmetric_difference_fraction_of_aoi")
    if not _finite(relative) or relative > REPAIR_ENTITY_RELATIVE_LIMIT \
            or not _finite(fraction) or fraction > REPAIR_AOI_FRACTION_LIMIT:
        _fail(f"{name}/{item['feature_id']}: reparación aceptada con diferencia entre métodos fuera de límites.")


def _check_geometry_shape(geometry: dict, name: str) -> None:
    """Polígono(s) con anillos cerrados y vértices 2D finitos en rango (el contrato solo pide arreglos)."""
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    for rings in polygons:
        if not isinstance(rings, list) or not rings:
            _fail(f"{name}: geometría sin anillos.")
        for ring in rings:
            if not isinstance(ring, list) or len(ring) < 4 or ring[0] != ring[-1] or not all(
                isinstance(p, list) and len(p) == 2 and all(_finite(v) for v in p)
                and -180 <= p[0] <= 180 and -90 <= p[1] <= 90 for p in ring
            ):
                _fail(f"{name}: anillo malformado, abierto o fuera de lon/lat.")


# --- Exportación geológica independiente (subset de UN sector, autodescriptivo) -------------------------

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


def build_export(index: dict, site_id: str) -> dict:
    """Subconjunto autocontenido de un sector. Lanza ContractError si el sector no está en el paquete."""
    site = next((item for item in index["sites"] if item["site_id"] == site_id), None)
    if site is None:
        _fail(f"{site_id}: el sector no está en el paquete.")
    source = next(item for item in index["sources"] if item["source_id"] == site["source_id"])
    cited = set(site["request_ids"])
    keep = [r for r in source["requests"] if r["request_id"] in cited or r["role"] == "chile_catalog_metadata"]
    export = {
        "kind": "analogos-geology-export", "schema_version": 1, "status": index["status"],
        "export_info": {
            "description": EXPORT_DESCRIPTION, "how_to_read": EXPORT_HOW_TO_READ, "subset": True,
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
    """Valida contrato autocontenido y semántica de un subconjunto exportado (sin acceso a los candidatos)."""
    validate(export, "geology-export")
    site, source = export["site"], export["source"]
    if source["source_id"] != site["source_id"]:
        _fail("la fuente exportada no es la del sector.")
    sources = _check_sources({"policy": export["policy"], "sources": [source]},
                             [site["site_id"]] if site["country"] == "AR" else [])
    _site(site, sources)
