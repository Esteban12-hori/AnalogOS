import hashlib
import importlib.util
import json
import os
import zipfile
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "package_release.py"
_spec = importlib.util.spec_from_file_location("package_release", SCRIPT)
release = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(release)

INDEX = (
    '<!doctype html><html><head>'
    '<script type="module" crossorigin src="./assets/index-abc123.js"></script>'
    '<link rel="stylesheet" crossorigin href="./assets/index-def456.css">'
    '</head><body><div id="root"></div></body></html>'
)
EXPECTED = sorted([
    "index.html", "assets/index-abc123.js", "assets/index-def456.css",
    *release.SCIENCE_FILES, release.VISUAL_INDEX, *release.VISUAL_IMAGES,
])


def write_visual_index(root: Path, images: tuple[str, ...] = release.VISUAL_IMAGES) -> None:
    """Índice sintético coherente con los archivos de prueba (no son imágenes reales)."""
    sites = [
        {"image": Path(name).name, "sha256": hashlib.sha256((root / name).read_bytes()).hexdigest()}
        for name in images
    ]
    (root / release.VISUAL_INDEX).write_text(json.dumps({"kind": "FIXTURE-DE-TEST", "sites": sites}), encoding="utf-8")


@pytest.fixture
def dist(tmp_path: Path) -> Path:
    root = tmp_path / "dist"
    for name in EXPECTED:
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(f"FIXTURE DE TEST, no es contenido real: {name}\n".encode())
    (root / "index.html").write_text(INDEX, encoding="utf-8")
    write_visual_index(root)
    return root


def run(dist: Path, out: Path) -> tuple[Path, Path, str]:
    out.mkdir(exist_ok=True)
    zip_path, checksum_path = out / "demo.zip", out / "SHA256SUMS.txt"
    return zip_path, checksum_path, release.package(dist, zip_path, checksum_path)


def test_zip_is_deterministic_for_the_same_dist(dist: Path, tmp_path: Path):
    first_zip, first_sum, first_digest = run(dist, tmp_path / "a")
    for path in dist.rglob("*"):
        os.utime(path, (1_000_000_000, 1_000_000_000))  # cambiar mtime no debe alterar el ZIP
    second_zip, second_sum, second_digest = run(dist, tmp_path / "b")
    assert first_zip.read_bytes() == second_zip.read_bytes()
    assert first_digest == second_digest == hashlib.sha256(first_zip.read_bytes()).hexdigest()
    assert first_sum.read_text("utf-8") == second_sum.read_text("utf-8") == f"{first_digest}  demo.zip\n"


def test_zip_contains_exactly_the_allowed_files_with_dist_bytes(dist: Path, tmp_path: Path):
    zip_path, _, _ = run(dist, tmp_path / "out")
    with zipfile.ZipFile(zip_path) as bundle:
        assert bundle.namelist() == EXPECTED
        assert bundle.testzip() is None
        for info in bundle.infolist():
            assert bundle.read(info) == (dist / info.filename).read_bytes()
            assert info.date_time == release.FIXED_TIME
    assert sorted(path.name for path in zip_path.parent.iterdir()) == ["SHA256SUMS.txt", "demo.zip"]


@pytest.mark.parametrize("missing", [
    "index.html",
    "science-v2/manifest.json",
    "assets/index-abc123.js",  # referencia de index.html sin archivo
    "visual-context/index.json",
    "visual-context/cl-pampa-yungay-screening.png",
])
def test_missing_required_or_referenced_file_is_rejected(dist: Path, tmp_path: Path, missing: str):
    (dist / missing).unlink()
    with pytest.raises(release.ReleaseError, match=missing.rsplit("/", 1)[-1]):
        run(dist, tmp_path / "out")


