"""Public, bounded acquisition of official geology data (SERNAGEOMIN via MMA and SEGEMAR/SIGAM).

No credentials: it does not read ``.env`` or environment variables. Only https to two public hosts, with no
redirects to other hosts, with byte and time limits. Valid responses are stored as
is in ``data/raw/geology-context-v1/`` (ignored by git) together with the exact request, its SHA-256 and the actual
download time. Error bodies and headers are never stored. A valid cache rebuilds without network access;
any change to the request or to the sector geometry invalidates it. The new cache is fully validated in a
sibling directory and is NOT installed until the derived package has also been built and validated
(``prepare_raw`` + ``publish``): neither a source outage nor a later failure deletes previously valid data.
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
from pipelines.geology_policy import (  # noqa: F401  (re-exported for module users)
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
    """WFS GetFeature 1.0.0 GeoJSON with explicit CRS. Without ``resultType=hits`` (found to be defective)."""
    box = ",".join(repr(float(value)) for value in bounds) + ",EPSG:4326"
    query = urlencode([
        ("service", "WFS"), ("version", "1.0.0"), ("request", "GetFeature"), ("typeName", WFS_LAYER),
        ("maxFeatures", str(WFS_MAX_FEATURES)), ("srsName", "EPSG:4326"), ("bbox", box),
        ("outputFormat", "application/json"),
    ])
    return {"method": "GET", "url": f"{WFS_BASE}?{query}"}


# --- Content validation (applied to downloaded data and also when re-reading the cache) -----------------

def _json(data: bytes, what: str):
    try:
        return json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        raise GeologyError(f"{what} is not readable UTF-8 JSON.") from None


def validate_ckan(data: bytes) -> dict:
    package = _json(data, "The CKAN metadata")
    result = package.get("result") if isinstance(package, dict) else None
    if not isinstance(result, dict) or package.get("success") is not True or result.get("name") != "geologia-base" \
            or not isinstance(result.get("resources"), list):
        raise GeologyError("The CKAN metadata does not describe the «geologia-base» dataset.")
    for resource in result["resources"]:
        url = resource.get("url") if isinstance(resource, dict) else None
        check_url(url, "recurso CKAN")
    return result


def check_url(url, what: str) -> None:
    target = urlsplit(url) if isinstance(url, str) else None
    if target is None or target.scheme != "https" or target.hostname not in ALLOWED_HOSTS:
        raise GeologyError(f"URL not allowed in {what}.")


def inspect_zip(data: bytes) -> dict:
    """Actual ZIP content without extracting to disk: returns the type and, if it is GeoJSON, its bytes."""
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise GeologyError("The resource is not a readable ZIP.") from None
    with archive:
        infos = archive.infolist()
        total = sum(info.file_size for info in infos)
        if not infos or total > MAX_UNCOMPRESSED_BYTES or any(
            not SAFE_MEMBER.match(info.filename) or info.is_dir() or info.flag_bits & 0x1 for info in infos
        ):
            raise GeologyError("The ZIP has disallowed, encrypted or oversized members.")
        if total > MAX_COMPRESSION_RATIO * max(len(data), 1):
            raise GeologyError("The ZIP exceeds the allowed compression ratio.")
        names = [info.filename.lower() for info in infos]
        if any(name.endswith(".shp") for name in names):
            return {"format": "shapefile", "members": sorted(info.filename for info in infos), "geojson": None}
        geojson = [info for info in infos if info.filename.lower().endswith(".geojson")]
        if len(geojson) != 1 or len(infos) != 1:
            raise GeologyError("The ZIP does not contain exactly one GeoJSON.")
        payload = archive.read(geojson[0])  # limit already verified with file_size; zipfile validates the CRC
        if len(payload) != geojson[0].file_size:
            raise GeologyError("The GeoJSON size does not match its ZIP header.")
        return {"format": "geojson", "members": [geojson[0].filename], "geojson": payload}


def validate_chile_collection(payload: bytes) -> dict:
    """Chile GeoJSON: CRS84, schema and complete geometric check (the same as Argentina)."""
    collection = _json(payload, "The Chile GeoJSON")
    crs = (collection.get("crs") or {}).get("properties", {}).get("name") if isinstance(collection, dict) else None
    if crs != CL_CRS:
        raise GeologyError("The Chile GeoJSON does not declare the expected CRS (CRS84).")
    features = collection.get("features")
    if not isinstance(features, list) or not features:
        raise GeologyError("The Chile GeoJSON has no features.")
    for feature in features:
        properties = feature.get("properties") if isinstance(feature, dict) else None
        if not isinstance(properties, dict) or any(name not in properties for name in CL_REQUIRED):
            raise GeologyError("A Chile feature does not have the expected schema.")
    parsed, _ = parse_features(collection, "objectid")  # structure and every vertex, before installing anything
    if not parsed:
        raise GeologyError("The Chile GeoJSON has no geometries.")
    return collection


def validate_wfs(data: bytes, bounds: list[float]) -> dict:
    """Complete SIGAM response: not truncated, expected CRS, schema, geometry and bbox of each feature.

    BBOX returns complete polygons that may extend far outside the bbox: vertices are not required to
    lie inside it. It is required, however, that the bbox of each feature intersect the query, which reveals
    inverted axes. With zero features there is nothing to check and it is a valid response (``crs: null``).
    """
    collection = _json(data, "The WFS response")
    if not isinstance(collection, dict) or collection.get("type") != "FeatureCollection" \
            or not isinstance(collection.get("features"), list):
        raise GeologyError("The WFS response is not a FeatureCollection.")
    features = collection["features"]
    matched, returned = collection.get("numberMatched"), collection.get("numberReturned")
    if not (isinstance(matched, int) and isinstance(returned, int) and not isinstance(matched, bool)
            and matched == returned == len(features)):
        raise GeologyError("numberMatched, numberReturned and the features do not match: truncated or inconsistent response.")
    if returned >= WFS_MAX_FEATURES:
        raise GeologyError("The response reached the feature limit: rejected as possibly truncated.")
    declared = collection.get("crs")
    if declared is None and not features:
        pass  # GeoServer omits the CRS (crs: null) when there are no features; there are no coordinates to interpret
    elif not isinstance(declared, dict) or (declared.get("properties") or {}).get("name") != AR_CRS:
        raise GeologyError("The WFS response does not declare EPSG:4326 as CRS.")
    for feature in features:
        properties = feature.get("properties") if isinstance(feature, dict) else None
        if not isinstance(properties, dict) or any(name not in properties for name in AR_REQUIRED):
            raise GeologyError("A WFS feature does not have the expected schema.")
    parsed, empty = parse_features(collection, "cod_ulito")
    if empty or len(parsed) != len(features):
        raise GeologyError("A WFS feature has no geometry.")
    west, south, east, north = bounds
    for item in parsed:
        item_west, item_south, item_east, item_north = item.geometry.bounds
        if item_east < west or item_west > east or item_north < south or item_south > north:
            raise GeologyError("A feature bbox does not intersect the query: possibly wrong axis order.")
    return collection


# --- HTTP ---------------------------------------------------------------------------------------------

class Http:
    """GET with limits, retries and manual redirects only to allowed hosts."""

    def __init__(self, get=None, sleep=time.sleep, clock=utc_now) -> None:
        self._get, self._sleep, self.clock = get, sleep, clock

    def fetch(self, url: str, max_bytes: int, accept: str) -> dict:
        check_url(url, "request")
        if self._get is None:
            import requests
            self._get = requests.get
        outcome, current = "no response", url
        for attempt in range(ATTEMPTS):
            try:
                response = self._follow(current, max_bytes, accept)
            except OSError as error:  # requests.RequestException inherits from OSError
                outcome = f"network failure ({type(error).__name__})"
            else:
                if response["status"] == 200:
                    return {**response, "acquired_at": self.clock()}
                outcome = f"HTTP {response['status']}"
                if response["status"] not in TRANSIENT_STATUS:
                    break
            if attempt + 1 < ATTEMPTS:
                self._sleep(2 * (attempt + 1))
        # No body or headers: an error could reflect unwanted content.
        raise GeologyError(f"{urlsplit(url).hostname} did not respond correctly: {outcome}.")

    def _follow(self, url: str, max_bytes: int, accept: str) -> dict:
        for _ in range(MAX_REDIRECTS + 1):
            response = self._get(url, timeout=TIMEOUT, allow_redirects=False, stream=True,
                                 headers={"Accept": accept, "User-Agent": "AnalogOS-geology-context/1"})
            try:
                if response.status_code in (301, 302, 303, 307, 308):
                    url = urljoin(url, response.headers.get("Location", ""))
                    check_url(url, "redirect")
                    continue
                declared = response.headers.get("Content-Length")
                if declared is not None and declared.isdigit() and int(declared) > max_bytes:
                    raise GeologyError("The response exceeds the byte limit.")
                body = bytearray()
                for chunk in response.iter_content(65536):
                    body += chunk
                    if len(body) > max_bytes:
                        raise GeologyError("The response exceeds the byte limit.")
                return {"status": response.status_code, "body": bytes(body), "final_url": url,
                        "content_type": response.headers.get("Content-Type")}
            finally:
                close = getattr(response, "close", None)
                if close:
                    close()
        raise GeologyError("Demasiadas redirecciones.")


# --- Acquisition, cache and transactional publication --------------------------------------------------

ROLES = ("chile_catalog_metadata", "chile_layer", "argentina_wfs")
SAFE_FILE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
UTC_TIME = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")


class PackageStateError(GeologyError):
    """A replacement was left half done; the message describes the actual state on disk."""


def plan_requests(sites: list[dict]) -> dict:
    """Expected cache requests derived from the exact geometries of the Argentine sectors."""
    return {site["site_id"]: {"request": wfs_request(aoi_bounds(site["geometry"])), "geometry": site["geometry"]}
            for site in sites if site["country"] == "AR"}


def _record(role: str, source_id: str, request: dict, file: str, body: bytes, response: dict, **extra) -> dict:
    return {
        "role": role, "source_id": source_id, "request": request, "request_sha256": request_digest(request),
        "file": file, "sha256": sha256(body), "bytes": len(body), "http_status": response["status"],
        "content_type": response["content_type"], "acquired_at": response["acquired_at"], **extra,
    }


def acquire(staging: Path, sites: list[dict], http: Http) -> dict:
    """Downloads everything needed into ``staging`` and returns the acquisition record (without writing it)."""
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
        rejected.append(label)  # Real shapefile: it is not parsed (no pyshp/GDAL); the other resource is tried
    if chosen is None:
        raise GeologyError("No CKAN resource contains a usable GeoJSON.")
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
    """Safe name and non-symlink checked BEFORE opening; it is opened without following links."""
    if not isinstance(name, str) or not SAFE_FILE.match(name):
        raise ValueError("cache file name not allowed")
    path = directory / name
    if path.is_symlink() or not path.is_file():
        raise ValueError("cache file missing or a symbolic link")
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    with os.fdopen(descriptor, "rb") as handle:
        return handle.read()


def _check_record(record: dict, body: bytes) -> None:
    request = record["request"]
    if record["role"] not in ROLES or request.get("method") != "GET" or set(request) != {"method", "url"}:
        raise ValueError("invalid role or request")
    check_url(request["url"], "cache request")
    if not (isinstance(record["sha256"], str) and HEX64.match(record["sha256"]) and sha256(body) == record["sha256"]
            and record["bytes"] == len(body) and not isinstance(record["bytes"], bool)
            and record["request_sha256"] == request_digest(request) and record["http_status"] == 200
            and isinstance(record["acquired_at"], str) and UTC_TIME.match(record["acquired_at"])):
        raise ValueError("inconsistent hash, size, status or date")
    datetime.strptime(record["acquired_at"], "%Y-%m-%dT%H:%M:%SZ")


def load_cache(directory: Path, sites: list[dict]) -> dict | None:
    """Validated cache or ``None``. Checks names, links, expected request, geometry, hashes and content."""
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
            return None  # files that the acquisition does not declare
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
    """Acquisition ready to build. ``staging`` is the new cache NOT yet installed (None if reused)."""
    acquisition: dict
    staging: Path | None
    reused: bool


def prepare_raw(directory: Path, sites: list[dict], *, http: Http | None = None, refresh: bool = False,
                offline: bool = False) -> RawData:
    """Valid cache reused without network or copies, or complete acquisition in a sibling directory.

    It installs nothing: the caller builds and validates the package and only then ``publish`` replaces the
    cache and the package together. The caller must delete ``staging`` if it does not publish it.
    """
    if not refresh:
        existing = load_cache(directory, sites)
        if existing is not None:
            return RawData(existing, None, True)
    if offline:
        raise GeologyError("The local cache does not exist or is not valid and offline mode was requested.")
    directory.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(dir=directory.parent, prefix=f".{directory.name}."))
    try:
        acquisition = acquire(staging, sites, http or Http())
        (staging / "acquisition.json").write_text(
            json.dumps(acquisition, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        loaded = load_cache(staging, sites)
        if loaded is None:
            raise GeologyError("The freshly downloaded cache did not pass validation.")
        staging.chmod(0o755)
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    return RawData(loaded, staging, False)


def publish(pairs: list[tuple[Path, Path]], replace=os.replace) -> None:
    """Replaces several ``(staging, destino)`` directories in order; if one fails, it undoes the previous ones.

    Known limitation (as in ADR-004): there is no atomicity against a power failure or a ``kill`` between the
    renames; in that case the destinations may be left mixed (which is why the cache is installed first) and
    hidden ``.<nombre>.previo.<pid>`` directories with the previous state may remain.
    """
    done: list[tuple[Path, Path, Path | None]] = []
    failure: OSError | None = None
    stuck: tuple[Path, Path, OSError] | None = None  # destination that was left unrestored: (destination, backup, error)
    for staging, target in pairs:
        backup = None
        try:
            if target.exists():
                backup = target.with_name(f".{target.name}.previo.{os.getpid()}")
                replace(target, backup)
        except OSError as error:
            failure = error  # nothing in this pair changed
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
        for staging, target, backup in reversed(done):  # the previous pairs are undone anyway
            try:
                replace(target, staging)
                if backup is not None:
                    replace(backup, target)
            except OSError as error:
                problems.append(f"{target} ({error})")
        if stuck is not None:
            target, backup, error = stuck
            problems.insert(0, f"{target} does not exist now and its previous state was left in {backup} ({error})")
        if problems:
            raise PackageStateError(
                f"Could not install the result ({failure}) nor fully restore the previous state: "
                f"{'; '.join(problems)}. The hidden '.previo' backups keep the previous state."
            ) from failure
        raise GeologyError(
            f"Could not install the result ({failure}); the previous state was restored."
        ) from failure
    leftovers = []
    for _, target, backup in done:
        if backup is not None:
            shutil.rmtree(backup, ignore_errors=True)
            if backup.exists():
                leftovers.append(str(backup))
    if leftovers:
        raise PackageStateError(
            "The new result was installed, but the previous backup could not be removed: "
            + ", ".join(leftovers) + ". Delete it before building again."
        )
