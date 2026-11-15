"""Builds ``artifacts/geology-context-v1/index.json`` from the validated raw cache.

Cartographic geological context per sector, independent of ``science-v3`` (which is not touched). No network if the
cache is valid; no credentials. There is no build time: the package dates come from the
acquisition records, so rebuilding without a network yields identical bytes.

Transaction: the new cache (if there was a download) and the package are prepared in sibling directories; the
index is built and validated (JSON Schema + semantics) BEFORE anything is installed; then the
cache and package are replaced as a pair with rollback. Any error (HTTP, parsing, contract, publication) leaves the
previous cache and package in place. There is no atomicity against a power failure between the two replacements.

    python -m pipelines.build_geology_context [--refresh] [--offline]
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

from shapely.geometry import shape

from pipelines import __version__
from pipelines.contracts import ROOT, ContractError
from pipelines.fetch_geology_data import (
    CKAN_PAGE, RAW_DIR, WFS_BASE, WFS_LAYER, WFS_PAGE, GeologyError, Http, PackageStateError, inspect_zip, prepare_raw, publish,
)
from pipelines.geology_contract import validate_package
from pipelines.geology_coverage import (
    POLICY, Feature, LayerConfig, analyze_site, parse_features, processing_versions,
)

CANDIDATES = ROOT / "artifacts" / "science-v3" / "candidate-details.json"
OUT_DIR = ROOT / "artifacts" / "geology-context-v1"

CL_ID = "cl-sernageomin-mma-geologia-base"
AR_ID = "ar-segemar-sigam-e250k-unidad-geologica"
LAYERS = {
    "CL": LayerConfig(CL_ID, ("cod_geologia", "lithostrat", "lithology"), "cod_geologia", "lithostrat", "lithology"),
    "AR": LayerConfig(AR_ID, ("nro_hoja", "cod_ulito", "nombre", "descrip_litologica"), "cod_ulito", "nombre",
                      "descrip_litologica", "nro_hoja"),
}
COMMON_TRANSFORMATIONS = [
    "Validez y reparación se evalúan sobre las coordenadas originales lon/lat; luego los vértices se proyectan a EPSG:6933 "
    "(equivalente) y el recorte contra la geometría exacta del sector, la disolución y los solapes se hacen en ese plano, "
    "con aristas rectas en él (no es una integral geodésica exacta).",
    "Entidades agrupadas por la identidad de fuente indicada; sus partes se disuelven, de modo que duplicados no suman área.",
    "Solape entre unidades distintas se informa como ambigüedad; no se reparte ni se normaliza a 100 %.",
    "Geometrías inválidas: make_valid contrastada con buffer(0); se rechaza la entidad si el área total original no es "
    "positiva y finita, si el área total reparada cambia más de 0,1 %, si alguno de los métodos no da polígonos válidos "
    "o si su diferencia simétrica recortada supera 0,1 % de la entidad o 0,05 % del sector. Una entidad rechazada resta "
    "su bbox∩sector de todas las unidades como cota superior de zona no utilizable.",
    "Propiedades originales conservadas sin traducir ni clasificar; ningún campo vacío se completa.",
]
EDITORIAL_NOTE = (
    "Las preguntas de verificación son orientación editorial para preparar el reconocimiento, no mediciones ni "
    "resultados de campo."
)
LIMITATIONS = [
    "Cartografía regional: describe qué unidades están cartografiadas, no qué material aflora ni su estado superficial.",
    "Cobertura del mapa no es precisión, confianza, aptitud ni verificación de campo; 100 % cubierto no significa 100 % acertado.",
    "Una fracción sin cobertura significa que esta capa no tiene polígono allí; no implica ausencia de geología ni descarta el sector.",
    "No se mezclan escalas: no se rellenan huecos con capas más generales (1:1.000.000 o 1:2.500.000).",
    "No se infieren tracción, granulometría, resistencia, composición química ni compatibilidad planetaria calibrada.",
    "El score del snapshot mantiene «Geología sin calibrar»: este paquete no lo modifica.",
    "Umbrales de reparación y de estado son criterios de ingeniería provisionales, no estándares científicos.",
    "Las áreas se miden con aristas rectas en el plano equivalente EPSG:6933 tras proyectar los vértices; no son "
    "mediciones geodésicas exactas.",
]


def _request_entries(acquisition: dict, roles: tuple[str, ...]) -> list[dict]:
    entries = []
    for record in acquisition["records"]:
        if record["role"] not in roles:
            continue
        entry = {
            "request_id": record["request_sha256"], "role": record["role"], "method": record["request"]["method"],
            "url": record["request"]["url"], "response_sha256": record["sha256"], "bytes": record["bytes"],
            "http_status": record["http_status"], "content_type": record["content_type"],
            "acquired_at": record["acquired_at"],
        }
        for key in ("site_id", "server_timestamp", "number_matched", "number_returned", "resource_id",
                    "labeled_format", "actual_format", "zip_member", "member_sha256", "rejected_resources"):
            if key in record:
                entry[key] = record[key]
        entries.append(entry)
    return entries


def _format_narration(layer: dict) -> str:
    """Formats actually inspected in THIS acquisition, not a fixed observation."""
    parts = [f"el recurso rotulado «{layer.get('labeled_format')}» (id {layer.get('resource_id')}) contenía "
             f"{'GeoJSON' if layer['actual_format'] == 'geojson' else layer['actual_format']} y fue el usado"]
    for item in layer.get("rejected_resources", []):
        parts.append(f"el recurso rotulado «{item.get('labeled_format')}» (id {item.get('resource_id')}) contenía "
                     f"{item.get('actual_format')} y no se usó")
    return "Se inspeccionó el contenido real de los ZIP de CKAN: " + "; ".join(parts) + ". Los rótulos del catálogo no se dan por ciertos."


def _sources(acquisition: dict, chile_total: int, chile_null: int, catalog: dict) -> list[dict]:
    layer_record = next(r for r in acquisition["records"] if r["role"] == "chile_layer")
    license_id = catalog.get("license_id")
    if license_id != "cc-zero":
        raise GeologyError(
            f"CKAN declares the license {license_id!r}, not cc-zero: attribution for this package needs review "
            "before publication. The build is rejected."
        )
    chile = {
        "source_id": CL_ID, "country": "CL",
        "authority_original": "SERNAGEOMIN (Servicio Nacional de Geología y Minería)",
        "distributor": "Ministerio del Medio Ambiente de Chile (MMA), Líneas de base públicas",
        "dataset_name": "Geología Base", "dataset_url": CKAN_PAGE, "layer": "Geología Base (distribuida por MMA)",
        "scale_denominator": 1000000, "crs_declared": "urn:ogc:def:crs:OGC:1.3:CRS84 (EPSG:4326)",
        "license": {
            "name": f"{catalog.get('license_title') or 'Creative Commons CCZero'} (license_id: {license_id})",
            "declared_id": license_id, "url": CKAN_PAGE,
            "declared_by": "Catálogo CKAN del MMA (campo license_id de package_show, leído en la adquisición)",
            "scope": "Declarada para el conjunto «geologia-base» distribuido por el MMA.",
        },
        "attribution": "SERNAGEOMIN, distribuido por el Ministerio del Medio Ambiente de Chile.",
        "map_date": None,
        "map_date_note": "El catálogo no declara la fecha del levantamiento geológico; catalog_modified_at es solo la "
                         "fecha de actualización del registro del catálogo.",
        "catalog_modified_at": catalog.get("metadata_modified"), "encoding": "UTF-8",
        "identity_fields": list(LAYERS["CL"].identity_fields), "code_field": "cod_geologia", "name_field": "lithostrat",
        "description_field": "lithology", "sheet_field": None, "absent_description_markers": ["", "*"],
        "requests": _request_entries(acquisition, ("chile_catalog_metadata", "chile_layer")),
        "layer_features_total": chile_total, "layer_null_geometry_features": chile_null,
        "transformations": [
            _format_narration(layer_record), *COMMON_TRANSFORMATIONS],
        "limitations": [
            "Escala 1:1.000.000: unidades generalizadas; una unidad cartografiada puede incluir otras no representables.",
            "Fecha del levantamiento desconocida (null); no se usa la fecha del catálogo como fecha del mapa.",
            "El archivo nacional trae entidades con geometría nula; no se atribuyen a ningún sector.",
        ],
    }
    argentina = {
        "source_id": AR_ID, "country": "AR",
        "authority_original": "SEGEMAR (Servicio Geológico Minero Argentino)",
        "distributor": "SEGEMAR, Sistema de Información Geológica Ambiental Minera (SIGAM), servicio WFS público",
        "dataset_name": "Unidades geológicas 1:250.000", "dataset_url": WFS_PAGE, "layer": WFS_LAYER,
        "scale_denominator": 250000, "crs_declared": "urn:ogc:def:crs:EPSG::4326",
        "license": {
            "name": "Creative Commons Attribution 4.0 (CC BY 4.0), según lo declarado por SIGAM", "url": WFS_PAGE,
            "declared_id": None, "declared_by": "Página de geoservicios de SIGAM/SEGEMAR",
            "scope": "Declaración general de la página de geoservicios; no se verificó una licencia específica de la capa.",
        },
        "attribution": "SEGEMAR / SIGAM, capa sigam:e250K_UnidadGeologica (CC BY 4.0 declarada por SIGAM).",
        "map_date": None,
        "map_date_note": "El servicio no declara la fecha del levantamiento; cada hoja tiene su propia publicación "
                         "que debe consultarse.",
        "catalog_modified_at": None, "encoding": "UTF-8",
        "identity_fields": list(LAYERS["AR"].identity_fields), "code_field": "cod_ulito", "name_field": "nombre",
        "description_field": "descrip_litologica", "sheet_field": "nro_hoja", "absent_description_markers": ["", "*"],
        "requests": _request_entries(acquisition, ("argentina_wfs",)),
        "layer_features_total": None, "layer_null_geometry_features": None,
        "transformations": [
            f"WFS 1.0.0 GetFeature en {WFS_BASE}, GeoJSON, srsName EPSG:4326 explícito, una petición por sector con "
            "su bbox exacta; las respuestas se verificaron íntegras (numberMatched = numberReturned, sin alcanzar el límite).",
            "BBOX devuelve polígonos completos que pueden extenderse fuera de la consulta; se recortan al sector.",
            *COMMON_TRANSFORMATIONS],
        "limitations": [
            "Escala 1:250.000, pero la capa no cubre todo el territorio: un sector puede quedar sin cobertura en esta capa.",
            "Fecha del levantamiento desconocida (null); la edad por hoja requiere consultar su publicación.",
            "Muchos campos de la capa vienen vacíos y se conservan vacíos.",
        ],
    }
    return [chile, argentina]


def _questions(site: dict, scale: int) -> list[str]:
    fractions = site["area_fractions"]
    questions = [
        f"¿Qué unidades afloran realmente en el sector? Este mapa es regional (1:{scale:,}".replace(",", ".")
        + "): contrastar con la cartografía de detalle disponible y con observación en terreno."
    ]
    if fractions["unmapped"] > 0:
        questions.append("¿Qué hay en la parte sin polígono? La ausencia de cobertura en esta capa no indica ausencia de geología.")
    if fractions["covered_ambiguous"] > 0:
        questions.append("¿Cuál de las unidades que se solapan rige? Consultar la fuente oficial para resolver la ambigüedad.")
    if fractions["covered_by_units_without_description"] > 0:
        questions.append("Parte del área cubierta tiene unidades sin descripción original: ¿qué dice la hoja o publicación de origen?")
    if fractions["unusable_upper_bound"] > 0:
        questions.append("Hay geometrías de la fuente no utilizables en el sector: ¿puede la fuente entregarlas corregidas?")
    if site["availability"] == "no_coverage":
        questions.append("Esta capa no cubre el sector: ¿existe cartografía oficial más detallada o de otro proveedor?")
    return questions


def load_candidates(path: Path) -> tuple[list[dict], bytes]:
    data = path.read_bytes()
    candidates = json.loads(data.decode("utf-8"))
    ids = [candidate["site_id"] for candidate in candidates]
    if len(ids) != 7 or len(set(ids)) != 7:
        raise GeologyError("Exactly seven distinct sectors are expected in the snapshot.")
    if len({candidate["data_snapshot_version"] for candidate in candidates}) != 1:
        raise GeologyError("The sectors do not share a single snapshot version.")
    for candidate in candidates:
        if candidate["country"] not in LAYERS or candidate["geometry"]["type"] != "Polygon":
            raise GeologyError(f"{candidate['site_id']}: unsupported country or geometry.")
    return candidates, data


def build_index(candidates: list[dict], candidates_bytes: bytes, acquisition: dict, candidates_file: str) -> dict:
    import hashlib
    records = {record["role"]: record for record in acquisition["records"] if record["role"] != "argentina_wfs"}
    wfs = {record["site_id"]: record for record in acquisition["records"] if record["role"] == "argentina_wfs"}
    catalog = json.loads(records["chile_catalog_metadata"]["_body"].decode("utf-8"))["result"]
    chile_features, chile_null = parse_features(
        json.loads(inspect_zip(records["chile_layer"]["_body"])["geojson"].decode("utf-8")), "objectid")
    chile_total = len(chile_features) + chile_null
    sources = _sources(acquisition, chile_total, chile_null, catalog)
    scale = {source["source_id"]: source["scale_denominator"] for source in sources}
    sites = []
    for candidate in candidates:
        country = candidate["country"]
        layer = LAYERS[country]
        if country == "CL":
            features, request_ids = chile_features, [records["chile_layer"]["request_sha256"]]
        else:
            record = wfs[candidate["site_id"]]
            features = parse_features(json.loads(record["_body"].decode("utf-8")), "cod_ulito")[0]
            request_ids = [record["request_sha256"]]
        result = analyze_site(shape(candidate["geometry"]), features, layer)
        site = {
            "site_id": candidate["site_id"], "name": candidate["name"], "country": country,
            "geometry": candidate["geometry"], "source_id": layer.source_id, "request_ids": request_ids, **result,
        }
        site["verification_questions"] = _questions(site, scale[layer.source_id])
        sites.append(site)
    return {
        "kind": "analogos-geology-context", "schema_version": 1, "status": "preliminary_geological_context",
        "snapshot_version": candidates[0]["data_snapshot_version"], "candidates_file": candidates_file,
        "candidates_sha256": hashlib.sha256(candidates_bytes).hexdigest(), "pipeline_version": __version__,
        "processing": {k: v for k, v in processing_versions().items()} | {
            "area_crs": POLICY["area_crs"], "clip_space": POLICY["clip_space"]},
        "policy": POLICY, "sources": sources, "sites": sites, "limitations": LIMITATIONS,
        "editorial_note": EDITORIAL_NOTE,
    }


def build(out_dir: Path = OUT_DIR, raw_dir: Path = RAW_DIR, candidates_path: Path = CANDIDATES, *,
          http: Http | None = None, refresh: bool = False, offline: bool = False,
          replace=os.replace) -> tuple[dict, bool]:
    """Returns ``(index, cache_reused)``. Any error leaves the previous cache and package intact."""
    candidates, data = load_candidates(candidates_path)
    raw = prepare_raw(raw_dir, candidates, http=http, refresh=refresh, offline=offline)
    staging = None
    try:
        shown = candidates_path.relative_to(ROOT).as_posix() if candidates_path.is_relative_to(ROOT) else candidates_path.name
        index = build_index(candidates, data, raw.acquisition, shown)
        validate_package(index, candidates, data)  # contract AND semantics before installing anything.
        out_dir.parent.mkdir(parents=True, exist_ok=True)
        staging = Path(tempfile.mkdtemp(dir=out_dir.parent, prefix=f".{out_dir.name}."))
        (staging / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        validate_package(json.loads((staging / "index.json").read_text(encoding="utf-8")), candidates, data)
        staging.chmod(0o755)
        pairs = ([(raw.staging, raw_dir)] if raw.staging is not None else []) + [(staging, out_dir)]
        publish(pairs, replace)  # cache first: an artifact never points to a cache that is not installed
    finally:
        for temporary in (staging, raw.staging):
            if temporary is not None:
                shutil.rmtree(temporary, ignore_errors=True)
    return index, raw.reused


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--refresh", action="store_true", help="download again even if the cache is valid")
    parser.add_argument("--offline", action="store_true", help="no network access; fails if the cache is not valid")
    args = parser.parse_args(argv)
    try:
        index, reused = build(refresh=args.refresh, offline=args.offline)
    except PackageStateError as error:
        print(f"Geology context ERROR: {error}", file=sys.stderr)
        return 1
    except (GeologyError, ContractError, OSError, KeyError, ValueError) as error:
        print(f"Geology context ERROR: {error}\nThe previous state of the cache and the package is kept "
              "(replacements are undone; no guarantee against a power cut in the middle of them).", file=sys.stderr)
        return 1
    print(f"Geology context ({'cache reused, no network' if reused else 'new download'}): {OUT_DIR}")
    for site in index["sites"]:
        f = site["area_fractions"]
        print(f"  {site['site_id']}: {site['availability']}, covered {f['covered_total']:.6%}, no coverage "
              f"{f['unmapped']:.6%}, ambiguous {f['covered_ambiguous']:.6%}, units {len(site['units'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
