"""Adquisición geológica: validación de respuestas, límites de red y caché. Sin red real; datos sintéticos."""

import copy
import json
from pathlib import Path

import pytest
from shapely.geometry import Polygon

from pipelines import fetch_geology_data as fetch
from pipelines.geology_coverage import GeologyError
from tests.geology_fixtures import (
    FakeResponse, FakeServer, chile_collection, ensure_raw, chile_props, geojson_feature, http_for, resource, synthetic_world,
    wfs_collection, wfs_props, zip_bytes,
)

SITES = json.loads((Path(__file__).resolve().parents[1] / "artifacts/science-v3/candidate-details.json").read_text("utf-8"))
BOUNDS = [-67.6, -26.3, -67.4, -26.1]


def wfs_bytes(**kw):
    return json.dumps(wfs_collection(**kw)).encode()


def wide_feature(fid="f.1"):
    return geojson_feature(fid, Polygon([(-70, -30), (-60, -30), (-60, -20), (-70, -20)]), wfs_props())


# --- WFS ---------------------------------------------------------------------------------------------

def test_wfs_request_is_exact_explicit_and_without_hits():
    url = fetch.wfs_request(BOUNDS)["url"]
    assert url.startswith("https://sigam.segemar.gov.ar/geoserver217/ows?")
    for part in ("version=1.0.0", "request=GetFeature", "srsName=EPSG%3A4326", "outputFormat=application%2Fjson",
                 "maxFeatures=2000", "typeName=sigam%3Ae250K_UnidadGeologica"):
        assert part in url
    assert "resultType" not in url and "hits" not in url


def test_wfs_accepts_polygon_extending_far_beyond_bbox_and_empty_response():
    fetch.validate_wfs(wfs_bytes(features=[wide_feature()]), BOUNDS)
    fetch.validate_wfs(wfs_bytes(features=[]), BOUNDS)  # crs null con cero entidades es legítimo


