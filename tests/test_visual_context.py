"""Contexto visual: paquete real versionado y lógica del pipeline, sin red ni credenciales."""

import copy
import hashlib
import io
import json
import shutil
import struct
import tarfile
import zlib
from pathlib import Path

import pytest

from pipelines import fetch_visual_context as visual
from pipelines.contracts import ROOT

REAL = ROOT / "artifacts" / "visual-context"
CANDIDATES = json.loads(visual.CANDIDATES.read_text("utf-8"))
CONFIG = json.loads(visual.CONFIG.read_text("utf-8"))
PLANS = visual.site_plans(CANDIDATES, CONFIG)
REAL_INDEX = json.loads((REAL / "index.json").read_text("utf-8"))
CLOCK = lambda: "2026-01-02T03:04:05Z"  # noqa: E731


def fake_png(width: int, height: int) -> bytes:
    """PNG RGBA transparente y SINTÉTICO: solo existe dentro de los tests, nunca se publica."""
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    rows = (b"\x00" + b"\x00" * 4 * width) * height
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b""))


def fake_userdata(request: dict) -> dict:
    total = request["output"]["width"] * request["output"]["height"]
    return {
        "evalscript_version": "FIXTURE-DE-TEST",
        "orbits": [{"__idx": 0, "dateFrom": "2025-12-01T00:00:00Z", "dateTo": "2025-12-01T23:59:59Z", "tiles": []}],
        "pixels_by_orbit_index": {"0": total},
        "pixels_without_data": 0,
    }


def tar_of(members: dict[str, bytes], symlinks: tuple[str, ...] = ()) -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w") as archive:
        for name, data in members.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
        for name in symlinks:
            info = tarfile.TarInfo(name)
            info.type, info.linkname = tarfile.SYMTYPE, "/etc/passwd"
            archive.addfile(info)
    return buffer.getvalue()


def fake_tar(request: dict, userdata: dict | None = None, size: tuple[int, int] | None = None) -> bytes:
    width, height = size or (request["output"]["width"], request["output"]["height"])
    return tar_of({
        "default.png": fake_png(width, height),
        "userdata.json": json.dumps(userdata or fake_userdata(request)).encode(),
    })


class Transport:
    def __init__(self, fail_on: int | None = None):
        self.calls, self.fail_on = [], fail_on

    def __call__(self, request: dict) -> bytes:
        self.calls.append(request)
        if self.fail_on == len(self.calls):
            raise visual.VisualContextError("fallo simulado de la API")
        return fake_tar(request)


def tree(directory: Path) -> dict[str, bytes]:
    return {path.relative_to(directory).as_posix(): path.read_bytes() for path in sorted(directory.rglob("*")) if path.is_file()}


# --- Paquete real versionado -------------------------------------------------

def test_real_package_matches_candidates_plan_and_images():
    visual.validate_package(REAL, REAL_INDEX, PLANS)
    assert [site["site_id"] for site in REAL_INDEX["sites"]] == [candidate["site_id"] for candidate in CANDIDATES]
    assert REAL_INDEX["snapshot_version"] == CANDIDATES[0]["data_snapshot_version"]
    configured = {site["site_id"]: site for site in CONFIG["sites"]}
    for site, candidate in zip(REAL_INDEX["sites"], CANDIDATES):
        ring = candidate["geometry"]["coordinates"][0]
        assert site["bbox"] == pytest.approx([min(p[0] for p in ring), min(p[1] for p in ring),
                                              max(p[0] for p in ring), max(p[1] for p in ring)])
        center = configured[site["site_id"]]
        assert (site["bbox"][0] + site["bbox"][2]) / 2 == pytest.approx(center["longitude"])
        assert (site["bbox"][1] + site["bbox"][3]) / 2 == pytest.approx(center["latitude"])
        data = (REAL / site["image"]).read_bytes()
        assert site["image"] == f"{site['site_id']}.png"
        assert hashlib.sha256(data).hexdigest() == site["sha256"] and len(data) == site["bytes"]
        assert visual.png_size(data) == (site["width"], site["height"])
        assert 512 <= site["width"] <= 768 and 512 <= site["height"] <= 768
        assert site["request"]["evalscript"] == visual.EVALSCRIPT
        assert site["scenes_considered"] == len(site["returned_metadata"]["orbits"]) >= 1
        # Imagen real del servicio, no el PNG sintético de estos tests.
        assert site["returned_metadata"]["evalscript_version"] == "analogos-s2-visual-v1"
        assert data != fake_png(site["width"], site["height"]) and len(data) > 100_000