@pytest.mark.parametrize("extra", [
    "science-v1/manifest.json",
    "demo/candidate-details.json",
    "assets/index-abc123.js.map",
    "assets/otro-chunk.js",
    ".env",
    "visual-context/otra-imagen.png",  # ningún PNG o JSON extra entra por extensión
    "visual-context/request.json",
    "visual-context/cl-pampa-yungay-screening.png.bak",
])
def test_unexpected_file_is_rejected(dist: Path, tmp_path: Path, extra: str):
    path = dist / extra
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("no publicable", encoding="utf-8")
    with pytest.raises(release.ReleaseError, match="inesperado"):
        run(dist, tmp_path / "out")


def test_visual_image_changed_after_indexing_is_rejected(dist: Path, tmp_path: Path):
    (dist / release.VISUAL_IMAGES[0]).write_bytes(b"imagen sustituida")
    with pytest.raises(release.ReleaseError, match="SHA-256 de visual-context/.+ no coincide"):
        run(dist, tmp_path / "out")


@pytest.mark.parametrize("index_text", [
    "esto no es JSON",
    json.dumps({"sites": [{"image": "cl-pampa-yungay-screening.png"}]}),  # sin sha256
    json.dumps([]),
])
def test_unreadable_visual_index_is_rejected(dist: Path, tmp_path: Path, index_text: str):
    (dist / release.VISUAL_INDEX).write_text(index_text, encoding="utf-8")
    with pytest.raises(release.ReleaseError, match="no es un índice de contexto visual legible"):
        run(dist, tmp_path / "out")


def test_visual_index_must_declare_exactly_the_three_allowed_images(dist: Path, tmp_path: Path):
    write_visual_index(dist, release.VISUAL_IMAGES[:2])
    with pytest.raises(release.ReleaseError, match="exactamente las tres imágenes"):
        run(dist, tmp_path / "out")


@pytest.mark.parametrize("link", ["science-v2/extra.json", "science-v2/manifest.json", "enlace-a-carpeta"])
def test_symlink_is_rejected_even_under_an_allowed_name(dist: Path, tmp_path: Path, link: str):
    outside = tmp_path / "fuera"
    outside.mkdir()
    (outside / "secreto.json").write_text("{}", encoding="utf-8")
    target = dist / link
    target.unlink(missing_ok=True)
    target.symlink_to(outside if link == "enlace-a-carpeta" else outside / "secreto.json")
    with pytest.raises(release.ReleaseError, match="simbólico"):
        run(dist, tmp_path / "out")


@pytest.mark.parametrize("reference", [
    "/assets/index-abc123.js",          # absoluta: rompe bajo /AnalogOS/
    "https://cdn.example/app.js",       # externa: rompe la demo offline
    "./assets/../science-v2/manifest.json",
])
def test_non_portable_reference_is_rejected(dist: Path, tmp_path: Path, reference: str):
    (dist / "index.html").write_text(INDEX.replace("./assets/index-abc123.js", reference), encoding="utf-8")
    with pytest.raises(release.ReleaseError, match="Referencia no permitida"):
        run(dist, tmp_path / "out")


def test_failed_validation_preserves_previous_delivery_and_explains(dist: Path, tmp_path: Path, capsys):
    out = tmp_path / "out"
    zip_path, checksum_path, _ = run(dist, out)
    previous = (zip_path.read_bytes(), checksum_path.read_bytes())
    (dist / "science-v2" / "mission-profile.json").unlink()

    code = release.main(["--dist", str(dist), "--zip", str(zip_path), "--checksum", str(checksum_path)])

    assert code == 1
    assert "mission-profile.json" in capsys.readouterr().err
    assert (zip_path.read_bytes(), checksum_path.read_bytes()) == previous
    assert sorted(path.name for path in out.iterdir()) == ["SHA256SUMS.txt", "demo.zip"]


