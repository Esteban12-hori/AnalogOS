"""Contexto visual Sentinel-2 offline para los candidatos del snapshot v2.

Pide a la Process API de Copernicus Sentinel Hub una vista RGB por candidato y
deja en ``artifacts/visual-context/`` tres PNG y un ``index.json`` público con
su procedencia. No toca ``artifacts/science-v2/`` ni el perfil: la imagen es
contexto para la inspección visual y no participa en ningún score.

Si el paquete local es válido se reutiliza sin red ni credenciales; ``--refresh``
fuerza una consulta nueva. Las credenciales se leen del entorno o de ``.env``
y solo viajan a los dos hosts oficiales. Nunca se registran tokens, cabeceras
ni cuerpos de respuesta. Ante cualquier error el paquete anterior queda intacto.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import shutil
import struct
import sys
import tarfile
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from pyproj import Geod

from pipelines import __version__
from pipelines.contracts import ROOT

CANDIDATES = ROOT / "artifacts" / "science-v2" / "candidate-details.json"
CONFIG = ROOT / "config" / "science_snapshot_v2.json"
DEFAULT_OUT = ROOT / "artifacts" / "visual-context"
V3_CANDIDATES = ROOT / "artifacts" / "science-v3" / "candidate-details.json"
V3_OUT = ROOT / "artifacts" / "visual-context-v3"

TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
PROCESS_URL = "https://sh.dataspace.copernicus.eu/process/v1"
OFFICIAL_HOSTS = {"identity.dataspace.copernicus.eu", "sh.dataspace.copernicus.eu"}
CREDENTIAL_NAMES = ("COPERNICUS_CLIENT_ID", "COPERNICUS_CLIENT_SECRET")

KIND = "analogos-visual-context"
SCHEMA_VERSION = 1
COLLECTION = "sentinel-2-l2a"
TIME_RANGE = {"from": "2025-12-01T00:00:00Z", "to": "2026-01-01T00:00:00Z"}
PERIOD_LABEL = "Mosaico de diciembre de 2025"
MAX_CLOUD_COVERAGE = 40
CRS = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
HEIGHT_PX = 768
GAIN = 2.0
MAX_MEMBER_BYTES = 20 * 1024 * 1024
ATTEMPTS = 3
TRANSIENT_STATUS = {429, 500, 502, 503, 504}
_GEOD = Geod(ellps="WGS84")

# Evalscript público: se guarda tal cual en index.json para reproducir la petición.
EVALSCRIPT = """//VERSION=3
// AnalogOS Chile - contexto visual Sentinel-2 L2A (analogos-s2-visual-v1).
// Color natural: reflectancia x GAIN; sampleType AUTO recorta a [0, 1] y cuantiza a 8 bits.
// Por pixel se toma la primera orbita con datos, en el orden que entrega el servicio.
var GAIN = 2.0;
var pixelsByOrbitIndex = {};
var pixelsWithoutData = 0;

function setup() {
  return {
    input: ["B04", "B03", "B02", "dataMask"],
    mosaicking: Mosaicking.ORBIT,
    output: { id: "default", bands: 4, sampleType: "AUTO" }
  };
}

function evaluatePixel(samples) {
  for (var i = 0; i < samples.length; i++) {
    var sample = samples[i];
    if (sample.dataMask === 1) {
      pixelsByOrbitIndex[i] = (pixelsByOrbitIndex[i] || 0) + 1;
      return [GAIN * sample.B04, GAIN * sample.B03, GAIN * sample.B02, 1];
    }
  }
  pixelsWithoutData += 1;
  return [0, 0, 0, 0];
}

