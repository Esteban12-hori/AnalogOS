"""Empaqueta la demo estática en un ZIP determinista con su SHA-256.

Uso: ``npm run release:package`` (construye antes) o, con el build ya hecho,
``python scripts/package_release.py``.

Solo entra al ZIP una lista explícita: ``index.html``, los JS/CSS compilados
que ese HTML referencia de forma relativa, los cinco archivos ``science-v2/``
y el contexto visual (``visual-context/index.json`` más sus tres PNG, cuyo
SHA-256 debe coincidir con el declarado en ese índice).
Si el build trae ``.vite/manifest.json``, también entran los chunks diferidos,
CSS y assets (worker, texturas) alcanzables desde la entrada que referencia
``index.html``; nada que el manifiesto no alcance. El manifiesto no entra al ZIP.
Los mapas base 2D (``basemaps/``) son opcionales, pero solo con nombres fijos.
Cualquier archivo adicional, enlace simbólico, referencia no portable,
archivo requerido ausente o destino solapado con el build detiene el
empaquetado antes de escribir nada.

ZIP y checksum se escriben en temporales únicos junto al destino y se
reemplazan en pareja. Si el segundo reemplazo falla por un error de E/S, el
ZIP anterior se restaura. Límite conocido: no hay atomicidad frente a un
corte de energía o un ``kill`` entre ambos renombrados; en ese caso el par
puede quedar desincronizado y ``shasum -a 256 -c SHA256SUMS.txt`` lo delata.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
import zipfile
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DIST = ROOT / "apps" / "web" / "dist"
DEFAULT_ZIP = ROOT / "submission" / "analogos-chile-static.zip"
DEFAULT_CHECKSUM = ROOT / "submission" / "SHA256SUMS.txt"

SCIENCE_FILES = (
    "science-v2/analysis-summary.json",
    "science-v2/candidate-details.json",
    "science-v2/chile-outline.geojson",
    "science-v2/manifest.json",
    "science-v2/mission-profile.json",
)
# Contexto visual: el índice y exactamente estas tres imágenes; ningún otro PNG o JSON.
VISUAL_INDEX = "visual-context/index.json"
VISUAL_IMAGES = (
    "visual-context/cl-domeyko-interior-screening.png",
    "visual-context/cl-pampa-maria-elena-screening.png",
    "visual-context/cl-pampa-yungay-screening.png",
)
# Mapas base 2D horneados por pipelines/fetch_basemaps.py: opcionales, nombres fijos.
BASEMAP_FILES = (
    "basemaps/basemaps.json",
    "basemaps/cl-domeyko-interior-screening.webp",
    "basemaps/cl-pampa-maria-elena-screening.webp",
    "basemaps/cl-pampa-yungay-screening.webp",
    "basemaps/region-norte-grande.webp",
    "basemaps/s2-cl-domeyko-interior-screening.webp",
    "basemaps/s2-cl-pampa-maria-elena-screening.webp",
    "basemaps/s2-cl-pampa-yungay-screening.webp",
    "basemaps/world.webp",
)
# Datos que index.html puede precargar (rel=preload): solo estos, ya permitidos arriba.
DATA_REFERENCES = frozenset({*SCIENCE_FILES, VISUAL_INDEX, BASEMAP_FILES[0]})
# Referencia relativa a un JS/CSS compilado: carga igual en "/" y en "/AnalogOS/".
# También el póster WebP del globo que index.html pinta antes de que cargue la app.
ASSET_REFERENCE = re.compile(r"^(?:\./)?(assets/[A-Za-z0-9._-]+\.(?:js|css|webp))$")
# Los chunks y assets que Vite emite (imports diferidos, worker, texturas) se toman de
# su manifiesto, alcanzables desde la entrada, en vez de relajar el patrón anterior.
VITE_MANIFEST = ".vite/manifest.json"
MANIFEST_ASSET = re.compile(r"^assets/[A-Za-z0-9._-]+\.(?:js|mjs|css|jpg|png|webp)$")
FIXED_TIME = (1980, 1, 1, 0, 0, 0)  # mínimo del formato ZIP


class ReleaseError(ValueError):
    """El contenido de dist o los destinos no permiten publicar."""


class InconsistentDelivery(ReleaseError):
    """Falló el reemplazo del checksum y tampoco se pudo restaurar el ZIP anterior."""


class _References(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.found: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.found += [value for name, value in attrs if name in ("src", "href") and value]


def _manifest_assets(dist: Path, entry_assets: list[str]) -> set[str]:
    """Archivos alcanzables desde la entrada de ``index.html`` según el manifiesto de Vite."""
    path = dist / VITE_MANIFEST
    if not path.exists():
        return set()
    if path.is_symlink() or not path.is_file():
        raise ReleaseError(f"Manifiesto de Vite no válido: {VITE_MANIFEST}")
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ReleaseError(f"No se pudo leer {VITE_MANIFEST}: {error}") from error
    if not isinstance(manifest, dict):
        raise ReleaseError(f"{VITE_MANIFEST} no tiene la forma esperada.")
    entries = [key for key, chunk in manifest.items() if isinstance(chunk, dict) and chunk.get("isEntry")]
    if not entries or not all(manifest[key].get("file") in entry_assets for key in entries):
        raise ReleaseError("El manifiesto de Vite no corresponde al index.html de este build.")
    reachable: set[str] = set()
    pending, seen = list(entries), set()
    while pending:
        key = pending.pop()
        if key in seen:
            continue
        seen.add(key)
        chunk = manifest.get(key)
        if not isinstance(chunk, dict):
            raise ReleaseError(f"{VITE_MANIFEST} referencia una entrada inexistente: {key!r}")
        files = [chunk.get("file"), *chunk.get("css", []), *chunk.get("assets", [])]
        for name in files:
            if not isinstance(name, str) or not MANIFEST_ASSET.match(name):
                raise ReleaseError(f"Archivo no permitido en {VITE_MANIFEST}: {name!r}")
            reachable.add(name)
        pending += [*chunk.get("imports", []), *chunk.get("dynamicImports", [])]
    return reachable


def allowed_files(dist: Path) -> list[str]:
    """Valida ``dist`` y devuelve, ordenadas, las rutas que entran al ZIP."""
    index = dist / "index.html"
    if dist.is_symlink() or not dist.is_dir():
        raise ReleaseError(f"No existe el directorio de build {dist}; ejecuta npm run build.")
    if index.is_symlink() or not index.is_file():
        raise ReleaseError("Falta el archivo requerido index.html.")

    parser = _References()
    parser.feed(index.read_text(encoding="utf-8"))
    assets = []
    preloaded = []
    for reference in parser.found:
        # Favicon en línea: no es un archivo y no sale del documento.
        if reference.startswith("data:"):
            continue
        # Precarga de datos: solo archivos que ya están en la lista explícita.
        if reference.startswith("./") and reference[2:] in DATA_REFERENCES:
            preloaded.append(reference[2:])
            continue
        match = ASSET_REFERENCE.match(reference)
        if not match:
            raise ReleaseError(
                f"Referencia no permitida en index.html: {reference!r}. "
                "Solo se aceptan rutas relativas a assets/*.js, *.css o *.webp (base './' en Vite)."
            )
        assets.append(match.group(1))
    if not any(name.endswith(".js") for name in assets):
        raise ReleaseError("index.html no referencia ningún JavaScript compilado en assets/.")

    optional = [name for name in BASEMAP_FILES if (dist / name).exists() or (dist / name).is_symlink()]
    allowed = sorted({
        "index.html", *assets, *_manifest_assets(dist, assets), *SCIENCE_FILES, VISUAL_INDEX, *VISUAL_IMAGES,
        *optional, *preloaded,
    })
    found = set()
    for folder, folders, files in os.walk(dist):
        for name in folders + files:
            path = Path(folder, name)
            relative = path.relative_to(dist).as_posix()
            if path.is_symlink():
                raise ReleaseError(f"Enlace simbólico no permitido: {relative}")
            if name in files:
                if relative == VITE_MANIFEST:
                    continue  # se usa para validar; no se publica en el ZIP
                if relative not in allowed or not path.is_file():
                    raise ReleaseError(f"Archivo inesperado en el build: {relative}")
                found.add(relative)
    missing = [name for name in allowed if name not in found]
    if missing:
        raise ReleaseError("Faltan archivos requeridos o referenciados: " + ", ".join(missing))
    _check_visual_hashes(dist)
    return allowed


def _check_visual_hashes(dist: Path) -> None:
    """Las tres imágenes deben ser las que declara el índice, con su mismo SHA-256."""
    try:
        sites = json.loads((dist / VISUAL_INDEX).read_text(encoding="utf-8"))["sites"]
        declared = {f"visual-context/{site['image']}": site["sha256"] for site in sites}
    except (ValueError, KeyError, TypeError) as error:
        raise ReleaseError(f"{VISUAL_INDEX} no es un índice de contexto visual legible ({type(error).__name__}).") from None
    if sorted(declared) != sorted(VISUAL_IMAGES):
        raise ReleaseError(f"{VISUAL_INDEX} no declara exactamente las tres imágenes permitidas.")
    for name, expected in declared.items():
        if hashlib.sha256((dist / name).read_bytes()).hexdigest() != expected:
            raise ReleaseError(f"El SHA-256 de {name} no coincide con el declarado en {VISUAL_INDEX}.")


def _same_target(first: Path, second: Path) -> bool:
    first, second = first.resolve(), second.resolve()
    if first.exists() and second.exists():
        return first.samefile(second)  # cubre enlaces duros y simbólicos
    # casefold: en discos que no distinguen mayúsculas, Demo.zip y demo.zip son el mismo archivo.
    return (
        first.name.casefold() == second.name.casefold()
        and first.parent.exists() and second.parent.exists()
        and first.parent.samefile(second.parent)
    )


def _check_destinations(dist: Path, zip_path: Path, checksum_path: Path) -> None:
    """Rechaza, antes de escribir, destinos iguales entre sí o solapados con el build."""
    if _same_target(zip_path, checksum_path):
        raise ReleaseError("--zip y --checksum deben ser archivos distintos.")
    for option, target in (("--zip", zip_path), ("--checksum", checksum_path)):
        if target.is_dir():
            raise ReleaseError(f"{option} apunta a un directorio, no a un archivo: {target}")
        resolved = target.resolve()
        if dist.exists() and any(
            parent.exists() and parent.samefile(dist) for parent in resolved.parents
        ):
            raise ReleaseError(f"{option} queda dentro del build {dist}; elige un destino fuera de dist.")


def _write_zip(dist: Path, names: list[str], target: Path) -> None:
    with zipfile.ZipFile(target, "w") as bundle:
        for name in names:
            info = zipfile.ZipInfo(name, FIXED_TIME)
            info.create_system = 3  # Unix, también si se empaqueta en Windows
            info.external_attr = 0o644 << 16
            # Sin compresión: los bytes no dependen de la versión de zlib (los PNG ya vienen comprimidos).
            info.compress_type = zipfile.ZIP_STORED
            bundle.writestr(info, (dist / name).read_bytes())


def _verify_zip(dist: Path, names: list[str], target: Path) -> None:
    with zipfile.ZipFile(target) as bundle:
        if bundle.namelist() != names:
            raise ReleaseError("El ZIP generado no contiene exactamente la lista permitida.")
        for name in names:
            if bundle.read(name) != (dist / name).read_bytes():
                raise ReleaseError(f"El contenido de {name} en el ZIP no coincide con el build.")


def _temporary(target: Path, created: list[Path]) -> Path:
    """Temporal único (mkstemp) en la carpeta del destino, para que el reemplazo sea un renombrado."""
    handle, name = tempfile.mkstemp(dir=target.parent, prefix=f".{target.name}.", suffix=".tmp")
    os.close(handle)
    created.append(Path(name))
    return created[-1]


def _restore(zip_path: Path, backup: Path | None, temporaries: list[Path]) -> None:
    try:
        if backup is None:
            zip_path.unlink()  # no había entrega previa: se vuelve a ese estado
        else:
            os.replace(backup, zip_path)
    except OSError as error:
        if backup is not None:
            temporaries.remove(backup)  # se conserva para recuperación manual
        raise InconsistentDelivery(
            f"No se pudo actualizar el checksum ni restaurar el ZIP anterior ({error}). "
            f"{zip_path} y su checksum NO coinciden"
            + (f"; el ZIP anterior quedó en {backup}." if backup is not None else ".")
        ) from error


def package(dist: Path, zip_path: Path, checksum_path: Path) -> str:
    """Genera ZIP y checksum; devuelve el SHA-256.

    Ante un error de validación o de E/S la entrega anterior queda intacta
    (ver el límite frente a cortes abruptos en la cabecera del módulo).
    """
    _check_destinations(dist, zip_path, checksum_path)
    names = allowed_files(dist)
    temporaries: list[Path] = []
    try:
        new_zip = _temporary(zip_path, temporaries)
        _write_zip(dist, names, new_zip)
        _verify_zip(dist, names, new_zip)
        digest = hashlib.sha256(new_zip.read_bytes()).hexdigest()
        new_checksum = _temporary(checksum_path, temporaries)
        new_checksum.write_text(f"{digest}  {zip_path.name}\n", encoding="utf-8")
        backup = None
        if zip_path.exists():
            backup = _temporary(zip_path, temporaries)
            shutil.copy2(zip_path, backup)
        for path in (new_zip, new_checksum):
            path.chmod(0o644)  # mkstemp crea 0600
        os.replace(new_zip, zip_path)
        try:
            os.replace(new_checksum, checksum_path)
        except OSError:
            _restore(zip_path, backup, temporaries)
            raise
    finally:
        for path in temporaries:
            path.unlink(missing_ok=True)
    return digest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dist", type=Path, default=DEFAULT_DIST)
    parser.add_argument("--zip", type=Path, default=DEFAULT_ZIP)
    parser.add_argument("--checksum", type=Path, default=DEFAULT_CHECKSUM)
    args = parser.parse_args(argv)
    try:
        digest = package(args.dist, args.zip, args.checksum)
    except InconsistentDelivery as error:
        print(f"ERROR de empaquetado: {error}", file=sys.stderr)
        return 1
    except (ReleaseError, OSError) as error:
        print(f"ERROR de empaquetado: {error}\nSe conserva la entrega anterior.", file=sys.stderr)
        return 1
    print(f"{args.zip}: sha256 {digest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