def test_real_index_has_no_secrets_and_states_its_limits():
    text = (REAL / "index.json").read_text("utf-8")
    for term in ("access_token", "client_secret", "Bearer", "Authorization", "COPERNICUS_CLIENT"):
        assert term not in text
    assert REAL_INDEX["status"] == "preliminary_visual_context"
    assert any("por escena" in item for item in REAL_INDEX["limitations"])
    assert any("no valida" in item for item in REAL_INDEX["limitations"])


@pytest.mark.parametrize("mutate", [
    lambda index: index["sites"][0].__setitem__("bbox", [0, 0, 1, 1]),
    lambda index: index["product"]["time_range"].__setitem__("from", "2026-11-01T00:00:00Z"),
    lambda index: index["product"].__setitem__("period_label", "Imagen actual"),
    lambda index: index["product"].__setitem__("transformation", "sin transformación"),
    lambda index: index["source"].__setitem__("collection", "sentinel-2-l1c"),
    lambda index: index["source"].__setitem__("endpoint", "https://example.org/process"),
    lambda index: index.__setitem__("snapshot_version", "otro-snapshot"),
    lambda index: index.__setitem__("kind", "otro"),
    lambda index: index.__setitem__("limitations", []),
    lambda index: index.__setitem__("generated_at", "ayer"),
    lambda index: index["sites"][0].__setitem__("site_id", "cl-otro-sitio"),
    lambda index: index["sites"][0].__setitem__("name", "Otro nombre"),
    lambda index: index["sites"][0].__setitem__("width", 512),
    lambda index: index["sites"][0].__setitem__("approx_meters_per_pixel", 10),
    lambda index: index["sites"][0].__setitem__("extent_km", {"width": 1, "height": 1}),
    lambda index: index["sites"][0].__setitem__("image", "cl-domeyko-interior-screening.png"),
    lambda index: index["sites"][0].__setitem__("sha256", "0" * 64),
    lambda index: index["sites"][0].__setitem__("queried_at", "2026-13-40"),
    lambda index: index["sites"][0].__setitem__("scenes_considered", 99),
    lambda index: index["sites"][0].__setitem__("scenes_used", []),
    lambda index: index["sites"][0].__setitem__("valid_fraction", 0.5),
    lambda index: index["sites"][0]["request"]["input"]["data"][0]["dataFilter"].__setitem__("maxCloudCoverage", 100),
    lambda index: index["sites"][0].__setitem__("returned_metadata", "sin metadata"),
    lambda index: index["sites"].pop(),
])
def test_any_presented_metadata_inconsistent_with_plan_or_request_is_rejected(mutate, tmp_path: Path):
    tampered = copy.deepcopy(REAL_INDEX)
    mutate(tampered)
    with pytest.raises(visual.VisualContextError):
        visual.validate_package(REAL, tampered, PLANS)
    package = tmp_path / "visual-context"
    shutil.copytree(REAL, package)
    (package / "index.json").write_text(json.dumps(tampered), encoding="utf-8")
    assert visual.load_valid_package(package, PLANS) is None


# --- Petición y respuesta, sin red -------------------------------------------

