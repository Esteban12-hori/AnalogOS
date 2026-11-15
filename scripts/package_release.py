"""Packages the static demo into a deterministic ZIP with its SHA-256.

Usage: ``npm run release:package`` (builds first) or, with the build already done,
``python scripts/package_release.py``.

Only an explicit list goes into the ZIP: ``index.html``, the compiled JS/CSS
that this HTML references relatively, the fixed files of ``science-v3/``
the visual context (``visual-context-v3/index.json`` plus one image per site
from ``candidate-details.json``, with the SHA-256 that this index declares) and, if the build includes it, the geological
context (``geology-context-v1/index.json``, the only file allowed in that folder). The list
of images is derived from validated metadata, never from an extension pattern.
If the build includes ``.vite/manifest.json``, the deferred chunks,
CSS and assets (worker, textures) reachable from the entry that references
``index.html`` are also included; nothing that the manifest does not reach. The manifest does not go into the ZIP.
The 2D base maps (``basemaps/``) are optional, but only with fixed names.
``index.html`` may preload (``rel=preload``) only data that is already in that
list, and its inline favicon (``data:``) is not a file.
The geological context is OPTIONAL: without a ``geology-context-v1/`` folder the ZIP comes out as before (just like the web,
which shows "not available"); with the folder, the package must validate COMPLETELY (JSON Schema contract and semantics,
including the SHA-256 of the bytes of ``candidate-details.json``) with the single validator of
``pipelines.geology_contract``, which is imported only in that case and does not pull in Shapely, pyproj or requests
(it does pull in ``jsonschema``, already a dependency of the pipelines). An invalid package stops the packaging: it is not relaxed.
Any additional file, symbolic link, non-portable reference,
missing required file or destination overlapping with the build stops the
packaging before anything is written.

The ZIP and checksum are written to unique temporary files next to the destination and are
replaced as a pair. If the second replacement fails due to an I/O error, the
previous ZIP is restored. Known limitation: there is no atomicity against a
power outage or a ``kill`` between the two renames; in that case the pair
may be left out of sync and ``shasum -a 256 -c SHA256SUMS.txt`` reveals it.
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
# Deliverable v3. The v2 ZIP (analogos-chile-static.zip) is kept as a historical artifact and is not regenerated.
DEFAULT_ZIP = ROOT / "submission" / "analogos-static.zip"
DEFAULT_CHECKSUM = ROOT / "submission" / "analogos-static.zip.sha256"

CANDIDATES = "science-v3/candidate-details.json"
MANIFEST = "science-v3/manifest.json"
SCIENCE_FILES = (
    "science-v3/analysis-summary.json",
    CANDIDATES,
    "science-v3/context-outline.geojson",
    MANIFEST,
    "science-v3/mission-profile.json",
    "science-v3/precedents.json",
    "science-v3/search-results.json",
)
# Visual context: the index and exactly one image per site of the snapshot; no other PNG or JSON.
VISUAL_DIR = "visual-context-v3"
VISUAL_INDEX = f"{VISUAL_DIR}/index.json"
# M9 geological context: optional; validation is done by the single pipelines module (it is not copied here).
GEOLOGY_DIR = "geology-context-v1"
GEOLOGY_INDEX = f"{GEOLOGY_DIR}/index.json"
SITE_ID = re.compile(r"^(cl|ar)-[a-z0-9-]+$")  # same pattern as the contract: no slashes or relative paths
# 2D basemaps baked by pipelines/fetch_basemaps.py: optional, fixed names.
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
# Data that index.html may preload (rel=preload): only these, already allowed above.
DATA_REFERENCES = frozenset({*SCIENCE_FILES, VISUAL_INDEX, BASEMAP_FILES[0]})
# Referencia relativa a un JS/CSS compilado: carga igual en "/" y en "/AnalogOS/".
# Also the globe's WebP poster that index.html paints before the app loads.
ASSET_REFERENCE = re.compile(r"^(?:\./)?(assets/[A-Za-z0-9._-]+\.(?:js|css|webp))$")
# The chunks and assets that Vite emits (deferred imports, worker, textures) are taken from
# its manifest, reachable from the entry, instead of relaxing the previous pattern.
VITE_MANIFEST = ".vite/manifest.json"
MANIFEST_ASSET = re.compile(r"^assets/[A-Za-z0-9._-]+\.(?:js|mjs|css|jpg|png|webp)$")
FIXED_TIME = (1980, 1, 1, 0, 0, 0)  # minimum of the ZIP format


class ReleaseError(ValueError):
    """The contents of dist or the destinations do not allow publishing."""


class InconsistentDelivery(ReleaseError):
    """The checksum replacement failed and the previous ZIP could not be restored either."""


class _References(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.found: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.found += [value for name, value in attrs if name in ("src", "href") and value]


def _manifest_assets(dist: Path, entry_assets: list[str]) -> set[str]:
    """Files reachable from the entry of ``index.html`` according to the Vite manifest."""
    path = dist / VITE_MANIFEST
    if not path.exists():
        return set()
    if path.is_symlink() or not path.is_file():
        raise ReleaseError(f"Invalid Vite manifest: {VITE_MANIFEST}")
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ReleaseError(f"Could not read {VITE_MANIFEST}: {error}") from error
    if not isinstance(manifest, dict):
        raise ReleaseError(f"{VITE_MANIFEST} does not have the expected shape.")
    entries = [key for key, chunk in manifest.items() if isinstance(chunk, dict) and chunk.get("isEntry")]
    if not entries or not all(manifest[key].get("file") in entry_assets for key in entries):
        raise ReleaseError("The Vite manifest does not correspond to the index.html of this build.")
    reachable: set[str] = set()
    pending, seen = list(entries), set()
    while pending:
        key = pending.pop()
        if key in seen:
            continue
        seen.add(key)
        chunk = manifest.get(key)
        if not isinstance(chunk, dict):
            raise ReleaseError(f"{VITE_MANIFEST} references a nonexistent entry: {key!r}")
        files = [chunk.get("file"), *chunk.get("css", []), *chunk.get("assets", [])]
        for name in files:
            if not isinstance(name, str) or not MANIFEST_ASSET.match(name):
                raise ReleaseError(f"File not allowed in {VITE_MANIFEST}: {name!r}")
            reachable.add(name)
        pending += [*chunk.get("imports", []), *chunk.get("dynamicImports", [])]
    return reachable


def allowed_files(dist: Path) -> list[str]:
    """Validates ``dist`` and returns, sorted, the paths that go into the ZIP."""
    index = dist / "index.html"
    if dist.is_symlink() or not dist.is_dir():
        raise ReleaseError(f"The build directory {dist} does not exist; run npm run build.")
    if index.is_symlink() or not index.is_file():
        raise ReleaseError("The required file index.html is missing.")

    parser = _References()
    parser.feed(index.read_text(encoding="utf-8"))
    assets = []
    preloaded = []
    for reference in parser.found:
        # Inline favicon: it is not a file and does not come from the document.
        if reference.startswith("data:"):
            continue
        # Data preload: only files that are already in the explicit list.
        if reference.startswith("./") and reference[2:] in DATA_REFERENCES:
            preloaded.append(reference[2:])
            continue
        match = ASSET_REFERENCE.match(reference)
        if not match:
            raise ReleaseError(
                f"Reference not allowed in index.html: {reference!r}. "
                "Only relative paths to assets/*.js, *.css or *.webp are accepted (base './' in Vite)."
            )
        assets.append(match.group(1))
    if not any(name.endswith(".js") for name in assets):
        raise ReleaseError("index.html does not reference any compiled JavaScript in assets/.")

    images = visual_images(dist)
    optional = [name for name in BASEMAP_FILES if (dist / name).exists() or (dist / name).is_symlink()]
    geology = [GEOLOGY_INDEX] if (dist / GEOLOGY_DIR).exists() or (dist / GEOLOGY_DIR).is_symlink() else []
    allowed = sorted({
        "index.html", *assets, *_manifest_assets(dist, assets), *SCIENCE_FILES, VISUAL_INDEX, *images, *optional,
        *preloaded,
        *geology,
    })
    found = set()
    for folder, folders, files in os.walk(dist):
        for name in folders + files:
            path = Path(folder, name)
            relative = path.relative_to(dist).as_posix()
            if path.is_symlink():
                raise ReleaseError(f"Symbolic link not allowed: {relative}")
            if name in files:
                if relative == VITE_MANIFEST:
                    continue  # used for validation; it is not published in the ZIP
                if relative not in allowed or not path.is_file():
                    raise ReleaseError(f"Unexpected file in the build: {relative}")
                found.add(relative)
    missing = [name for name in allowed if name not in found]
    if missing:
        raise ReleaseError("Required or referenced files are missing: " + ", ".join(missing))
    _check_visual_hashes(dist, images)
    if geology:
        _check_geology(dist)
    return allowed


def _load(dist: Path, name: str) -> object:
    path = dist / name
    if path.is_symlink() or not path.is_file():
        raise ReleaseError(f"The required file {name} is missing.")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError:
        raise ReleaseError(f"{name} is not readable JSON.") from None


def visual_images(dist: Path) -> list[str]:
    """Allowed images: one per site of ``candidate-details.json``, with a validated identifier."""
    try:
        candidates = _load(dist, CANDIDATES)
        versions = {candidate["data_snapshot_version"] for candidate in candidates}
        identifiers = [candidate["site_id"] for candidate in candidates]
        snapshot = _load(dist, MANIFEST)["snapshot_version"]
    except (KeyError, TypeError) as error:
        raise ReleaseError(f"Unreadable site metadata or manifest ({type(error).__name__}).") from None
    if not identifiers or len(set(identifiers)) != len(identifiers) or not all(
        isinstance(identifier, str) and SITE_ID.match(identifier) for identifier in identifiers
    ):
        raise ReleaseError(f"{CANDIDATES} contains empty, repeated or invalid site identifiers.")
    if versions != {snapshot}:
        raise ReleaseError("The sites and the manifest do not belong to the same snapshot version.")
    return [f"{VISUAL_DIR}/{identifier}.png" for identifier in identifiers]


def _check_visual_hashes(dist: Path, images: list[str]) -> None:
    """The visual index must belong to this snapshot and declare exactly those images, with their SHA-256."""
    try:
        index = _load(dist, VISUAL_INDEX)
        declared = {f"{VISUAL_DIR}/{site['image']}": site["sha256"] for site in index["sites"]}
        version = index["snapshot_version"]
    except (KeyError, TypeError) as error:
        raise ReleaseError(f"{VISUAL_INDEX} is not a readable visual context index ({type(error).__name__}).") from None
    if version != _load(dist, MANIFEST)["snapshot_version"]:
        raise ReleaseError(f"{VISUAL_INDEX} belongs to another snapshot version.")
    if sorted(declared) != sorted(images):
        raise ReleaseError(f"{VISUAL_INDEX} does not declare exactly one image per snapshot site.")
    for name, expected in declared.items():
        if hashlib.sha256((dist / name).read_bytes()).hexdigest() != expected:
            raise ReleaseError(f"The SHA-256 of {name} does not match the one declared in {VISUAL_INDEX}.")


def _check_geology(dist: Path) -> None:
    """Geological package present: it must validate completely against the bytes of ``candidate-details.json`` of this build."""
    index = _load(dist, GEOLOGY_INDEX)
    candidates_path = dist / CANDIDATES
    try:
        if str(ROOT) not in sys.path:
            sys.path.insert(0, str(ROOT))
        from pipelines.contracts import ContractError  # deferred import: only if there is a geological package
        from pipelines.geology_contract import validate_package
    except ImportError as error:
        raise ReleaseError(
            f"{GEOLOGY_INDEX} exists but its validator could not be loaded ({error}); install the pipeline dependencies "
            "(jsonschema) or remove the geology package from the build."
        ) from None
    try:
        validate_package(index, _load(dist, CANDIDATES), candidates_path.read_bytes())
    except (ContractError, KeyError, TypeError, ValueError, AttributeError) as error:
        raise ReleaseError(f"{GEOLOGY_INDEX} is not valid for this build: {error}") from None


def _same_target(first: Path, second: Path) -> bool:
    first, second = first.resolve(), second.resolve()
    if first.exists() and second.exists():
        return first.samefile(second)  # covers hard links and symbolic links
    # casefold: on case-insensitive disks, Demo.zip and demo.zip are the same file.
    return (
        first.name.casefold() == second.name.casefold()
        and first.parent.exists() and second.parent.exists()
        and first.parent.samefile(second.parent)
    )


def _check_destinations(dist: Path, zip_path: Path, checksum_path: Path) -> None:
    """Rejects, before writing, destinations that are equal to each other or overlap with the build."""
    if _same_target(zip_path, checksum_path):
        raise ReleaseError("--zip and --checksum must be different files.")
    for option, target in (("--zip", zip_path), ("--checksum", checksum_path)):
        if target.is_dir():
            raise ReleaseError(f"{option} points to a directory, not a file: {target}")
        resolved = target.resolve()
        if dist.exists() and any(
            parent.exists() and parent.samefile(dist) for parent in resolved.parents
        ):
            raise ReleaseError(f"{option} is inside the build {dist}; choose a destination outside dist.")


def _write_zip(dist: Path, names: list[str], target: Path) -> None:
    with zipfile.ZipFile(target, "w") as bundle:
        for name in names:
            info = zipfile.ZipInfo(name, FIXED_TIME)
            info.create_system = 3  # Unix, even when packaging on Windows
            info.external_attr = 0o644 << 16
            # No compression: the bytes do not depend on the zlib version (the PNGs are already compressed).
            info.compress_type = zipfile.ZIP_STORED
            bundle.writestr(info, (dist / name).read_bytes())


def _verify_zip(dist: Path, names: list[str], target: Path) -> None:
    with zipfile.ZipFile(target) as bundle:
        if bundle.namelist() != names:
            raise ReleaseError("The generated ZIP does not contain exactly the allowed list.")
        for name in names:
            if bundle.read(name) != (dist / name).read_bytes():
                raise ReleaseError(f"The content of {name} in the ZIP does not match the build.")


def _temporary(target: Path, created: list[Path]) -> Path:
    """Unique temporary file (mkstemp) in the destination folder, so that the replacement is a rename."""
    handle, name = tempfile.mkstemp(dir=target.parent, prefix=f".{target.name}.", suffix=".tmp")
    os.close(handle)
    created.append(Path(name))
    return created[-1]


def _restore(zip_path: Path, backup: Path | None, temporaries: list[Path]) -> None:
    try:
        if backup is None:
            zip_path.unlink()  # there was no previous deliverable: it returns to that state
        else:
            os.replace(backup, zip_path)
    except OSError as error:
        if backup is not None:
            temporaries.remove(backup)  # kept for manual recovery
        raise InconsistentDelivery(
            f"Could not update the checksum nor restore the previous ZIP ({error}). "
            f"{zip_path} and its checksum do NOT match"
            + (f"; the previous ZIP was left in {backup}." if backup is not None else ".")
        ) from error


def package(dist: Path, zip_path: Path, checksum_path: Path) -> str:
    """Generates the ZIP and checksum; returns the SHA-256.

    On a validation or I/O error the previous deliverable is left intact
    (see the limitation regarding abrupt outages in the module header).
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
        print(f"Packaging ERROR: {error}", file=sys.stderr)
        return 1
    except (ReleaseError, OSError) as error:
        print(f"Packaging ERROR: {error}\nThe previous delivery is kept.", file=sys.stderr)
        return 1
    print(f"{args.zip}: sha256 {digest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
