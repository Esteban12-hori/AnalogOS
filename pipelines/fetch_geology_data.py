"""Adquisición pública y acotada de geología oficial (SERNAGEOMIN vía MMA y SEGEMAR/SIGAM).

Sin credenciales: no lee ``.env`` ni variables de entorno. Solo https hacia dos hosts públicos, sin
redirecciones hacia otros hosts, con límites de bytes y de tiempo. Las respuestas válidas se guardan tal
cual en ``data/raw/geology-context-v1/`` (ignorado por git) con la petición exacta, su SHA-256 y la hora
real de la descarga. Nunca se guardan cuerpos de error ni cabeceras. Una caché válida reconstruye sin red;
cualquier cambio de petición o de geometría del sector la invalida. La caché nueva se valida completa en un
directorio hermano y NO se instala hasta que el paquete derivado también se haya construido y validado
(``prepare_raw`` + ``publish``): ni una caída de la fuente ni un fallo posterior borran lo válido anterior.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import re
import shutil
import tempfile
import time
from dataclasses import dataclass
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlsplit

from pipelines.contracts import ROOT
from pipelines.geology_coverage import GeologyError, parse_features
from pipelines.geology_policy import (  # noqa: F401  (se reexportan para los usuarios del módulo)
    ALLOWED_HOSTS, CKAN_PAGE, CKAN_URL, WFS_BASE, WFS_LAYER, WFS_MAX_FEATURES, WFS_PAGE, aoi_bounds, request_digest,
)

RAW_DIR = ROOT / "data" / "raw" / "geology-context-v1"
KIND = "analogos-geology-raw-acquisition"
SCHEMA_VERSION = 1


MAX_CKAN_BYTES = 2 * 1024 * 1024
MAX_ZIP_BYTES = 20 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024
MAX_COMPRESSION_RATIO = 50
MAX_WFS_BYTES = 8 * 1024 * 1024
TIMEOUT = (10, 90)
ATTEMPTS = 3
MAX_REDIRECTS = 3
TRANSIENT_STATUS = {429, 500, 502, 503, 504}

CL_CRS = "urn:ogc:def:crs:OGC:1.3:CRS84"
AR_CRS = "urn:ogc:def:crs:EPSG::4326"
CL_REQUIRED = ("objectid", "cod_geologia", "lithostrat", "lithology")
AR_REQUIRED = ("cod_ulito", "nro_hoja", "nombre", "descrip_litologica")
SAFE_MEMBER = re.compile(r"^[^/\\:\x00]+$")


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def wfs_request(bounds: list[float]) -> dict:
    """GetFeature WFS 1.0.0 GeoJSON con CRS explícito. Sin ``resultType=hits`` (comprobado defectuoso)."""
    box = ",".join(repr(float(value)) for value in bounds) + ",EPSG:4326"
    query = urlencode([
        ("service", "WFS"), ("version", "1.0.0"), ("request", "GetFeature"), ("typeName", WFS_LAYER),
        ("maxFeatures", str(WFS_MAX_FEATURES)), ("srsName", "EPSG:4326"), ("bbox", box),
        ("outputFormat", "application/json"),
    ])
    return {"method": "GET", "url": f"{WFS_BASE}?{query}"}


# --- Validación de contenido (se aplica a lo descargado y también al releer la caché) -----------------

def _json(data: bytes, what: str):
    try:
        return json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        raise GeologyError(f"{what} no es JSON UTF-8 legible.") from None


def validate_ckan(data: bytes) -> dict:
    package = _json(data, "El metadato CKAN")
    result = package.get("result") if isinstance(package, dict) else None
    if not isinstance(result, dict) or package.get("success") is not True or result.get("name") != "geologia-base" \
            or not isinstance(result.get("resources"), list):
        raise GeologyError("El metadato CKAN no describe el conjunto «geologia-base».")
    for resource in result["resources"]:
        url = resource.get("url") if isinstance(resource, dict) else None
        check_url(url, "recurso CKAN")
    return result


def check_url(url, what: str) -> None:
    target = urlsplit(url) if isinstance(url, str) else None
    if target is None or target.scheme != "https" or target.hostname not in ALLOWED_HOSTS:
        raise GeologyError(f"URL no permitida en {what}.")


def inspect_zip(data: bytes) -> dict:
    """Contenido real del ZIP sin extraer a disco: devuelve el tipo y, si es GeoJSON, sus bytes."""
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise GeologyError("El recurso no es un ZIP legible.") from None
    with archive:
        infos = archive.infolist()
        total = sum(info.file_size for info in infos)
        if not infos or total > MAX_UNCOMPRESSED_BYTES or any(
            not SAFE_MEMBER.match(info.filename) or info.is_dir() or info.flag_bits & 0x1 for info in infos
        ):
            raise GeologyError("El ZIP tiene miembros no permitidos, cifrados o demasiado grandes.")
        if total > MAX_COMPRESSION_RATIO * max(len(data), 1):
            raise GeologyError("El ZIP excede la razón de compresión permitida.")
        names = [info.filename.lower() for info in infos]
        if any(name.endswith(".shp") for name in names):
            return {"format": "shapefile", "members": sorted(info.filename for info in infos), "geojson": None}
        geojson = [info for info in infos if info.filename.lower().endswith(".geojson")]
        if len(geojson) != 1 or len(infos) != 1:
            raise GeologyError("El ZIP no contiene exactamente un GeoJSON.")
        payload = archive.read(geojson[0])  # tope ya verificado con file_size; zipfile valida el CRC
        if len(payload) != geojson[0].file_size:
            raise GeologyError("El tamaño del GeoJSON no coincide con su cabecera ZIP.")
        return {"format": "geojson", "members": [geojson[0].filename], "geojson": payload}


def validate_chile_collection(payload: bytes) -> dict:
    """GeoJSON de Chile: CRS84, esquema y control geométrico completo (el mismo que Argentina)."""
    collection = _json(payload, "El GeoJSON de Chile")
    crs = (collection.get("crs") or {}).get("properties", {}).get("name") if isinstance(collection, dict) else None
    if crs != CL_CRS:
        raise GeologyError("El GeoJSON de Chile no declara el CRS esperado (CRS84).")
    features = collection.get("features")
    if not isinstance(features, list) or not features:
        raise GeologyError("El GeoJSON de Chile no trae entidades.")
    for feature in features:
        properties = feature.get("properties") if isinstance(feature, dict) else None
        if not isinstance(properties, dict) or any(name not in properties for name in CL_REQUIRED):
            raise GeologyError("Una entidad de Chile no trae el esquema esperado.")
    parsed, _ = parse_features(collection, "objectid")  # estructura y cada vértice, antes de instalar nada
    if not parsed:
        raise GeologyError("El GeoJSON de Chile no trae geometrías.")
    return collection


def validate_wfs(data: bytes, bounds: list[float]) -> dict:
    """Respuesta SIGAM íntegra: sin truncar, CRS esperado, esquema, geometría y bbox de cada entidad.

    BBOX devuelve polígonos completos que pueden extenderse lejos fuera del bbox: no se exige que los
    vértices estén dentro. Sí se exige que el bbox de cada entidad intersecte la consulta, lo que delata
    ejes invertidos. Con cero entidades no hay nada que comprobar y es una respuesta válida (``crs: null``).
    """
    collection = _json(data, "La respuesta WFS")
    if not isinstance(collection, dict) or collection.get("type") != "FeatureCollection" \
            or not isinstance(collection.get("features"), list):
        raise GeologyError("La respuesta WFS no es una FeatureCollection.")
    features = collection["features"]
    matched, returned = collection.get("numberMatched"), collection.get("numberReturned")
    if not (isinstance(matched, int) and isinstance(returned, int) and not isinstance(matched, bool)
            and matched == returned == len(features)):
        raise GeologyError("numberMatched, numberReturned y las entidades no coinciden: respuesta truncada o inconsistente.")
    if returned >= WFS_MAX_FEATURES:
        raise GeologyError("La respuesta alcanzó el límite de entidades: se rechaza por posible truncamiento.")
    declared = collection.get("crs")
    if declared is None and not features:
        pass  # GeoServer omite el CRS (crs: null) cuando no hay entidades; no hay coordenadas que interpretar
    elif not isinstance(declared, dict) or (declared.get("properties") or {}).get("name") != AR_CRS:
        raise GeologyError("La respuesta WFS no declara EPSG:4326 como CRS.")
    for feature in features:
        properties = feature.get("properties") if isinstance(feature, dict) else None
        if not isinstance(properties, dict) or any(name not in properties for name in AR_REQUIRED):
            raise GeologyError("Una entidad WFS no trae el esquema esperado.")
    parsed, empty = parse_features(collection, "cod_ulito")
    if empty or len(parsed) != len(features):
        raise GeologyError("Una entidad WFS no trae geometría.")
    west, south, east, north = bounds
    for item in parsed:
        item_west, item_south, item_east, item_north = item.geometry.bounds
        if item_east < west or item_west > east or item_north < south or item_south > north:
            raise GeologyError("El bbox de una entidad no intersecta la consulta: posible orden de ejes incorrecto.")
    return collection


# --- HTTP ---------------------------------------------------------------------------------------------

class Http:
    """GET con límites, reintentos y redirecciones manuales solo hacia hosts permitidos."""

    def __init__(self, get=None, sleep=time.sleep, clock=utc_now) -> None:
        self._get, self._sleep, self.clock = get, sleep, clock

    def fetch(self, url: str, max_bytes: int, accept: str) -> dict:
        check_url(url, "petición")
        if self._get is None:
            import requests
            self._get = requests.get
        outcome, current = "sin respuesta", url
        for attempt in range(ATTEMPTS):
            try:
                response = self._follow(current, max_bytes, accept)
            except OSError as error:  # requests.RequestException hereda de OSError
                outcome = f"fallo de red ({type(error).__name__})"
            else:
                if response["status"] == 200:
                    return {**response, "acquired_at": self.clock()}
                outcome = f"HTTP {response['status']}"
                if response["status"] not in TRANSIENT_STATUS:
                    break
            if attempt + 1 < ATTEMPTS:
                self._sleep(2 * (attempt + 1))
        # Sin cuerpo ni cabeceras: un error podría reflejar contenido no deseado.
        raise GeologyError(f"{urlsplit(url).hostname} no respondió correctamente: {outcome}.")

    def _follow(self, url: str, max_bytes: int, accept: str) -> dict:
        for _ in range(MAX_REDIRECTS + 1):
            response = self._get(url, timeout=TIMEOUT, allow_redirects=False, stream=True,
                                 headers={"Accept": accept, "User-Agent": "AnalogOS-geology-context/1"})
            try:
                if response.status_code in (301, 302, 303, 307, 308):
                    url = urljoin(url, response.headers.get("Location", ""))
                    check_url(url, "redirección")
                    continue
                declared = response.headers.get("Content-Length")
                if declared is not None and declared.isdigit() and int(declared) > max_bytes:
                    raise GeologyError("La respuesta excede el límite de bytes.")
                body = bytearray()
                for chunk in response.iter_content(65536):
                    body += chunk
                    if len(body) > max_bytes:
                        raise GeologyError("La respuesta excede el límite de bytes.")
                return {"status": response.status_code, "body": bytes(body), "final_url": url,
                        "content_type": response.headers.get("Content-Type")}
            finally:
                close = getattr(response, "close", None)
                if close:
                    close()
        raise GeologyError("Demasiadas redirecciones.")


# --- Adquisición, caché y publicación transaccional --------------------------------------------------

ROLES = ("chile_catalog_metadata", "chile_layer", "argentina_wfs")
SAFE_FILE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
UTC_TIME = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")


class PackageStateError(GeologyError):
    """Un reemplazo quedó a medias; el mensaje describe el estado real en disco."""


def plan_requests(sites: list[dict]) -> dict:
    """Peticiones esperadas de la caché a partir de las geometrías exactas de los sectores argentinos."""
    return {site["site_id"]: {"request": wfs_request(aoi_bounds(site["geometry"])), "geometry": site["geometry"]}
            for site in sites if site["country"] == "AR"}


def _record(role: str, source_id: str, request: dict, file: str, body: bytes, response: dict, **extra) -> dict:
    return {
        "role": role, "source_id": source_id, "request": request, "request_sha256": request_digest(request),
        "file": file, "sha256": sha256(body), "bytes": len(body), "http_status": response["status"],
        "content_type": response["content_type"], "acquired_at": response["acquired_at"], **extra,
    }


def acquire(staging: Path, sites: list[dict], http: Http) -> dict:
    """Descarga todo lo necesario en ``staging`` y devuelve el registro de adquisición (sin escribirlo)."""
    records = []
    ckan_request = {"method": "GET", "url": CKAN_URL}
    ckan = http.fetch(CKAN_URL, MAX_CKAN_BYTES, "application/json")
    resources = validate_ckan(ckan["body"])["resources"]
    (staging / "ckan-package_show.json").write_bytes(ckan["body"])
    records.append(_record("chile_catalog_metadata", "cl-sernageomin-mma-geologia-base", ckan_request,
                           "ckan-package_show.json", ckan["body"], ckan))
    rejected, chosen = [], None
    for resource in resources:
        url = resource["url"]
        if not urlsplit(url).path.lower().endswith(".zip"):
            continue
        answer = http.fetch(url, MAX_ZIP_BYTES, "application/zip")
        content = inspect_zip(answer["body"])
        label = {"resource_id": resource.get("id"), "labeled_format": resource.get("format"), "url": url,
                 "sha256": sha256(answer["body"]), "bytes": len(answer["body"]), "actual_format": content["format"]}
        if content["format"] == "geojson":
            validate_chile_collection(content["geojson"])
            chosen = (resource, answer, content)
            break
        rejected.append(label)  # Shapefile real: no se parsea (sin pyshp/GDAL); se prueba el otro recurso
    if chosen is None:
        raise GeologyError("Ningún recurso de CKAN contiene un GeoJSON utilizable.")
    resource, answer, content = chosen
    (staging / "cl-geologia-base.zip").write_bytes(answer["body"])
    records.append(_record(
        "chile_layer", "cl-sernageomin-mma-geologia-base", {"method": "GET", "url": resource["url"]},
        "cl-geologia-base.zip", answer["body"], answer,
        resource_id=resource.get("id"), labeled_format=resource.get("format"), actual_format="geojson",
        zip_member=content["members"][0], member_sha256=sha256(content["geojson"]),
        rejected_resources=rejected,
    ))
    for site_id, plan in plan_requests(sites).items():
        answer = http.fetch(plan["request"]["url"], MAX_WFS_BYTES, "application/json")
        collection = validate_wfs(answer["body"], aoi_bounds(plan["geometry"]))
        name = f"{site_id}.json"
        (staging / name).write_bytes(answer["body"])
        records.append(_record("argentina_wfs", "ar-segemar-sigam-e250k-unidad-geologica", plan["request"], name,
                               answer["body"], answer, site_id=site_id, aoi_geometry=plan["geometry"],
                               server_timestamp=collection.get("timeStamp"),
                               number_matched=collection["numberMatched"],
                               number_returned=collection["numberReturned"]))
    return {"kind": KIND, "schema_version": SCHEMA_VERSION, "records": records}


def _read_safe(directory: Path, name) -> bytes:
    """Nombre seguro y no-symlink comprobados ANTES de abrir; se abre sin seguir enlaces."""
    if not isinstance(name, str) or not SAFE_FILE.match(name):
        raise ValueError("nombre de archivo de caché no permitido")
    path = directory / name
    if path.is_symlink() or not path.is_file():
        raise ValueError("archivo de caché ausente o enlace simbólico")
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    with os.fdopen(descriptor, "rb") as handle:
        return handle.read()


def _check_record(record: dict, body: bytes) -> None:
    request = record["request"]
    if record["role"] not in ROLES or request.get("method") != "GET" or set(request) != {"method", "url"}:
        raise ValueError("rol o petición inválidos")
    check_url(request["url"], "petición de caché")
    if not (isinstance(record["sha256"], str) and HEX64.match(record["sha256"]) and sha256(body) == record["sha256"]
            and record["bytes"] == len(body) and not isinstance(record["bytes"], bool)
            and record["request_sha256"] == request_digest(request) and record["http_status"] == 200
            and isinstance(record["acquired_at"], str) and UTC_TIME.match(record["acquired_at"])):
        raise ValueError("hash, tamaño, estado o fecha incoherentes")
    datetime.strptime(record["acquired_at"], "%Y-%m-%dT%H:%M:%SZ")


def load_cache(directory: Path, sites: list[dict]) -> dict | None:
    """Caché validada o ``None``. Comprueba nombres, enlaces, petición esperada, geometría, hashes y contenido."""
    try:
        if directory.is_symlink() or not directory.is_dir():
            return None
        acquisition = json.loads(_read_safe(directory, "acquisition.json").decode("utf-8"))
        if acquisition.get("kind") != KIND or acquisition.get("schema_version") != SCHEMA_VERSION:
            return None
        files, records = {"acquisition.json"}, {}
        for record in acquisition["records"]:
            body = _read_safe(directory, record["file"])
            _check_record(record, body)
            if record["file"] in files:
                return None
            files.add(record["file"])
            records.setdefault(record["role"], []).append(record)
            record["_body"] = body
        if {entry.name for entry in directory.iterdir()} != files:
            return None  # archivos que la adquisición no declara
        if [len(records.get(role, [])) for role in ("chile_catalog_metadata", "chile_layer")] != [1, 1]:
            return None
        catalog, layer = records["chile_catalog_metadata"][0], records["chile_layer"][0]
        if catalog["request"]["url"] != CKAN_URL:
            return None
        resources = validate_ckan(catalog["_body"])["resources"]
        if layer["request"]["url"] not in {resource["url"] for resource in resources}:
            return None
        content = inspect_zip(layer["_body"])
        if content["format"] != "geojson" or sha256(content["geojson"]) != layer["member_sha256"] \
                or layer["actual_format"] != "geojson" or not isinstance(layer["rejected_resources"], list):
            return None
        validate_chile_collection(content["geojson"])
        planned = plan_requests(sites)
        wfs = records.get("argentina_wfs", [])
        found = {record["site_id"]: record for record in wfs}
        if set(found) != set(planned) or len(wfs) != len(planned):
            return None
        for site_id, plan in planned.items():
            record = found[site_id]
            if record["request"] != plan["request"] or record["aoi_geometry"] != plan["geometry"]:
                return None
            collection = validate_wfs(record["_body"], aoi_bounds(plan["geometry"]))
            if record["number_matched"] != collection["numberMatched"] \
                    or record["number_returned"] != collection["numberReturned"]:
                return None
    except (OSError, ValueError, KeyError, TypeError, AttributeError, zipfile.BadZipFile):
        return None
    return acquisition


@dataclass
class RawData:
    """Adquisición lista para construir. ``staging`` es la caché nueva SIN instalar (None si se reutiliza)."""
    acquisition: dict
    staging: Path | None
    reused: bool


def prepare_raw(directory: Path, sites: list[dict], *, http: Http | None = None, refresh: bool = False,
                offline: bool = False) -> RawData:
    """Caché válida reutilizada sin red ni copias, o adquisición completa en un directorio hermano.

    No instala nada: el llamador construye y valida el paquete y recién entonces ``publish`` reemplaza la
    caché y el paquete juntos. El llamador debe borrar ``staging`` si no lo publica.
    """
    if not refresh:
        existing = load_cache(directory, sites)
        if existing is not None:
            return RawData(existing, None, True)
    if offline:
        raise GeologyError("La caché local no existe o no es válida y se pidió trabajar sin red.")
    directory.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(dir=directory.parent, prefix=f".{directory.name}."))
    try:
        acquisition = acquire(staging, sites, http or Http())
        (staging / "acquisition.json").write_text(
            json.dumps(acquisition, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        loaded = load_cache(staging, sites)
        if loaded is None:
            raise GeologyError("La caché recién descargada no pasó la validación.")
        staging.chmod(0o755)
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    return RawData(loaded, staging, False)


def publish(pairs: list[tuple[Path, Path]], replace=os.replace) -> None:
    """Reemplaza varios directorios ``(staging, destino)`` en orden; si uno falla, deshace los anteriores.

    Límite conocido (como ADR-004): no hay atomicidad frente a un corte de energía o un ``kill`` entre los
    renombrados; en ese caso los destinos pueden quedar mezclados (por eso la caché se instala primero) y
    pueden quedar directorios ocultos ``.<nombre>.previo.<pid>`` con el estado anterior.
    """
    done: list[tuple[Path, Path, Path | None]] = []
    failure: OSError | None = None
    stuck: tuple[Path, Path, OSError] | None = None  # destino que quedó sin restaurar: (destino, respaldo, error)
    for staging, target in pairs:
        backup = None
        try:
            if target.exists():
                backup = target.with_name(f".{target.name}.previo.{os.getpid()}")
                replace(target, backup)
        except OSError as error:
            failure = error  # nada de este par cambió
            break
        try:
            replace(staging, target)
        except OSError as error:
            failure = error
            if backup is not None:
                try:
                    replace(backup, target)
                except OSError as restore_error:
                    stuck = (target, backup, restore_error)
            break
        done.append((staging, target, backup))
    if failure is not None:
        problems = []
        for staging, target, backup in reversed(done):  # los pares anteriores se deshacen igual
            try:
                replace(target, staging)
                if backup is not None:
                    replace(backup, target)
            except OSError as error:
                problems.append(f"{target} ({error})")
        if stuck is not None:
            target, backup, error = stuck
            problems.insert(0, f"{target} no existe ahora y su estado anterior quedó en {backup} ({error})")
        if problems:
            raise PackageStateError(
                f"No se pudo instalar el resultado ({failure}) ni restaurar por completo el estado anterior: "
                f"{'; '.join(problems)}. Los respaldos ocultos '.previo' conservan lo anterior."
            ) from failure
        raise GeologyError(
            f"No se pudo instalar el resultado ({failure}); se restauró el estado anterior."
        ) from failure
    leftovers = []
    for _, target, backup in done:
        if backup is not None:
            shutil.rmtree(backup, ignore_errors=True)
            if backup.exists():
                leftovers.append(str(backup))
    if leftovers:
        raise PackageStateError(
            "El resultado nuevo quedó instalado, pero no se pudo eliminar el respaldo anterior: "
            + ", ".join(leftovers) + ". Bórralo antes de volver a construir."
        )