def test_request_is_public_fixed_and_derived_from_the_versioned_geometry():
    request = visual.build_request(PLANS[0])
    data = request["input"]["data"][0]
    assert request["input"]["bounds"] == {"bbox": PLANS[0]["bbox"], "properties": {"crs": visual.CRS}}
    assert data["type"] == "sentinel-2-l2a"
    assert data["dataFilter"] == {
        "timeRange": {"from": "2025-12-01T00:00:00Z", "to": "2026-01-01T00:00:00Z"},
        "mosaickingOrder": "leastCC",
        "maxCloudCoverage": 40,
    }
    assert [item["format"]["type"] for item in request["output"]["responses"]] == ["image/png", "application/json"]
    assert (request["output"]["width"], request["output"]["height"]) == (PLANS[0]["width"], 768)
    assert all(name in request["evalscript"] for name in ("B04", "B03", "B02", "dataMask", "Mosaicking.ORBIT"))
    # Píxel aproximadamente cuadrado en terreno y escala declarada coherente.
    plan = PLANS[0]
    assert plan["extent_km"]["width"] / plan["width"] == pytest.approx(plan["extent_km"]["height"] / plan["height"], rel=0.01)
    assert plan["approx_meters_per_pixel"] == pytest.approx(1000 * plan["extent_km"]["height"] / plan["height"], abs=0.1)


def test_geometry_inconsistent_with_config_is_rejected():
    moved = copy.deepcopy(CANDIDATES)
    moved[0]["geometry"]["coordinates"][0][0][0] += 0.5
    with pytest.raises(visual.VisualContextError, match="no coincide"):
        visual.site_plans(moved, CONFIG)