def test_error_after_writing_the_temporary_zip_also_preserves_delivery(dist: Path, tmp_path: Path, monkeypatch):
    out = tmp_path / "out"
    zip_path, checksum_path, _ = run(dist, out)
    previous = (zip_path.read_bytes(), checksum_path.read_bytes())
    (dist / "index.html").write_text(INDEX + "<!-- cambio -->", encoding="utf-8")

    def corrupt(*_args):
        raise release.ReleaseError("verificación simulada fallida")

    monkeypatch.setattr(release, "_verify_zip", corrupt)
    with pytest.raises(release.ReleaseError, match="simulada"):
        release.package(dist, zip_path, checksum_path)
    assert (zip_path.read_bytes(), checksum_path.read_bytes()) == previous
    assert sorted(path.name for path in out.iterdir()) == ["SHA256SUMS.txt", "demo.zip"]


def flaky_replace(monkeypatch, should_fail):
    """os.replace falla cuando should_fail(destino, n.º de llamada a ese destino) es cierto."""
    real, seen = os.replace, []

    def fake(source, target, *args, **kwargs):
        seen.append(Path(target))
        if should_fail(Path(target), seen.count(Path(target))):
            raise OSError("fallo de E/S simulado")
        return real(source, target, *args, **kwargs)

    monkeypatch.setattr(release.os, "replace", fake)


def test_checksum_replace_failure_rolls_back_to_the_previous_pair(dist: Path, tmp_path: Path, monkeypatch, capsys):
    out = tmp_path / "out"
    zip_path, checksum_path, _ = run(dist, out)
    previous = (zip_path.read_bytes(), checksum_path.read_bytes())
    (dist / "index.html").write_text(INDEX + "<!-- cambio -->", encoding="utf-8")
    flaky_replace(monkeypatch, lambda target, _count: target == checksum_path)

    code = release.main(["--dist", str(dist), "--zip", str(zip_path), "--checksum", str(checksum_path)])

    assert code == 1
    assert "Se conserva la entrega anterior" in capsys.readouterr().err
    assert (zip_path.read_bytes(), checksum_path.read_bytes()) == previous
    assert hashlib.sha256(zip_path.read_bytes()).hexdigest() in checksum_path.read_text("utf-8")
    assert sorted(path.name for path in out.iterdir()) == ["SHA256SUMS.txt", "demo.zip"]


def test_checksum_replace_failure_without_previous_delivery_leaves_nothing(dist: Path, tmp_path: Path, monkeypatch):
    out = tmp_path / "out"
    out.mkdir()
    checksum_path = out / "SHA256SUMS.txt"
    flaky_replace(monkeypatch, lambda target, _count: target == checksum_path)
    with pytest.raises(OSError, match="simulado"):
        release.package(dist, out / "demo.zip", checksum_path)
    assert list(out.iterdir()) == []


def test_failed_rollback_is_reported_as_inconsistent_and_keeps_the_backup(dist: Path, tmp_path: Path, monkeypatch, capsys):
    out = tmp_path / "out"
    zip_path, checksum_path, _ = run(dist, out)
    previous_zip = zip_path.read_bytes()
    (dist / "index.html").write_text(INDEX + "<!-- cambio -->", encoding="utf-8")
    flaky_replace(monkeypatch, lambda target, count: target == checksum_path or (target == zip_path and count == 2))

    code = release.main(["--dist", str(dist), "--zip", str(zip_path), "--checksum", str(checksum_path)])

    message = capsys.readouterr().err
    assert code == 1
    assert "NO coinciden" in message and "Se conserva la entrega anterior" not in message
    backups = [path for path in out.iterdir() if path.name not in ("SHA256SUMS.txt", "demo.zip")]
    assert len(backups) == 1 and backups[0].read_bytes() == previous_zip
    assert str(backups[0]) in message


@pytest.mark.parametrize("checksum_name", ["demo.zip", "DEMO.ZIP"])
def test_zip_and_checksum_must_be_different_files(dist: Path, tmp_path: Path, checksum_name: str):
    out = tmp_path / "out"
    out.mkdir()
    with pytest.raises(release.ReleaseError, match="distintos"):
        release.package(dist, out / "demo.zip", out / checksum_name)
    assert list(out.iterdir()) == []