@pytest.mark.parametrize("mutate", [
    lambda d: d.update(numberMatched=5),                      # truncada / inconsistente
    lambda d: d.update(numberReturned=0),
    lambda d: d.update(crs={"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}}),
    lambda d: d.update(crs=None),                              # con entidades, CRS obligatorio
    lambda d: d["features"][0]["properties"].pop("cod_ulito"),  # esquema incorrecto
    lambda d: d["features"][0].update(geometry=None),
])
def test_wfs_rejects_bad_responses(mutate):
    data = wfs_collection(features=[wide_feature()])
    mutate(data)
    with pytest.raises(GeologyError):
        fetch.validate_wfs(json.dumps(data).encode(), BOUNDS)


def test_wfs_rejects_limit_reached_swapped_axes_and_non_json():
    many = [wide_feature(f"f.{i}") for i in range(fetch.WFS_MAX_FEATURES)]
    with pytest.raises(GeologyError, match="límite"):
        fetch.validate_wfs(wfs_bytes(features=many), BOUNDS)
    # Ejes invertidos: lat/lon en vez de lon/lat; el bbox de la entidad no toca la consulta.
    swapped = geojson_feature("s", Polygon([(-26.3, -67.6), (-26.1, -67.6), (-26.1, -67.4), (-26.3, -67.4)]), wfs_props())
    with pytest.raises(GeologyError, match="ejes"):
        fetch.validate_wfs(wfs_bytes(features=[swapped]), BOUNDS)
    outside = geojson_feature("o", Polygon([(200, 0), (201, 0), (201, 1), (200, 0)]), wfs_props())
    with pytest.raises(GeologyError):
        fetch.validate_wfs(wfs_bytes(features=[outside]), BOUNDS)
    with pytest.raises(GeologyError):
        fetch.validate_wfs(b"<ServiceExceptionReport>secreto</ServiceExceptionReport>", BOUNDS)


# --- ZIP de Chile ------------------------------------------------------------------------------------------

def test_zip_with_geojson_inside_labeled_shapefile_is_detected_by_content():
    body = json.dumps(chile_collection([geojson_feature(None, Polygon([(0, 0), (1, 0), (1, 1)]), chile_props(1))])).encode()
    inspected = fetch.inspect_zip(zip_bytes({"Geologia.geojson": body}))
    assert inspected["format"] == "geojson" and inspected["geojson"] == body
    assert fetch.inspect_zip(zip_bytes({"a.shp": b"1", "a.dbf": b"2"}))["format"] == "shapefile"


@pytest.mark.parametrize("members", [
    {"../evil.geojson": b"{}"}, {"/abs.geojson": b"{}"}, {"sub/dir.geojson": b"{}"},
    {"a.geojson": b"{}", "b.geojson": b"{}"}, {"a.geojson": b"{}", "readme.txt": b"x"}, {"data.csv": b"x"},
])
def test_zip_rejects_unsafe_or_unexpected_members(members):
    with pytest.raises(GeologyError):
        fetch.inspect_zip(zip_bytes(members))


def test_zip_rejects_compression_bomb_and_garbage():
    with pytest.raises(GeologyError, match="razón de compresión"):
        fetch.inspect_zip(zip_bytes({"a.geojson": b"0" * (60 * 1024 * 1024)}))
    with pytest.raises(GeologyError):
        fetch.inspect_zip(b"no es un zip")


def test_chile_collection_requires_crs84_and_schema():
    ok = chile_collection([geojson_feature(None, Polygon([(0, 0), (1, 0), (1, 1)]), chile_props(1))])
    fetch.validate_chile_collection(json.dumps(ok).encode())
    wrong = copy.deepcopy(ok)
    wrong["crs"]["properties"]["name"] = "EPSG:3857"
    with pytest.raises(GeologyError):
        fetch.validate_chile_collection(json.dumps(wrong).encode())
    del ok["features"][0]["properties"]["lithology"]
    with pytest.raises(GeologyError):
        fetch.validate_chile_collection(json.dumps(ok).encode())


# --- HTTP ---------------------------------------------------------------------------------------------------

def test_http_rejects_foreign_hosts_http_scheme_and_foreign_redirect():
    server = FakeServer({})
    http = http_for(server)
    for url in ("http://sigam.segemar.gov.ar/x", "https://example.com/x", "https://evil.sigam.segemar.gov.ar.example/x"):
        with pytest.raises(GeologyError):
            http.fetch(url, 1000, "x")
    assert server.calls == []
    url = "https://sigam.segemar.gov.ar/a"
    redirect = FakeServer({url: FakeResponse(302, b"", {"Location": "https://attacker.example/steal"})})
    with pytest.raises(GeologyError):
        http_for(redirect).fetch(url, 1000, "x")
    assert redirect.calls == [url]


def test_http_follows_same_host_redirect_and_stamps_real_time():
    first, second = "https://sigam.segemar.gov.ar/a", "https://sigam.segemar.gov.ar/b"
    server = FakeServer({first: FakeResponse(301, b"", {"Location": "/b"}), second: b"ok"})
    answer = http_for(server).fetch(first, 1000, "x")
    assert answer["body"] == b"ok" and answer["acquired_at"] == "2026-01-02T03:04:05Z"


def test_http_enforces_byte_limit_and_does_not_echo_error_bodies():
    url = "https://sigam.segemar.gov.ar/a"
    with pytest.raises(GeologyError, match="límite"):
        http_for(FakeServer({url: b"x" * 2000})).fetch(url, 1000, "x")
    with pytest.raises(GeologyError, match="límite"):
        http_for(FakeServer({url: FakeResponse(200, b"x", {"Content-Length": "999999"})})).fetch(url, 1000, "x")
    server = FakeServer({url: FakeResponse(503, b"Authorization: Bearer SECRETO")})
    with pytest.raises(GeologyError) as error:
        http_for(server).fetch(url, 1000, "x")
    assert "SECRETO" not in str(error.value) and "HTTP 503" in str(error.value)
    assert len(server.calls) == fetch.ATTEMPTS  # transitorio: reintenta de forma acotada
    notfound = FakeServer({url: FakeResponse(404, b"")})
    with pytest.raises(GeologyError):
        http_for(notfound).fetch(url, 1000, "x")
    assert len(notfound.calls) == 1


def test_requests_carry_no_credentials_even_if_the_environment_has_secrets(monkeypatch, tmp_path):
    for name in ("ANTHROPIC_API_KEY", "COPERNICUS_CLIENT_SECRET", "EARTHDATA_TOKEN", "AUTHORIZATION"):
        monkeypatch.setenv(name, "SECRETO-DE-PRUEBA")
    server, _ = synthetic_world(SITES)
    ensure_raw(tmp_path / "raw", SITES, http=http_for(server))
    assert server.kwargs and all(set(k["headers"]) == {"Accept", "User-Agent"} for k in server.kwargs)
    stored = b"".join(path.read_bytes() for path in (tmp_path / "raw").iterdir() if path.suffix == ".json")
    assert b"SECRETO-DE-PRUEBA" not in stored


# --- Adquisición y caché ----------------------------------------------------------------------------------------

def test_acquire_inspects_content_picks_geojson_among_swapped_labels_and_caches(tmp_path):
    server, resources = synthetic_world(SITES)
    raw = tmp_path / "raw"
    acquisition, reused = ensure_raw(raw, SITES, http=http_for(server))
    assert reused is False
    layer = next(r for r in acquisition["records"] if r["role"] == "chile_layer")
    assert layer["resource_id"] == "r-shp" and layer["actual_format"] == "geojson"
    assert layer["acquired_at"] == "2026-01-02T03:04:05Z" and layer["bytes"] > 0
    assert sorted(path.name for path in raw.iterdir()) == sorted(
        ["acquisition.json", "ckan-package_show.json", "cl-geologia-base.zip",
         *(f"{s['site_id']}.json" for s in SITES if s["country"] == "AR")])
    calls = len(server.calls)
    again, reused = ensure_raw(raw, SITES, http=http_for(FakeServer({})))  # sin ninguna ruta: cualquier red falla
    assert reused is True and len(server.calls) == calls
    assert again["records"][0]["acquired_at"] == "2026-01-02T03:04:05Z"  # sin inventar fecha al reutilizar


def test_shapefile_labeled_first_is_rejected_and_next_resource_is_used(tmp_path):
    server, resources = synthetic_world(SITES)
    swapped = [resources[1], resources[0]]  # el primero contiene un Shapefile real
    server.routes[fetch.CKAN_URL] = __import__("tests.geology_fixtures", fromlist=["ckan_body"]).ckan_body(swapped)
    acquisition, _ = ensure_raw(tmp_path / "raw", SITES, http=http_for(server))
    layer = next(r for r in acquisition["records"] if r["role"] == "chile_layer")
    assert layer["rejected_resources"][0]["actual_format"] == "shapefile"
    assert layer["resource_id"] == "r-shp"


def test_corrupt_cache_file_is_invalid_and_offline_refuses(tmp_path):
    server, _ = synthetic_world(SITES)
    raw = tmp_path / "raw"
    ensure_raw(raw, SITES, http=http_for(server))
    victim = next(raw.glob("ar-win-s2620*.json"))
    victim.write_bytes(victim.read_bytes() + b" ")
    assert fetch.load_cache(raw, SITES) is None
    with pytest.raises(GeologyError, match="sin red"):
        ensure_raw(raw, SITES, offline=True)


def test_cache_for_another_geometry_or_request_is_invalid(tmp_path):
    server, _ = synthetic_world(SITES)
    raw = tmp_path / "raw"
    ensure_raw(raw, SITES, http=http_for(server))
    moved = copy.deepcopy(SITES)
    target = next(s for s in moved if s["site_id"] == "ar-win-s2620-w06750")
    target["geometry"]["coordinates"][0][1][0] += 1e-9  # cambio < 1e-6 grados
    assert fetch.load_cache(raw, moved) is None
    record_tamper = json.loads((raw / "acquisition.json").read_text("utf-8"))
    record_tamper["records"][0]["request"]["url"] += "&x=1"
    (raw / "acquisition.json").write_text(json.dumps(record_tamper), "utf-8")
    assert fetch.load_cache(raw, SITES) is None


def test_failed_refresh_keeps_previous_valid_cache_untouched(tmp_path):
    server, _ = synthetic_world(SITES)
    raw = tmp_path / "raw"
    ensure_raw(raw, SITES, http=http_for(server))
    before = {p.name: p.read_bytes() for p in raw.iterdir()}
    broken, _ = synthetic_world(SITES)
    broken.routes.pop(fetch.wfs_request(fetch.aoi_bounds(next(s for s in SITES if s["site_id"] == "ar-win-s2580-w06710")["geometry"]))["url"])
    with pytest.raises(GeologyError):
        ensure_raw(raw, SITES, http=http_for(broken), refresh=True)
    assert {p.name: p.read_bytes() for p in raw.iterdir()} == before
    assert not [p for p in tmp_path.iterdir() if p.name != "raw"]  # sin temporales huérfanos
    assert fetch.load_cache(raw, SITES) is not None


# --- Regresiones de la revisión A de Codex -----------------------------------------------------------------

def test_chile_and_argentina_share_the_geometry_control_before_installing():
    point = chile_collection([geojson_feature(None, Polygon([(0, 0), (1, 0), (1, 1)]), chile_props(1))])
    point["features"][0]["geometry"] = {"type": "Point", "coordinates": [-69.7, -25]}
    with pytest.raises(GeologyError):
        fetch.validate_chile_collection(json.dumps(point).encode())
    nan = json.loads(json.dumps(chile_collection([geojson_feature(None, Polygon([(0, 0), (1, 0), (1, 1)]), chile_props(1))])))
    nan["features"][0]["geometry"]["coordinates"][0][1] = [float("nan"), 0]  # json.dumps emite NaN
    with pytest.raises(GeologyError):
        fetch.validate_chile_collection(json.dumps(nan).encode())
    wfs = json.loads(json.dumps(wfs_collection(features=[wide_feature()])))
    wfs["features"][0]["geometry"]["coordinates"][0][1] = [-60, -30, 5]  # vértice 3D
    with pytest.raises(GeologyError):
        fetch.validate_wfs(json.dumps(wfs).encode(), BOUNDS)
    wfs = json.loads(json.dumps(wfs_collection(features=[wide_feature()])))
    wfs["features"][0]["geometry"]["coordinates"][0][1] = [float("nan"), -30]
    with pytest.raises(GeologyError):
        fetch.validate_wfs(json.dumps(wfs).encode(), BOUNDS)
    fetch.validate_wfs(wfs_bytes(features=[]), BOUNDS)  # cero geometrías con CRS null sigue siendo válido


def _cache(tmp_path):
    server, _ = synthetic_world(SITES)
    raw = tmp_path / "raw"
    ensure_raw(raw, SITES, http=http_for(server))
    return raw


def test_cache_symlink_is_rejected_before_opening(tmp_path):
    raw = _cache(tmp_path)
    assert fetch.load_cache(raw, SITES) is not None
    victim = next(raw.glob("ar-win-s2620*.json"))
    outside = tmp_path / "outside.json"
    outside.write_bytes(victim.read_bytes())  # mismos bytes: solo el enlace lo delata
    victim.unlink()
    victim.symlink_to(outside)
    assert fetch.load_cache(raw, SITES) is None


@pytest.mark.parametrize("name", ["../outside.json", "/etc/hosts", "sub/dir.json", ".hidden", "a b.json", ""])
def test_cache_unsafe_names_are_rejected_without_reading(tmp_path, name):
    raw = _cache(tmp_path)
    (tmp_path / "outside.json").write_bytes(b"{}")
    data = json.loads((raw / "acquisition.json").read_text("utf-8"))
    data["records"][0]["file"] = name
    (raw / "acquisition.json").write_text(json.dumps(data), "utf-8")
    assert fetch.load_cache(raw, SITES) is None


def test_cache_with_undeclared_files_or_incoherent_records_is_invalid(tmp_path):
    raw = _cache(tmp_path)
    (raw / "extra.json").write_text("{}")
    assert fetch.load_cache(raw, SITES) is None
    (raw / "extra.json").unlink()
    assert fetch.load_cache(raw, SITES) is not None
    original = (raw / "acquisition.json").read_text("utf-8")
    for mutate in (
        lambda d: d["records"][0].update(role="otro"),
        lambda d: d["records"][0].update(acquired_at="ayer"),
        lambda d: d["records"][0].update(acquired_at="2026-13-45T00:00:00Z"),
        lambda d: d["records"][0].update(http_status=500),
        lambda d: d["records"][0].update(bytes=1),
        lambda d: d["records"][1].update(actual_format="shapefile"),
        lambda d: d["records"].append(copy.deepcopy(d["records"][0])),
        lambda d: d["records"][2].update(number_returned=99),
        lambda d: d["records"][0]["request"].update(method="POST"),
    ):
        data = json.loads(original)
        mutate(data)
        (raw / "acquisition.json").write_text(json.dumps(data), "utf-8")
        assert fetch.load_cache(raw, SITES) is None
    (raw / "acquisition.json").write_text(original, "utf-8")
    assert fetch.load_cache(raw, SITES) is not None


def test_publish_replaces_in_pair_and_rolls_back(tmp_path):
    def make(name, text):
        path = tmp_path / name
        path.mkdir()
        (path / "f").write_text(text)
        return path

    old_a, old_b, new_a, new_b = make("a", "old-a"), make("b", "old-b"), make("na", "new-a"), make("nb", "new-b")
    calls = []

    def flaky(src, dst):
        calls.append((src, dst))
        if len(calls) == 4:
            raise OSError("fallo inyectado en el segundo reemplazo")
        return __import__("os").replace(src, dst)

    with pytest.raises(GeologyError, match="se restauró el estado anterior") as error:
        fetch.publish([(new_a, old_a), (new_b, old_b)], flaky)
    assert not isinstance(error.value, fetch.PackageStateError)
    assert (old_a / "f").read_text() == "old-a" and (old_b / "f").read_text() == "old-b"
    assert (new_a / "f").read_text() == "new-a" and (new_b / "f").read_text() == "new-b"
    assert sorted(p.name for p in tmp_path.iterdir()) == ["a", "b", "na", "nb"]
    fetch.publish([(new_a, old_a), (new_b, old_b)])
    assert (old_a / "f").read_text() == "new-a" and (old_b / "f").read_text() == "new-b"
    assert sorted(p.name for p in tmp_path.iterdir()) == ["a", "b"]  # sin respaldos huérfanos


def test_publish_reports_the_real_state_when_rollback_also_fails(tmp_path):
    def make(name):
        path = tmp_path / name
        path.mkdir()
        return path

    old_a, old_b, new_a, new_b = make("a"), make("b"), make("na"), make("nb")
    count = []

    def broken(src, dst):
        count.append(1)
        if len(count) >= 4:
            raise OSError("disco desaparecido")
        return __import__("os").replace(src, dst)

    with pytest.raises(fetch.PackageStateError) as error:
        fetch.publish([(new_a, old_a), (new_b, old_b)], broken)
    message = str(error.value)
    assert "no se pudo" in message.lower() and "previo" in message and "atomic" not in message.lower()


# --- Bordes finales de A (checkpoint Codex) ------------------------------------------------------------------

@pytest.mark.parametrize("fail_on", [2, 4])  # staging->destino del primer y del segundo par
def test_publish_failing_to_restore_the_same_pair_is_a_package_state_error(tmp_path, fail_on):
    import os

    def make(name, text):
        path = tmp_path / name
        path.mkdir()
        (path / "f").write_text(text)
        return path

    olds = [make("a", "old-a"), make("b", "old-b")]
    news = [make("na", "new-a"), make("nb", "new-b")]
    calls = []

    def flaky(src, dst):
        calls.append((src, dst))
        # La instalación del par falla y también la restauración inmediata de SU respaldo.
        if len(calls) in (fail_on, fail_on + 1):
            raise OSError("fallo inyectado")
        return os.replace(src, dst)

    with pytest.raises(fetch.PackageStateError) as error:
        fetch.publish(list(zip(news, olds)), flaky)
    message = str(error.value)
    failing_target = olds[0] if fail_on == 2 else olds[1]
    assert str(failing_target) in message and "no existe ahora" in message and ".previo" in message
    assert not failing_target.exists()
    backups = [p for p in tmp_path.iterdir() if ".previo." in p.name]
    assert len(backups) >= 1 and (backups[-1] / "f").read_text().startswith("old-")  # el respaldo se conserva
    if fail_on == 4:
        # El par anterior sí se deshizo: su destino volvió a tener el contenido antiguo.
        assert (olds[0] / "f").read_text() == "old-a" and (news[0] / "f").read_text() == "new-a"


def test_unclosed_ring_is_rejected_for_chile_and_argentina_but_closed_passes():
    open_ring = [[-70, -25], [-69, -25], [-69, -24], [-70, -24]]  # cuatro vértices distintos, sin cierre
    closed = open_ring + [open_ring[0]]
    geometry = {"type": "Polygon", "coordinates": [open_ring]}
    chile = json.loads(json.dumps(chile_collection([geojson_feature(None, Polygon([(0, 0), (1, 0), (1, 1)]), chile_props(1))])))
    chile["features"][0]["geometry"] = geometry
    with pytest.raises(GeologyError, match="cierre"):
        fetch.validate_chile_collection(json.dumps(chile).encode())
    wfs = json.loads(json.dumps(wfs_collection(features=[wide_feature()])))
    wfs["features"][0]["geometry"] = {"type": "MultiPolygon", "coordinates": [[closed], [open_ring]]}
    with pytest.raises(GeologyError, match="cierre"):
        fetch.validate_wfs(json.dumps(wfs).encode(), [-70, -25, -69, -24])
    wfs["features"][0]["geometry"] = {"type": "Polygon", "coordinates": [closed]}
    fetch.validate_wfs(json.dumps(wfs).encode(), [-70, -25, -69, -24])
    chile["features"][0]["geometry"] = {"type": "Polygon", "coordinates": [closed]}
    fetch.validate_chile_collection(json.dumps(chile).encode())