@pytest.mark.parametrize("payload, message", [
    (tar_of({"default.png": b"x", "userdata.json": b"{}", "../../evil.txt": b"x"}), "inesperada"),
    (tar_of({"default.png": b"x", "userdata.json": b"{}", "/etc/cron.d/evil": b"x"}), "inesperada"),
    (tar_of({"userdata.json": b"{}"}, symlinks=("default.png",)), "inesperada"),
    (tar_of({"default.png": b"x"}), "TAR esperado"),
    (tar_of({"default.png": b"x", "userdata.json": b"[1, 2]"}), "no es un objeto"),
    (b"<html>error con SECRETO-DE-PRUEBA en el cuerpo</html>", "TAR esperado"),
])
def test_tar_response_is_read_in_memory_and_only_expected_entries(payload: bytes, message: str, tmp_path: Path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    with pytest.raises(visual.VisualContextError, match=message) as error:
        visual.parse_response(payload)
    assert "SECRETO" not in str(error.value)
    assert list(tmp_path.iterdir()) == []  # nada se extrajo a disco


# --- Construcción, caché y preservación ---------------------------------------

def test_build_fetches_once_per_site_then_reuses_the_valid_package_without_network(tmp_path: Path):
    out, transport = tmp_path / "visual-context", Transport()
    index, reused = visual.build(out, transport, clock=CLOCK)
    assert reused is False and len(transport.calls) == len(PLANS) == 3
    assert sorted(tree(out)) == sorted(["index.json", *(f"{plan['site_id']}.png" for plan in PLANS)])
    assert index == json.loads((out / "index.json").read_text("utf-8"))
    assert [site["scenes_used"][0]["fraction"] for site in index["sites"]] == [1.0, 1.0, 1.0]

    def no_network(_request):
        raise AssertionError("no debe llamar a la API con un paquete válido")

    assert visual.build(out, no_network, clock=CLOCK) == (index, True)
    visual.build(out, transport, refresh=True, clock=CLOCK)
    assert len(transport.calls) == 6
    assert [path.name for path in tmp_path.iterdir()] == ["visual-context"]


def test_real_package_is_reused_without_network(tmp_path: Path):
    package = tmp_path / "visual-context"
    shutil.copytree(REAL, package)
    index, reused = visual.build(package, Transport(fail_on=1))
    assert reused is True and index == REAL_INDEX


@pytest.mark.parametrize("failing_request", [1, 2, 3])
def test_api_error_keeps_the_previous_package_without_mixing_generations(tmp_path: Path, failing_request: int):
    out = tmp_path / "visual-context"
    visual.build(out, Transport(), clock=CLOCK)
    previous = tree(out)
    with pytest.raises(visual.VisualContextError, match="simulado"):
        visual.build(out, Transport(fail_on=failing_request), refresh=True, clock=lambda: "2026-02-02T00:00:00Z")
    assert tree(out) == previous
    assert [path.name for path in tmp_path.iterdir()] == ["visual-context"]


def test_wrong_dimensions_or_no_scenes_are_errors_and_uncertifiable_counts_are_not_invented(tmp_path: Path):
    out = tmp_path / "visual-context"
    with pytest.raises(visual.VisualContextError, match="dimensiones"):
        visual.build(out, lambda request: fake_tar(request, size=(64, 64)), clock=CLOCK)
    with pytest.raises(visual.VisualContextError, match="no devolvió escenas"):
        visual.build(out, lambda request: fake_tar(request, {**fake_userdata(request), "orbits": []}), clock=CLOCK)
    assert not out.exists()

    index, _ = visual.build(
        out, lambda request: fake_tar(request, {**fake_userdata(request), "pixels_without_data": 7}), clock=CLOCK,
    )
    assert all(site["scenes_used"] is None and site["valid_fraction"] is None for site in index["sites"])
    assert all(site["scenes_considered"] == 1 for site in index["sites"])


# --- Reemplazo del paquete ----------------------------------------------------

def swap_dirs(tmp_path: Path) -> tuple[Path, Path]:
    staging, target = tmp_path / "nuevo", tmp_path / "visual-context"
    staging.mkdir()
    target.mkdir()
    (staging / "marca.txt").write_text("nuevo", encoding="utf-8")
    (target / "marca.txt").write_text("anterior", encoding="utf-8")
    return staging, target


def fail_replace(monkeypatch, should_fail):
    real, seen = visual.os.replace, []

    def fake(source, destination):
        seen.append(Path(destination))
        if should_fail(Path(destination), seen.count(Path(destination))):
            raise OSError("fallo de E/S simulado")
        return real(source, destination)

    monkeypatch.setattr(visual.os, "replace", fake)


def test_swap_failure_with_successful_rollback_restores_the_previous_package(tmp_path: Path, monkeypatch):
    staging, target = swap_dirs(tmp_path)
    fail_replace(monkeypatch, lambda destination, count: destination == target and count == 1)
    with pytest.raises(OSError, match="simulado") as error:
        visual._swap(staging, target)
    assert not isinstance(error.value, visual.PackageStateError)
    assert (target / "marca.txt").read_text("utf-8") == "anterior"
    assert sorted(path.name for path in tmp_path.iterdir()) == ["nuevo", "visual-context"]


def test_swap_failure_with_failed_rollback_reports_real_state_and_keeps_the_backup(tmp_path: Path, monkeypatch):
    staging, target = swap_dirs(tmp_path)
    fail_replace(monkeypatch, lambda destination, _count: destination == target)
    with pytest.raises(visual.PackageStateError) as error:
        visual._swap(staging, target)
    backups = [path for path in tmp_path.iterdir() if path.name.startswith(".visual-context.previo.")]
    assert len(backups) == 1 and (backups[0] / "marca.txt").read_text("utf-8") == "anterior"
    assert str(backups[0]) in str(error.value) and "no existe ahora" in str(error.value)
    assert not target.exists()


def test_swap_cleanup_failure_reports_new_package_installed_and_leftover_backup(tmp_path: Path, monkeypatch):
    staging, target = swap_dirs(tmp_path)

    def cannot_remove(_path):
        raise OSError("permiso denegado simulado")

    monkeypatch.setattr(visual.shutil, "rmtree", cannot_remove)
    with pytest.raises(visual.PackageStateError, match="quedó instalado") as error:
        visual._swap(staging, target)
    assert (target / "marca.txt").read_text("utf-8") == "nuevo"
    backups = [path for path in tmp_path.iterdir() if path.name.startswith(".visual-context.previo.")]
    assert len(backups) == 1 and str(backups[0]) in str(error.value)


@pytest.mark.parametrize("error, claims_untouched", [
    (visual.VisualContextError("fallo simulado de la API"), True),
    (visual.PackageStateError("estado real: el respaldo quedó en /tmp/x"), False),
])
def test_main_only_claims_the_previous_package_is_untouched_when_true(monkeypatch, capsys, tmp_path: Path, error, claims_untouched):
    def failing_build(*_args, **_kwargs):
        raise error

    monkeypatch.setattr(visual, "build", failing_build)
    assert visual.main(["--out", str(tmp_path / "visual-context")]) == 1
    message = capsys.readouterr().err
    assert str(error) in message
    assert ("no se modificó" in message) is claims_untouched


# --- Cliente Copernicus (sin red: transporte simulado) -------------------------

class Response:
    def __init__(self, status_code: int, payload: dict | None = None, content: bytes = b""):
        self.status_code, self._payload, self.content = status_code, payload, content
        self.text = "cuerpo con SECRETO-DE-PRUEBA reflejado"

    def json(self):
        if self._payload is None:
            raise ValueError("sin JSON")
        return self._payload


@pytest.fixture
def credentials(monkeypatch):
    monkeypatch.setenv("COPERNICUS_CLIENT_ID", "ID-DE-PRUEBA")
    monkeypatch.setenv("COPERNICUS_CLIENT_SECRET", "SECRETO-DE-PRUEBA")


def test_client_sends_credentials_only_to_the_official_token_host(credentials, tmp_path: Path):
    calls = []

    def post(url, **kwargs):
        calls.append((url, kwargs))
        if url == visual.TOKEN_URL:
            return Response(200, {"access_token": "TOKEN-DE-PRUEBA"})
        return Response(200, content=b"tar")

    client = visual.CopernicusClient(post=post, env_file=tmp_path / "no-existe.env")
    assert client.fetch_tar({"a": 1}) == b"tar" and client.fetch_tar({"a": 2}) == b"tar"
    (token_url, token_call), (process_url, process_call), _ = calls
    assert len(calls) == 3  # un token, dos consultas
    assert token_url == visual.TOKEN_URL and token_call["data"]["client_secret"] == "SECRETO-DE-PRUEBA"
    assert process_url == visual.PROCESS_URL and "client_secret" not in json.dumps(process_call["json"])
    assert process_call["headers"]["Authorization"] == "Bearer TOKEN-DE-PRUEBA"
    assert process_call["headers"]["Accept"] == "application/tar"
    assert all(call["allow_redirects"] is False for _url, call in calls)
    assert all(visual.urlsplit(url).hostname in visual.OFFICIAL_HOSTS for url, _call in calls)


def test_client_errors_never_expose_bodies_and_do_not_retry_client_errors(credentials, tmp_path: Path):
    calls = []

    def post(url, **kwargs):
        calls.append(url)
        return Response(401)

    with pytest.raises(visual.VisualContextError, match="HTTP 401") as error:
        visual.CopernicusClient(post=post, env_file=tmp_path / "no-existe.env").fetch_tar({})
    assert len(calls) == 1
    assert "SECRETO" not in str(error.value) and "ID-DE-PRUEBA" not in str(error.value)


def test_client_retries_transient_failures_a_bounded_number_of_times(credentials, tmp_path: Path):
    outcomes = [Response(503), ConnectionError("red caída"), Response(200, {"access_token": "t"}), Response(200, content=b"ok")]
    pauses = []

    def post(url, **kwargs):
        outcome = outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    client = visual.CopernicusClient(post=post, sleep=pauses.append, env_file=tmp_path / "no-existe.env")
    assert client.fetch_tar({}) == b"ok" and len(pauses) == 2

    def always_down(url, **kwargs):
        raise ConnectionError("red caída")

    attempts = []
    client = visual.CopernicusClient(post=always_down, sleep=attempts.append, env_file=tmp_path / "no-existe.env")
    with pytest.raises(visual.VisualContextError, match=r"fallo de red \(ConnectionError\)"):
        client.fetch_tar({})
    assert len(attempts) == visual.ATTEMPTS - 1


def test_client_rejects_missing_credentials_and_non_official_endpoints_before_sending(monkeypatch, tmp_path: Path):
    def post(url, **kwargs):
        raise AssertionError("no debe enviar nada")

    for name in visual.CREDENTIAL_NAMES:
        monkeypatch.delenv(name, raising=False)
    client = visual.CopernicusClient(post=post, env_file=tmp_path / "no-existe.env")
    with pytest.raises(visual.VisualContextError, match="COPERNICUS_CLIENT_ID"):
        client.fetch_tar({})
    for url in ("https://example.org/token", "http://sh.dataspace.copernicus.eu/process/v1"):
        with pytest.raises(visual.VisualContextError, match="no oficial"):
            client._request(url)