function updateOutputMetadata(scenes, inputMetadata, outputMetadata) {
  outputMetadata.userData = {
    evalscript_version: "analogos-s2-visual-v1",
    gain: GAIN,
    service_version: inputMetadata.serviceVersion,
    normalization_factor: inputMetadata.normalizationFactor,
    orbits: scenes.orbits,
    pixels_by_orbit_index: pixelsByOrbitIndex,
    pixels_without_data: pixelsWithoutData
  };
}
"""

LIMITATIONS = [
    "Contexto visual preliminar: apoya la inspección; no valida el sitio ni cierra advertencias, "
    "restricciones territoriales o revisión experta.",
    "Es un mosaico de diciembre de 2025 (2025-12-01 a 2026-01-01 UTC), no una fecha única ni una imagen actual.",
    "El límite de nubosidad (40 %) se aplica por escena, no por píxel: la vista puede contener nubes, "
    "sombras o bruma.",
    "Vista reducida: cada píxel cubre unos 29 m; las bandas B02–B04 son de 10 m en origen. No muestra "
    "obstáculos ni pendientes a escala de rover.",
    "Color natural con realce lineal simple; no es reflectancia calibrada para análisis ni indica "
    "composición mineral.",
    "La imagen no participa en similitud, confianza, estabilidad ni factibilidad.",
]


SOURCE = {
    "provider": "Copernicus Data Space Ecosystem — Sentinel Hub Process API",
    "endpoint": PROCESS_URL,
    "collection": COLLECTION,
    "documentation": "https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process.html",
    "authentication": "OAuth2 client credentials; credenciales y token omitidos",
    "attribution": "Contiene datos modificados de Copernicus Sentinel (2025), procesados con "
                   "Sentinel Hub en Copernicus Data Space Ecosystem.",
}
PRODUCT = {
    "period_label": PERIOD_LABEL,
    "time_range": TIME_RANGE,
    "mosaicking": "ORBIT con orden leastCC; por píxel, primera órbita con datos",
    "max_cloud_coverage_percent": MAX_CLOUD_COVERAGE,
    "bands": ["B04", "B03", "B02", "dataMask"],
    "transformation": f"RGB = reflectancia L2A × {GAIN:g}, recortada a [0, 1] y cuantizada a 8 bits; "
                      "alfa 0 donde ninguna órbita tiene datos",
    "crs": CRS,
    "image_format": "PNG RGBA de 8 bits, tal como lo devolvió el servicio",
}


class VisualContextError(ValueError):
    """La consulta, la respuesta o el paquete local no son utilizables."""


class PackageStateError(VisualContextError):
    """El reemplazo del paquete quedó a medias; el mensaje describe el estado real en disco."""


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def configured_bboxes(sites: list[dict]) -> dict[str, list[float]]:
    """Bbox esperada por sitio a partir de centro y medio lado (sitios v2 o ventanas de la rejilla v3)."""
    return {
        site.get("site_id") or site["window_id"]: [
            site["longitude"] - site["half_size_degree"], site["latitude"] - site["half_size_degree"],
            site["longitude"] + site["half_size_degree"], site["latitude"] + site["half_size_degree"],
        ]
        for site in sites
    }


def site_plans(candidates: list[dict], config: dict | None = None, expected: dict[str, list[float]] | None = None) -> list[dict]:
    """Deriva bbox y tamaño de cada vista desde la geometría versionada del candidato.

    ``expected`` liga cada sitio a la configuración que lo generó; por defecto, los sitios del config v2.
    """
    expected = expected if expected is not None else configured_bboxes(config["sites"])
    plans = []
    for candidate in candidates:
        site_id = candidate["site_id"]
        if candidate["geometry"]["type"] != "Polygon" or site_id not in expected:
            raise VisualContextError(f"{site_id}: geometría o configuración no compatibles con el snapshot.")
        ring = candidate["geometry"]["coordinates"][0]
        longitudes, latitudes = [point[0] for point in ring], [point[1] for point in ring]
        bbox = [round(value, 6) for value in (min(longitudes), min(latitudes), max(longitudes), max(latitudes))]
        if any(abs(actual - wanted) > 1e-6 for actual, wanted in zip(bbox, expected[site_id])):
            raise VisualContextError(f"{site_id}: la geometría del candidato no coincide con la configuración versionada.")
        west, south, east, north = bbox
        middle = (south + north) / 2
        width_m = _GEOD.line_length([west, east], [middle, middle])
        height_m = _GEOD.line_length([west, west], [south, north])
        plans.append({
            "site_id": site_id,
            "name": candidate["name"],
            "snapshot_version": candidate["data_snapshot_version"],
            "bbox": bbox,
            # Ancho proporcional a la latitud para que el píxel sea aproximadamente cuadrado en terreno.
            "width": round(HEIGHT_PX * width_m / height_m),
            "height": HEIGHT_PX,
            "extent_km": {"width": round(width_m / 1000, 2), "height": round(height_m / 1000, 2)},
            "approx_meters_per_pixel": round(height_m / HEIGHT_PX, 1),
        })
    if len({plan["snapshot_version"] for plan in plans}) != 1:
        raise VisualContextError("Los candidatos no comparten una única versión de snapshot.")
    return plans


def build_request(plan: dict) -> dict:
    """Cuerpo público de la Process API; no contiene credenciales."""
    return {
        "input": {
            "bounds": {"bbox": plan["bbox"], "properties": {"crs": CRS}},
            "data": [{
                "type": COLLECTION,
                "dataFilter": {
                    "timeRange": TIME_RANGE,
                    "mosaickingOrder": "leastCC",
                    "maxCloudCoverage": MAX_CLOUD_COVERAGE,
                },
            }],
        },
        "output": {
            "width": plan["width"],
            "height": plan["height"],
            "responses": [
                {"identifier": "default", "format": {"type": "image/png"}},
                {"identifier": "userdata", "format": {"type": "application/json"}},
            ],
        },
        "evalscript": EVALSCRIPT,
    }


def parse_response(payload: bytes) -> tuple[bytes, dict]:
    """Lee en memoria las dos entradas esperadas del TAR; nunca extrae rutas a disco."""
    members: dict[str, bytes] = {}
    try:
        with tarfile.open(fileobj=io.BytesIO(payload), mode="r:") as archive:
            for member in archive:
                if member.name not in ("default.png", "userdata.json") or not member.isfile():
                    raise VisualContextError(f"Entrada inesperada en la respuesta TAR: {member.name!r}")
                if member.size > MAX_MEMBER_BYTES or member.name in members:
                    raise VisualContextError(f"Entrada duplicada o demasiado grande en el TAR: {member.name!r}")
                members[member.name] = archive.extractfile(member).read()
        userdata = json.loads(members["userdata.json"])
        image = members["default.png"]
    except (tarfile.TarError, KeyError, json.JSONDecodeError) as error:
        raise VisualContextError(f"La respuesta no es el TAR esperado ({type(error).__name__}).") from None
    if not isinstance(userdata, dict):
        raise VisualContextError("userdata.json no es un objeto.")
    return image, userdata


def png_size(data: bytes) -> tuple[int, int]:
    """Ancho y alto de un PNG RGBA de 8 bits; rechaza cualquier otro formato."""
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR" or data[24:26] != b"\x08\x06":
        raise VisualContextError("La imagen no es un PNG RGBA de 8 bits.")
    return struct.unpack(">II", data[16:24])


def _static_header(plans: list[dict]) -> dict:
    """Campos del índice que no dependen de la respuesta: deben coincidir con las constantes vigentes."""
    return {
        "kind": KIND,
        "schema_version": SCHEMA_VERSION,
        "status": "preliminary_visual_context",
        "snapshot_version": plans[0]["snapshot_version"],
        "source": SOURCE,
        "product": PRODUCT,
        "limitations": LIMITATIONS,
    }


def _static_site(plan: dict) -> dict:
    """Campos de un sitio que salen solo del candidato versionado y de la petición."""
    return {
        "site_id": plan["site_id"],
        "name": plan["name"],
        "image": f"{plan['site_id']}.png",
        "width": plan["width"],
        "height": plan["height"],
        "bbox": plan["bbox"],
        "extent_km": plan["extent_km"],
        "approx_meters_per_pixel": plan["approx_meters_per_pixel"],
        "request": build_request(plan),
    }


def _scene_summary(plan: dict, userdata: dict) -> dict:
    """Escenas consideradas y, si es certificable, usadas; todo derivado de la metadata devuelta."""
    orbits = userdata.get("orbits") if isinstance(userdata, dict) else None
    if not isinstance(orbits, list) or not orbits or not all(isinstance(orbit, dict) for orbit in orbits):
        raise VisualContextError(
            f"{plan['site_id']}: el servicio no devolvió escenas para {TIME_RANGE['from']}–{TIME_RANGE['to']}."
        )
    counts = userdata.get("pixels_by_orbit_index")
    without_data = userdata.get("pixels_without_data")
    total = plan["width"] * plan["height"]
    scenes_used, valid_fraction = None, None
    # Solo se certifica qué órbitas aportaron píxeles si los contadores del evalscript
    # cuadran con la rejilla pedida; si no, quedan solo las escenas consideradas.
    countable = (
        isinstance(counts, dict) and isinstance(without_data, int)
        and all(str(index).isdigit() and isinstance(pixels, int) for index, pixels in counts.items())
    )
    if countable and sum(counts.values()) + without_data == total:
        by_index = {orbit.get("__idx", position): orbit for position, orbit in enumerate(orbits)}
        scenes_used = [
            {
                "orbit_index": int(index),
                "date_from": by_index.get(int(index), {}).get("dateFrom"),
                "date_to": by_index.get(int(index), {}).get("dateTo"),
                "pixels": pixels,
                "fraction": round(pixels / total, 6),
            }
            for index, pixels in sorted(counts.items(), key=lambda item: int(item[0]))
            if pixels > 0
        ]
        valid_fraction = round(1 - without_data / total, 6)
    return {"scenes_considered": len(orbits), "scenes_used": scenes_used, "valid_fraction": valid_fraction}


def describe_site(plan: dict, image: bytes, userdata: dict, queried_at: str) -> dict:
    """Entrada del índice para un sitio: plan y petición, hash del PNG y metadata devuelta."""
    if png_size(image) != (plan["width"], plan["height"]):
        raise VisualContextError(f"{plan['site_id']}: el PNG no tiene las dimensiones pedidas.")
    return {
        **_static_site(plan),
        "sha256": hashlib.sha256(image).hexdigest(),
        "bytes": len(image),
        "queried_at": queried_at,
        **_scene_summary(plan, userdata),
        "returned_metadata": userdata,
    }


def _check_timestamp(value: object, field: str) -> None:
    try:
        datetime.strptime(str(value), "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        raise VisualContextError(f"«{field}» no es una hora UTC válida.") from None


def validate_package(directory: Path, index: dict, plans: list[dict]) -> None:
    """Todo lo que el índice presenta debe coincidir con el plan, la petición, el PNG o la metadata devuelta.

    Así no se acepta un índice con bbox, periodo, colección, transformación,
    identidad, snapshot o dimensiones distintos de los que respaldan las imágenes.
    """
    for key, expected in _static_header(plans).items():
        if index.get(key) != expected:
            raise VisualContextError(f"El índice declara «{key}» distinto del vigente para este snapshot.")
    _check_timestamp(index.get("generated_at"), "generated_at")
    sites = index["sites"]
    if not isinstance(sites, list) or len(sites) != len(plans):
        raise VisualContextError("El paquete visual no cubre exactamente los candidatos actuales.")
    for site, plan in zip(sites, plans):
        site_id = plan["site_id"]
        expected = {**_static_site(plan), **_scene_summary(plan, site["returned_metadata"])}
        for key, value in expected.items():
            if site.get(key) != value:
                raise VisualContextError(
                    f"{site_id}: «{key}» no coincide con el candidato, la petición o la metadata devuelta."
                )
        _check_timestamp(site.get("queried_at"), f"{site_id}.queried_at")
        image = directory / expected["image"]
        if image.is_symlink() or not image.is_file():
            raise VisualContextError(f"{site_id}: falta la imagen {expected['image']}.")
        data = image.read_bytes()
        if hashlib.sha256(data).hexdigest() != site.get("sha256") or len(data) != site.get("bytes"):
            raise VisualContextError(f"{site_id}: el SHA-256 o el tamaño de la imagen no coinciden con el índice.")
        if png_size(data) != (plan["width"], plan["height"]):
            raise VisualContextError(f"{site_id}: dimensiones de imagen inesperadas.")


def load_valid_package(directory: Path, plans: list[dict]) -> dict | None:
    try:
        index = json.loads((directory / "index.json").read_text(encoding="utf-8"))
        validate_package(directory, index, plans)
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        return None
    return index


def _swap(staging: Path, target: Path) -> None:
    """Sustituye el paquete completo; si falla, vuelve a dejar el anterior en su sitio.

    Si tampoco se puede restaurar o limpiar, lanza PackageStateError con el estado
    real en disco y conserva el respaldo. Sin atomicidad frente a cortes abruptos.
    """
    backup = target.with_name(f".{target.name}.previo.{os.getpid()}")
    had_previous = target.exists()
    if had_previous:
        os.replace(target, backup)  # si falla aquí, nada cambió
    try:
        os.replace(staging, target)
    except OSError as error:
        if had_previous:
            try:
                os.replace(backup, target)
            except OSError as rollback_error:
                raise PackageStateError(
                    f"No se pudo instalar el paquete nuevo ({error}) ni restaurar el anterior ({rollback_error}). "
                    f"{target} no existe ahora; el paquete anterior quedó intacto en {backup}."
                ) from rollback_error
        raise
    if had_previous:
        try:
            shutil.rmtree(backup)
        except OSError as error:
            raise PackageStateError(
                f"El paquete nuevo quedó instalado en {target}, pero no se pudo eliminar el respaldo del "
                f"anterior ({error}). Borra {backup} antes de construir o empaquetar."
            ) from error


def _reusable(plan: dict, package: Path | None) -> tuple[dict, bytes] | None:
    """Entrada e imagen de otro paquete para el mismo sitio y exactamente la misma petición."""
    if package is None:
        return None
    try:
        index = json.loads((package / "index.json").read_text(encoding="utf-8"))
        entry = next(site for site in index["sites"] if site["site_id"] == plan["site_id"])
        image = (package / entry["image"]).read_bytes()
    except (OSError, ValueError, KeyError, TypeError, StopIteration):
        return None
    same = all(entry.get(key) == value for key, value in _static_site(plan).items())
    return (entry, image) if same and hashlib.sha256(image).hexdigest() == entry.get("sha256") else None


def build(out_dir: Path, fetch_tar, *, refresh: bool = False, clock=_utc_now,
          candidates_path: Path = CANDIDATES, config_path: Path = CONFIG,
          plans: list[dict] | None = None, reuse_from: Path | None = None, max_new: int | None = None) -> tuple[dict, bool]:
    """Devuelve ``(índice, reutilizado)``. ``fetch_tar(request) -> bytes`` hace la consulta.

    ``plans`` permite otro snapshot; ``reuse_from`` copia sin red las vistas idénticas de otro
    paquete (misma petición y hash); ``max_new`` acota las consultas nuevas.
    """
    if plans is None:
        candidates = json.loads(candidates_path.read_text(encoding="utf-8"))
        plans = site_plans(candidates, json.loads(config_path.read_text(encoding="utf-8")))
    if not refresh:
        existing = load_valid_package(out_dir, plans)
        if existing is not None:
            return existing, True

    out_dir.parent.mkdir(parents=True, exist_ok=True)
    # Generación completa en un directorio hermano: nunca se mezclan imágenes de dos consultas.
    staging = Path(tempfile.mkdtemp(dir=out_dir.parent, prefix=f".{out_dir.name}."))
    try:
        sites = []
        reused = {plan["site_id"]: _reusable(plan, reuse_from) for plan in plans}
        new = [plan["site_id"] for plan in plans if reused[plan["site_id"]] is None]
        if max_new is not None and len(new) > max_new:
            raise VisualContextError(f"Harían falta {len(new)} imágenes nuevas; el límite autorizado es {max_new}.")
        for plan in plans:
            if reused[plan["site_id"]] is not None:
                entry, image = reused[plan["site_id"]]
            else:
                queried_at = clock()
                image, userdata = parse_response(fetch_tar(build_request(plan)))
                entry = describe_site(plan, image, userdata, queried_at)
            (staging / entry["image"]).write_bytes(image)
            sites.append(entry)
        header = _static_header(plans)
        index = {
            **{key: header[key] for key in ("kind", "schema_version", "status", "snapshot_version")},
            "pipeline_version": __version__,
            "generated_at": clock(),
            **{key: header[key] for key in ("source", "product", "limitations")},
            "sites": sites,
        }
        (staging / "index.json").write_text(
            json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        validate_package(staging, index, plans)
        staging.chmod(0o755)  # mkdtemp crea 0700
        _swap(staging, out_dir)
    finally:
        shutil.rmtree(staging, ignore_errors=True)
    return index, False


def v3_options() -> dict:
    """Planes del snapshot v3: ventanas de la rejilla versionada y la referencia v2; Yungay se reutiliza."""
    from pipelines.discover_candidates import DEFAULT_CONFIG, grid_windows

    search = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))
    science = json.loads((ROOT / search["reference"]["source_config"]).read_text(encoding="utf-8"))
    reference = [site for site in science["sites"] if site["site_id"] == search["reference"]["site_id"]]
    expected = configured_bboxes(grid_windows(search) + reference)
    candidates = json.loads(V3_CANDIDATES.read_text(encoding="utf-8"))
    return {"plans": site_plans(candidates, expected=expected), "reuse_from": DEFAULT_OUT,
            "max_new": search["limits"]["max_rgb_images"]}


class CopernicusClient:
    """Token por client credentials y Process API, solo contra hosts oficiales."""

    def __init__(self, post=None, sleep=time.sleep, env_file: Path = ROOT / ".env") -> None:
        self._post, self._sleep, self._env_file = post, sleep, env_file
        self._token: str | None = None

    def _credentials(self) -> dict:
        if not all(os.environ.get(name) for name in CREDENTIAL_NAMES):
            from dotenv import load_dotenv
            load_dotenv(self._env_file)
        missing = [name for name in CREDENTIAL_NAMES if not os.environ.get(name)]
        if missing:
            raise VisualContextError(f"Faltan credenciales Copernicus: {', '.join(missing)} (entorno o .env).")
        return {
            "grant_type": "client_credentials",
            "client_id": os.environ[CREDENTIAL_NAMES[0]],
            "client_secret": os.environ[CREDENTIAL_NAMES[1]],
        }

    def _request(self, url: str, **kwargs):
        target = urlsplit(url)
        if target.scheme != "https" or target.hostname not in OFFICIAL_HOSTS:
            raise VisualContextError(f"Endpoint no oficial rechazado: {target.hostname}")
        if self._post is None:
            import requests
            self._post = requests.post
        outcome = "sin respuesta"
        for attempt in range(ATTEMPTS):
            try:
                # Sin redirecciones: credenciales y token no salen de los hosts oficiales.
                response = self._post(url, timeout=180, allow_redirects=False, **kwargs)
            except OSError as error:  # requests.RequestException hereda de OSError
                outcome = f"fallo de red ({type(error).__name__})"
            else:
                if response.status_code == 200:
                    return response
                outcome = f"HTTP {response.status_code}"
                if response.status_code not in TRANSIENT_STATUS:
                    break
            if attempt + 1 < ATTEMPTS:
                self._sleep(3 * (attempt + 1))
        # El cuerpo y las cabeceras se omiten a propósito: podrían reflejar credenciales.
        raise VisualContextError(f"{target.hostname} no respondió correctamente: {outcome}.")

    def _authorized(self, url: str, accept: str, payload: dict):
        if self._token is None:
            try:
                self._token = self._request(TOKEN_URL, data=self._credentials()).json()["access_token"]
            except (KeyError, TypeError, ValueError) as error:
                if isinstance(error, VisualContextError):
                    raise
                raise VisualContextError("Copernicus no devolvió un access token.") from None
        return self._request(
            url,
            headers={"Authorization": f"Bearer {self._token}", "Accept": accept, "Content-Type": "application/json"},
            json=payload,
        )

    def fetch_tar(self, request: dict) -> bytes:
        return self._authorized(PROCESS_URL, "application/tar", request).content

    def post_json(self, url: str, payload: dict) -> dict:
        """POST autenticado a otro endpoint oficial de Sentinel Hub (p. ej. Statistical API)."""
        try:
            result = self._authorized(url, "application/json", payload).json()
        except ValueError as error:
            if isinstance(error, VisualContextError):
                raise
            raise VisualContextError(f"{urlsplit(url).hostname} devolvió una respuesta que no es JSON.") from None
        if not isinstance(result, dict):
            raise VisualContextError(f"{urlsplit(url).hostname} devolvió un JSON inesperado.")
        return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--refresh", action="store_true", help="consulta de nuevo aunque el paquete local sea válido")
    parser.add_argument("--snapshot", choices=("v2", "v3"), default="v2",
                        help="v3: candidatos de la búsqueda y referencia, en artifacts/visual-context-v3/")
    args = parser.parse_args(argv)
    options: dict = {}
    if args.snapshot == "v3":
        if args.out == DEFAULT_OUT:
            args.out = V3_OUT
        options = v3_options()
    try:
        index, reused = build(args.out, CopernicusClient().fetch_tar, refresh=args.refresh, **options)
    except PackageStateError as error:
        print(f"ERROR de contexto visual: {error}", file=sys.stderr)
        return 1
    except (VisualContextError, OSError) as error:
        print(f"ERROR de contexto visual: {error}\nEl paquete anterior, si existía, no se modificó.", file=sys.stderr)
        return 1
    origin = "reutilizado sin red" if reused else "consultado a Copernicus"
    print(f"Contexto visual {origin}: {args.out}")
    for site in index["sites"]:
        used = "no certificadas" if site["scenes_used"] is None else len(site["scenes_used"])
        print(f"  {site['site_id']}: {site['width']}×{site['height']} px, "
              f"{site['scenes_considered']} órbitas consideradas, usadas: {used}, sha256 {site['sha256'][:12]}…")
    return 0


if __name__ == "__main__":
    sys.exit(main())