def test_checksum_linked_to_the_zip_is_rejected(dist: Path, tmp_path: Path):
    out = tmp_path / "out"
    zip_path, checksum_path, _ = run(dist, out)
    previous = zip_path.read_bytes()
    checksum_path.unlink()
    os.link(zip_path, checksum_path)
    with pytest.raises(release.ReleaseError, match="distintos"):
        release.package(dist, zip_path, checksum_path)
    assert zip_path.read_bytes() == previous


@pytest.mark.parametrize("zip_target, checksum_target", [
    ("dist/demo.zip", "out/SHA256SUMS.txt"),
    ("out/demo.zip", "dist/science-v2/SHA256SUMS.txt"),
    ("dist", "out/SHA256SUMS.txt"),  # el propio build
    (".", "out/SHA256SUMS.txt"),     # carpeta que contiene el build
])
def test_destinations_overlapping_dist_are_rejected_before_writing(
    dist: Path, tmp_path: Path, zip_target: str, checksum_target: str
):
    (tmp_path / "out").mkdir()
    with pytest.raises(release.ReleaseError, match="dentro del build|directorio"):
        release.package(dist, tmp_path / zip_target, tmp_path / checksum_target)
    assert sorted(path.relative_to(dist).as_posix() for path in dist.rglob("*") if path.is_file()) == EXPECTED
    assert list((tmp_path / "out").iterdir()) == []


def test_temporaries_are_unique_and_do_not_clobber_existing_tmp_files(dist: Path, tmp_path: Path):
    out = tmp_path / "out"
    out.mkdir()
    for name in ("demo.zip.tmp", "SHA256SUMS.txt.tmp"):
        (out / name).write_text("archivo ajeno", encoding="utf-8")
    run(dist, out)
    assert sorted(path.name for path in out.iterdir()) == [
        "SHA256SUMS.txt", "SHA256SUMS.txt.tmp", "demo.zip", "demo.zip.tmp",
    ]
    assert (out / "demo.zip.tmp").read_text("utf-8") == "archivo ajeno"
    assert (out / "SHA256SUMS.txt.tmp").read_text("utf-8") == "archivo ajeno"


# --- Build con chunks diferidos (globo/mapa 2D) y mapas base: manifiesto de Vite ---

LAZY = ["assets/CandidateGlobe-aaa.js", "assets/CandidateFlatMap-bbb.js", "assets/CandidateFlatMap-ccc.css",
        "assets/maplibre-gl-worker-ddd.mjs", "assets/earth-eee.jpg", "assets/shared-fff.js"]


def write_manifest(root: Path, extra: dict | None = None) -> None:
    manifest = {
        "index.html": {"file": "assets/index-abc123.js", "isEntry": True, "css": ["assets/index-def456.css"],
                       "dynamicImports": ["src/Globe.tsx", "src/Flat.tsx"]},
        "src/Globe.tsx": {"file": "assets/CandidateGlobe-aaa.js", "imports": ["_shared"], "assets": ["assets/earth-eee.jpg"]},
        "src/Flat.tsx": {"file": "assets/CandidateFlatMap-bbb.js", "css": ["assets/CandidateFlatMap-ccc.css"],
                         "assets": ["assets/maplibre-gl-worker-ddd.mjs"], "imports": ["_shared"]},
        "_shared": {"file": "assets/shared-fff.js"},
        **(extra or {}),
    }
    (root / ".vite").mkdir(exist_ok=True)
    (root / release.VITE_MANIFEST).write_text(json.dumps(manifest), encoding="utf-8")


@pytest.fixture
def lazy_dist(dist: Path) -> Path:
    for name in [*LAZY, *release.BASEMAP_FILES]:
        (dist / name).parent.mkdir(parents=True, exist_ok=True)
        (dist / name).write_bytes(f"FIXTURE DE TEST: {name}\n".encode())
    write_manifest(dist)
    return dist


def test_manifest_admits_reachable_lazy_chunks_and_basemaps(lazy_dist: Path, tmp_path: Path):
    zip_path, _, _ = run(lazy_dist, tmp_path / "out")
    with zipfile.ZipFile(zip_path) as archive:
        names = sorted(archive.namelist())
    assert names == sorted([*EXPECTED, *LAZY, *release.BASEMAP_FILES])
    assert release.VITE_MANIFEST not in names


def test_chunk_not_reachable_from_manifest_is_still_rejected(lazy_dist: Path, tmp_path: Path):
    (lazy_dist / "assets" / "otro-chunk.js").write_text("x", encoding="utf-8")
    with pytest.raises(release.ReleaseError, match="Archivo inesperado"):
        run(lazy_dist, tmp_path / "out")


@pytest.mark.parametrize("bad", ["../science-v2/manifest.json", "assets/x.html", "/assets/abs.js"])
def test_manifest_entries_outside_assets_are_rejected(lazy_dist: Path, tmp_path: Path, bad: str):
    write_manifest(lazy_dist, {"src/Flat.tsx": {"file": bad}})
    with pytest.raises(release.ReleaseError, match="no permitido"):
        run(lazy_dist, tmp_path / "out")


def test_manifest_for_another_build_is_rejected(lazy_dist: Path, tmp_path: Path):
    write_manifest(lazy_dist, {"index.html": {"file": "assets/index-otro.js", "isEntry": True}})
    with pytest.raises(release.ReleaseError, match="no corresponde"):
        run(lazy_dist, tmp_path / "out")


def test_unknown_basemap_file_is_rejected(lazy_dist: Path, tmp_path: Path):
    (lazy_dist / "basemaps" / "extra.webp").write_bytes(b"x")
    with pytest.raises(release.ReleaseError, match="Archivo inesperado"):
        run(lazy_dist, tmp_path / "out")


def test_index_may_preload_listed_data_and_inline_favicon(dist: Path, tmp_path: Path):
    hints = ('<link rel="icon" href="data:,">'
             '<link rel="preload" as="fetch" crossorigin href="./science-v2/manifest.json">'
             '<link rel="preload" as="fetch" crossorigin href="./visual-context/index.json">')
    (dist / "index.html").write_text(INDEX.replace("</head>", hints + "</head>"), encoding="utf-8")
    zip_path, _, _ = run(dist, tmp_path / "out")
    with zipfile.ZipFile(zip_path) as archive:
        assert sorted(archive.namelist()) == EXPECTED


@pytest.mark.parametrize("href", ["./science-v2/otro.json", "./basemaps/../secreto.json", "./visual-context/x.png"])
def test_index_preload_of_unlisted_file_is_rejected(dist: Path, tmp_path: Path, href: str):
    (dist / "index.html").write_text(INDEX.replace("</head>", f'<link rel="preload" href="{href}"></head>'), encoding="utf-8")
    with pytest.raises(release.ReleaseError, match="Referencia no permitida"):
        run(dist, tmp_path / "out")


def test_index_may_reference_a_webp_poster_that_exists(dist: Path, tmp_path: Path):
    (dist / "assets" / "globe-poster-abc.webp").write_bytes(b"FIXTURE")
    html = INDEX.replace("</head>", '<link rel="preload" as="image" href="./assets/globe-poster-abc.webp"></head>')
    (dist / "index.html").write_text(html.replace("<body>", '<body><img src="./assets/globe-poster-abc.webp">'), encoding="utf-8")
    zip_path, _, _ = run(dist, tmp_path / "out")
    with zipfile.ZipFile(zip_path) as archive:
        assert "assets/globe-poster-abc.webp" in archive.namelist()
