"""Geology package: contract, semantics, deterministic reconstruction, and real artifact."""

import copy
import hashlib
import json
from pathlib import Path

import pytest

from pipelines import build_geology_context as build
from pipelines import fetch_geology_data as fetch
from pipelines.contracts import ROOT, ContractError
from pipelines.geology_contract import geometries_equal, validate_package
from pipelines.geology_coverage import GeologyError
from tests.geology_fixtures import http_for, synthetic_world

CANDIDATES_PATH = ROOT / "artifacts" / "science-v3" / "candidate-details.json"
CANDIDATES_BYTES = CANDIDATES_PATH.read_bytes()
CANDIDATES = json.loads(CANDIDATES_BYTES)
REAL_ARTIFACT = ROOT / "artifacts" / "geology-context-v1"
REAL_RAW = ROOT / "data" / "raw" / "geology-context-v1"
AUDIT = ROOT / "docs" / "research" / "geology" / "measurements.json"


@pytest.fixture
def world(tmp_path):
    """Complete SYNTHETIC world: fake Chile and Argentina for the seven real sectors."""
    server, _ = synthetic_world(CANDIDATES)
    out, raw = tmp_path / "out", tmp_path / "raw"
    index, reused = build.build(out, raw, CANDIDATES_PATH, http=http_for(server))
    assert reused is False
    return server, out, raw, index


def test_synthetic_build_has_seven_sites_with_honest_states(world):
    _, out, _, index = world
    states = {s["site_id"]: s["availability"] for s in index["sites"]}
    assert len(states) == 7 and [s["site_id"] for s in index["sites"]] == [c["site_id"] for c in CANDIDATES]
    assert states["ar-win-s2620-w06750"] == "partial"
    assert states["ar-win-s2640-w06730"] == "no_coverage"
    assert states["ar-win-s2580-w06710"] == "available"
    assert sorted(p.name for p in out.iterdir()) == ["index.json"]
    assert index["candidates_sha256"] == hashlib.sha256(CANDIDATES_BYTES).hexdigest()
    assert all(site["geometry"] == c["geometry"] for site, c in zip(index["sites"], CANDIDATES))


def test_offline_rebuild_is_byte_identical_and_uses_no_network(world, tmp_path):
    server, out, raw, _ = world
    first = (out / "index.json").read_bytes()
    calls = len(server.calls)
    again = tmp_path / "again"
    _, reused = build.build(again, raw, CANDIDATES_PATH, offline=True)
    assert reused is True and (again / "index.json").read_bytes() == first and len(server.calls) == calls


def test_failed_source_keeps_previous_package_and_cache(world):
    server, out, raw, _ = world
    package = (out / "index.json").read_bytes()
    cache = {p.name: p.read_bytes() for p in raw.iterdir()}
    server.routes.clear()
    with pytest.raises(GeologyError):
        build.build(out, raw, CANDIDATES_PATH, http=http_for(server), refresh=True)
    assert (out / "index.json").read_bytes() == package
    assert {p.name: p.read_bytes() for p in raw.iterdir()} == cache
    assert sorted(p.name for p in out.parent.iterdir()) == ["out", "raw"]


def test_invalid_contract_or_semantics_never_replace_the_previous_package(world, monkeypatch):
    _, out, raw, _ = world
    package = (out / "index.json").read_bytes()

    def reject(*_args):
        raise ContractError("simulado")

    monkeypatch.setattr(build, "validate_package", reject)
    with pytest.raises(ContractError):
        build.build(out, raw, CANDIDATES_PATH, offline=True)
    assert (out / "index.json").read_bytes() == package
    assert sorted(p.name for p in out.parent.iterdir()) == ["out", "raw"]


def test_cached_acquisition_dates_are_the_package_dates_not_the_build_time(world):
    _, _, _, index = world
    stamps = {r["acquired_at"] for s in index["sources"] for r in s["requests"]}
    assert stamps == {"2026-01-02T03:04:05Z"}
    assert all(source["map_date"] is None for source in index["sources"])
    assert "generated_at" not in index


# --- Semantics ---------------------------------------------------------------------------------------------

def check(index):
    validate_package(index, CANDIDATES, CANDIDATES_BYTES)


def mutated(index, change):
    clone = copy.deepcopy(index)
    change(clone)
    return clone


@pytest.mark.parametrize("name,change,message", [
    ("tiny geometry shift", lambda i: i["sites"][0]["geometry"]["coordinates"][0][0].__setitem__(0, i["sites"][0]["geometry"]["coordinates"][0][0][0] + 1e-9), "geometry"),
    ("missing vertex", lambda i: i["sites"][1]["geometry"]["coordinates"][0].pop(), "geometry"),
    ("extra ring", lambda i: i["sites"][2]["geometry"]["coordinates"].append(i["sites"][2]["geometry"]["coordinates"][0]), "geometry"),
    ("other candidate file", lambda i: i.update(candidates_sha256="0" * 64), "candidates_sha256"),
    ("other snapshot", lambda i: i.update(snapshot_version="otro"), "snapshot_version"),
    ("order swapped", lambda i: i["sites"].reverse(), "same order"),
    ("country", lambda i: i["sites"][0].update(country="AR"), "country"),
    ("closure", lambda i: i["sites"][0]["area_fractions"].update(unmapped=0.3), "add up"),
    ("understated state", lambda i: i["sites"][5].update(availability="partial"), "availability"),
    ("state lie", lambda i: i["sites"][3].update(availability="available"), "availability"),
    ("foreign url", lambda i: i["sources"][0]["requests"][0].update(url="https://example.com/x"), "URL"),
    ("nan", lambda i: i["sites"][0]["area_fractions"].update(unmapped=float("nan")), ".+"),
    ("map date invented", lambda i: i["sources"][0].update(map_date="2020-01-01"), "map_date"),
    ("fraction >1", lambda i: i["sites"][0]["area_fractions"].update(covered_total=1.5), ".+"),
    ("unit sum", lambda i: i["sites"][0]["units"][0].update(fraction_unambiguous=0.0, fraction_in_ambiguity=i["sites"][0]["units"][0]["fraction_including_overlap"]), "units"),
    ("unknown request", lambda i: i["sites"][0].update(request_ids=["a" * 64]), "request_ids"),
    ("extra field", lambda i: i["sites"][0].update(score=1), ".+"),
])
def test_semantics_rejects_tampered_packages(world, name, change, message):
    _, _, _, index = world
    check(index)
    with pytest.raises(ContractError, match=message):
        check(mutated(index, change))


def test_geometry_equality_detects_changes_below_1e6_degrees():
    ring = CANDIDATES[0]["geometry"]
    assert geometries_equal(ring, copy.deepcopy(ring))
    for delta in (1e-6, 1e-9, 1e-12):
        other = copy.deepcopy(ring)
        other["coordinates"][0][2][1] += delta
        assert not geometries_equal(ring, other)
    other = copy.deepcopy(ring)
    other["coordinates"][0][0] = [other["coordinates"][0][0][0], other["coordinates"][0][0][1] + 0.0]
    assert geometries_equal(ring, other)


# --- Artefacto real --------------------------------------------------------------------------------------------

real = pytest.mark.skipif(not (REAL_ARTIFACT / "index.json").exists(), reason="paquete geológico real no generado")


@real
def test_real_package_validates_against_contract_and_candidates():
    index = json.loads((REAL_ARTIFACT / "index.json").read_text("utf-8"))
    check(index)
    assert sorted(p.name for p in REAL_ARTIFACT.iterdir()) == ["index.json"]
    assert len(index["sites"]) == 7 and {s["country"] for s in index["sites"]} == {"CL", "AR"}
    text = (REAL_ARTIFACT / "index.json").read_text("utf-8")
    for forbidden in ("/Users/", "data/raw", "feasibility", "Authorization", "ANTHROPIC", "COPERNICUS"):
        assert forbidden not in text


@real
def test_real_package_matches_the_independent_audit_within_tolerance():
    """The feasibility report is an independent CONTROL: it is compared against, not copied or forced.."""
    if not AUDIT.exists():
        pytest.skip("research audit unavailable")
    index = json.loads((REAL_ARTIFACT / "index.json").read_text("utf-8"))
    sources = {s["source_id"]: s for s in index["sources"]}
    audit = {(m["site_id"], m["scale_denominator"]): m for m in json.loads(AUDIT.read_text("utf-8"))["measurements"]}
    for site in index["sites"]:
        expected = audit[(site["site_id"], sources[site["source_id"]]["scale_denominator"])]
        fractions = site["area_fractions"]
        assert 100 * fractions["covered_total"] == pytest.approx(expected["coverage_pct"], abs=1e-3)
        assert 100 * fractions["unmapped"] == pytest.approx(expected["unmapped_pct"], abs=1e-3)
        assert 100 * fractions["covered_ambiguous"] == pytest.approx(expected["cross_unit_overlap_pct"], abs=1e-3)
        assert len(site["units"]) == len(expected["units"])
        assert site["aoi_area_km2"] == pytest.approx(expected["area_km2_equal_area"], rel=1e-6)
        assert fractions["unusable_upper_bound"] == 0  # the audit repaired everything; here each repair was accepted


@real
@pytest.mark.skipif(not (REAL_RAW / "acquisition.json").exists(), reason="sin caché raw local")
def test_real_offline_rebuild_is_identical_to_the_committed_package(tmp_path):
    again = tmp_path / "again"
    build.build(again, REAL_RAW, CANDIDATES_PATH, offline=True)
    assert (again / "index.json").read_bytes() == (REAL_ARTIFACT / "index.json").read_bytes()


# --- Regressions from Codex review A -----------------------------------------------------------------

import os
from urllib.parse import quote

from shapely.geometry import Point, mapping

from pipelines.fetch_geology_data import PackageStateError, request_digest
from tests.geology_fixtures import TIME, chile_collection, geojson_feature, zip_bytes


def snapshot(*directories):
    """Full contents (name -> bytes) of several directories, to verify that nothing changed."""
    return [{str(p.relative_to(d)): p.read_bytes() for p in sorted(d.rglob("*")) if p.is_file()} for d in directories]


def site_of(index, site_id):
    return next(site for site in index["sites"] if site["site_id"] == site_id)


def source_of(index, country):
    return next(source for source in index["sources"] if source["country"] == country)


def test_ar_site_cannot_cite_another_sector_acquisition(world):
    _, _, _, index = world
    ar4, ar6 = site_of(index, "ar-win-s2620-w06750"), site_of(index, "ar-win-s2580-w06710")
    check(index)
    with pytest.raises(ContractError, match="does not belong to this sector"):
        check(mutated(index, lambda i: site_of(i, "ar-win-s2620-w06750").update(request_ids=ar6["request_ids"])))
    with pytest.raises(ContractError, match="exactly its WFS request"):
        check(mutated(index, lambda i: site_of(i, "ar-win-s2620-w06750").update(request_ids=ar4["request_ids"] + ar6["request_ids"])))


def test_chile_site_must_cite_the_layer_download_not_only_the_catalog(world):
    _, _, _, index = world
    metadata = next(r for r in source_of(index, "CL")["requests"] if r["role"] == "chile_catalog_metadata")
    layer = next(r for r in source_of(index, "CL")["requests"] if r["role"] == "chile_layer")
    with pytest.raises(ContractError, match="layer download"):
        check(mutated(index, lambda i: site_of(i, "cl-win-s2500-w06970").update(request_ids=[metadata["request_id"]])))
    # The metadata may be additional.
    check(mutated(index, lambda i: site_of(i, "cl-win-s2500-w06970").update(
        request_ids=[layer["request_id"], metadata["request_id"]])))


def retarget(index, site_id, bbox_text):
    """Changes the bbox of a sector's URL while keeping request_id and the site citation consistent."""
    request = next(r for r in source_of(index, "AR")["requests"] if r["site_id"] == site_id)
    old_id = request["request_id"]
    head, _, tail = request["url"].partition("bbox=")
    rest = tail.split("&", 1)[1]
    request["url"] = f"{head}bbox={quote(bbox_text, safe='')}&{rest}"
    request["request_id"] = request_digest({"method": "GET", "url": request["url"]})
    site_of(index, site_id)["request_ids"] = [request["request_id"] if x == old_id else x for x in site_of(index, site_id)["request_ids"]]


def test_wfs_request_bbox_must_equal_the_sector_exactly_without_rounding(world):
    _, _, _, index = world
    bounds = __import__("pipelines.fetch_geology_data", fromlist=["aoi_bounds"]).aoi_bounds(
        site_of(index, "ar-win-s2620-w06750")["geometry"])
    for delta in (1e-6, 1e-12):
        shifted = [bounds[0] + delta, *bounds[1:]]
        with pytest.raises(ContractError, match="WFS request bbox"):
            check(mutated(index, lambda i: retarget(i, "ar-win-s2620-w06750", ",".join(repr(v) for v in shifted) + ",EPSG:4326")))
    # Redondeada a 6 decimales: es otra bbox aunque «parezca» igual.
    rounded = ",".join(f"{v:.6f}" for v in bounds) + ",EPSG:4326"
    assert rounded.split(",")[:4] != [repr(v) for v in bounds]
    with pytest.raises(ContractError):
        check(mutated(index, lambda i: retarget(i, "ar-win-s2620-w06750", rounded)))
    exact = ",".join(repr(v) for v in bounds) + ",EPSG:4326"
    check(mutated(index, lambda i: retarget(i, "ar-win-s2620-w06750", exact)))  # the exact shape passes


@pytest.mark.parametrize("change,message", [
    (lambda i: source_of(i, "AR")["requests"][0].update(request_id="b" * 64), "request_id"),
    (lambda i: source_of(i, "AR")["requests"][0].update(site_id="ar-win-s2580-w06710"), "one WFS request per sector"),
    (lambda i: source_of(i, "AR")["requests"][0].update(number_returned=99), "truncated"),
    (lambda i: source_of(i, "AR")["requests"].pop(), "one WFS request per sector"),
    (lambda i: source_of(i, "CL")["requests"].pop(), "exactly CKAN metadata"),
    (lambda i: source_of(i, "CL")["requests"][0].update(url="https://lineasdebasepublicas.mma.gob.cl/otra"), "request_id"),
    (lambda i: source_of(i, "CL")["license"].update(declared_id="otra-licencia"), "license"),
    (lambda i: i["policy"].update(repair_total_area_relative_limit=0.5), "policy"),
])
def test_acquisition_binding_rejects_inconsistent_requests(world, change, message):
    _, _, _, index = world
    with pytest.raises(ContractError, match=message):
        check(mutated(index, change))


def test_accepted_repair_outside_the_limits_is_not_a_valid_package(world):
    _, _, _, index = world
    diagnostic = {"feature_id": "x", "validity_reason": "r", "method": "m", "status": "accepted",
                  "total_area_relative_change": 0.5, "symmetric_difference_relative_to_entity": 0.0,
                  "symmetric_difference_fraction_of_aoi": 0.0}
    with pytest.raises(ContractError, match="total area"):
        check(mutated(index, lambda i: site_of(i, "cl-win-s2500-w06970")["geometry_diagnostics"].append(diagnostic)))


def test_metadata_reflects_only_observed_resources_license_and_sigam_name(world, tmp_path):
    _, _, _, index = world
    cl, ar = source_of(index, "CL"), source_of(index, "AR")
    text = " ".join(cl["transformations"])
    assert "rotulado «SHP»" in text and "Shapefile" not in text and "shapefile" not in text  # only one was inspected
    assert cl["license"]["declared_id"] == "cc-zero" and "cc-zero" in cl["license"]["name"]
    assert "Sistema de Información Geológica Ambiental Minera" in ar["distributor"]
    assert "Geominera" not in json.dumps(index, ensure_ascii=False)
    assert "plano" in " ".join(ar["transformations"]) and "lon/lat y" not in " ".join(ar["transformations"])
    swapped, _ = synthetic_world(CANDIDATES, shapefile_first=True)
    other, _ = build.build(tmp_path / "o2", tmp_path / "r2", CANDIDATES_PATH, http=http_for(swapped))
    swapped_text = " ".join(source_of(other, "CL")["transformations"])
    assert "contenía shapefile y no se usó" in swapped_text and "GeoJSON y fue el usado" in swapped_text


def test_changed_ckan_license_is_rejected_not_labeled_cc0(tmp_path):
    server, _ = synthetic_world(CANDIDATES, license_id="cc-by")
    out, raw = tmp_path / "out", tmp_path / "raw"
    with pytest.raises(GeologyError, match="cc-by"):
        build.build(out, raw, CANDIDATES_PATH, http=http_for(server))
    assert not out.exists() and not raw.exists()  # nothing is installed


# --- Cache + package transaction ----------------------------------------------------------------------------

def refresh(out, raw, server, **kwargs):
    return build.build(out, raw, CANDIDATES_PATH, http=http_for(server, clock=lambda: "2026-02-03T04:05:06Z"),
                       refresh=True, **kwargs)


def test_fresh_layer_with_a_point_keeps_previous_raw_and_package(world, tmp_path):
    server, out, raw, _ = world
    before = snapshot(raw, out)
    bad, resources = synthetic_world(CANDIDATES)
    collection = chile_collection([geojson_feature(None, Point(-69.7, -25), {"objectid": 1, "cod_geologia": "Qa",
                                                                              "lithostrat": "x", "lithology": "y"})])
    bad.routes[resources[0]["url"]] = zip_bytes({"Fixture.geojson": json.dumps(collection).encode()})
    with pytest.raises(GeologyError):
        refresh(out, raw, bad)
    assert snapshot(raw, out) == before
    assert sorted(p.name for p in out.parent.iterdir()) == ["out", "raw"]


def test_failure_after_download_in_analysis_keeps_previous_raw_and_package(world, monkeypatch):
    _, out, raw, _ = world
    before = snapshot(raw, out)
    fresh, _ = synthetic_world(CANDIDATES)

    def boom(*_args, **_kwargs):
        raise GeologyError("fallo de análisis inyectado")

    monkeypatch.setattr(build, "analyze_site", boom)
    with pytest.raises(GeologyError, match="inyectado"):
        refresh(out, raw, fresh)
    assert snapshot(raw, out) == before
    assert sorted(p.name for p in out.parent.iterdir()) == ["out", "raw"]


def test_injected_validation_failure_after_fresh_download_keeps_everything(world, monkeypatch):
    _, out, raw, _ = world
    before = snapshot(raw, out)
    fresh, _ = synthetic_world(CANDIDATES)

    def reject(*_args):
        raise ContractError("validación inyectada")

    monkeypatch.setattr(build, "validate_package", reject)
    with pytest.raises(ContractError):
        refresh(out, raw, fresh)
    assert snapshot(raw, out) == before
    assert sorted(p.name for p in out.parent.iterdir()) == ["out", "raw"]


def test_failure_of_the_second_replacement_restores_raw_and_package(world):
    _, out, raw, _ = world
    before = snapshot(raw, out)
    fresh, _ = synthetic_world(CANDIDATES)
    calls = []

    def flaky(src, dst):
        calls.append(1)
        if len(calls) == 4:  # raw->respaldo, nuevo raw, paquete->respaldo, [nuevo paquete]
            raise OSError("fallo inyectado")
        return os.replace(src, dst)

    with pytest.raises(GeologyError, match="the previous state was restored") as error:
        refresh(out, raw, fresh, replace=flaky)
    assert not isinstance(error.value, PackageStateError)
    assert snapshot(raw, out) == before
    assert sorted(p.name for p in out.parent.iterdir()) == ["out", "raw"]
    # With a healthy source, the same refresh does install both, with the date of the new acquisition.
    index, reused = refresh(out, raw, fresh)
    assert reused is False and {r["acquired_at"] for s in index["sources"] for r in s["requests"]} == {"2026-02-03T04:05:06Z"}
    assert json.loads((out / "index.json").read_text("utf-8")) == index
    assert build.build(out.parent / "o3", raw, CANDIDATES_PATH, offline=True)[0] == index  # the new cache was installed
    assert sorted(p.name for p in out.parent.iterdir() if p.name.startswith(".")) == []


def test_rollback_failure_reports_real_state_without_promising_atomicity(world):
    _, out, raw, _ = world
    fresh, _ = synthetic_world(CANDIDATES)
    calls = []

    def dying(src, dst):
        calls.append(1)
        if len(calls) >= 4:
            raise OSError("disco desaparecido")
        return os.replace(src, dst)

    with pytest.raises(PackageStateError) as error:
        refresh(out, raw, fresh, replace=dying)
    message = str(error.value).lower()
    assert "could not" in message and "previo" in message and "atomic" not in message


def test_offline_reuse_publishes_only_the_package_without_copying_raw(world, tmp_path, monkeypatch):
    _, _, raw, _ = world
    captured = []
    real_publish = build.publish
    monkeypatch.setattr(build, "publish", lambda pairs, replace=os.replace: (captured.append(pairs), real_publish(pairs, replace)))
    raw_before = snapshot(raw)
    build.build(tmp_path / "again", raw, CANDIDATES_PATH, offline=True)
    assert len(captured) == 1 and [target.name for _, target in captured[0]] == ["again"]
    assert snapshot(raw) == raw_before


# --- Phase B: independent export and packager without geoprocessing ---------------------------------------------

import subprocess
import sys

from pipelines.geology_contract import build_export, validate_export

GOLDEN = ROOT / "tests" / "fixtures" / "geology-export-ar-win-s2640-w06730.json"
GOLDEN_V2 = ROOT / "tests" / "fixtures" / "geology-export-v2-ar-win-s2640-w06730.json"


def test_export_schema_is_self_contained_and_does_not_drift_from_the_package_schema():
    package = json.loads((ROOT / "contracts" / "geology-context.schema.json").read_text("utf-8"))
    export = json.loads((ROOT / "contracts" / "geology-export.schema.json").read_text("utf-8"))
    assert export["$defs"] == package["$defs"]
    for key in ("processing", "policy", "limitations", "editorial_note"):
        assert export["properties"][key] == package["properties"][key]
    assert "geology-context.schema" not in json.dumps(export)  # no external references: self-contained


def test_each_site_exports_a_valid_subset_with_needed_requests_only(world):
    _, _, _, index = world
    for site in index["sites"]:
        export = build_export(index, site["site_id"])
        validate_export(export)
        roles = sorted(r["role"] for r in export["source"]["requests"])
        assert roles == (["argentina_wfs"] if site["country"] == "AR" else ["chile_catalog_metadata", "chile_layer"])
        assert export["export_info"]["subset"] is True and "candidates_sha256" not in export
        assert export["export_info"]["full_candidates_file_sha256"] == index["candidates_sha256"]
        assert [s["site_id"] for s in [export["site"]]] == [site["site_id"]]
    with pytest.raises(ContractError):
        build_export(index, "no-existe")


def test_tampered_exports_are_rejected(world):
    _, _, _, index = world
    base = build_export(index, "ar-win-s2620-w06750")
    other = site_of(index, "ar-win-s2580-w06710")
    cases = [
        lambda e: e["site"].update(request_ids=other["request_ids"]),
        lambda e: e["site"]["area_fractions"].update(unmapped=0.0),
        lambda e: e["site"].update(availability="available"),
        lambda e: e["export_info"].update(subset=False),
        lambda e: e["source"].update(dataset_url="https://evil.example/x"),
        lambda e: e["source"].update(source_id="cl-sernageomin-mma-geologia-base"),
        lambda e: e["source"]["requests"].append(copy.deepcopy(e["source"]["requests"][0])),
        lambda e: e["policy"].update(repair_total_area_relative_limit=0.9),
        lambda e: e["site"]["geometry"]["coordinates"][0].pop(),
    ]
    for mutate in cases:
        broken = copy.deepcopy(base)
        mutate(broken)
        with pytest.raises(ContractError):
            validate_export(broken)


@real
def test_python_export_matches_the_golden_used_by_the_web_parity_test():
    index = json.loads((REAL_ARTIFACT / "index.json").read_text("utf-8"))
    expected = json.loads(GOLDEN.read_text("utf-8"))
    assert build_export(index, "ar-win-s2640-w06730") == expected, (
        "The reference export is out of date with the package. Regenerate with: .venv/bin/python -c \"import json;"
        "from pipelines.geology_contract import build_export;i=json.load(open('artifacts/geology-context-v1/index.json'));"
        "open('tests/fixtures/geology-export-ar-win-s2640-w06730.json','w').write(json.dumps(build_export(i,'ar-win-s2640-w06730'),"
        "indent=2,ensure_ascii=False)+'\\n')\""
    )


@real
def test_python_export_v2_matches_the_english_golden_and_differs_from_v1_only_in_export_info():
    index = json.loads((REAL_ARTIFACT / "index.json").read_text("utf-8"))
    v2 = build_export(index, "ar-win-s2640-w06730", 2)
    assert v2 == json.loads(GOLDEN_V2.read_text("utf-8")), (
        "The English v2 golden drifted. Regenerate with: .venv/bin/python -c \"import json;"
        "from pipelines.geology_contract import build_export;i=json.load(open('artifacts/geology-context-v1/index.json'));"
        "open('tests/fixtures/geology-export-v2-ar-win-s2640-w06730.json','w').write(json.dumps(build_export(i,'ar-win-s2640-w06730',2),"
        "indent=2,ensure_ascii=False)+'\\n')\""
    )
    v1 = build_export(index, "ar-win-s2640-w06730")
    assert v1["schema_version"] == 1 and v2["schema_version"] == 2  # legacy default is preserved
    strip = lambda e: {**e, "schema_version": None, "export_info": {**e["export_info"], "description": None, "how_to_read": None}}
    assert strip(v1) == strip(v2)


def test_export_wording_must_match_its_schema_version(world):
    _, _, _, index = world
    v1 = build_export(index, "ar-win-s2620-w06750")
    v2 = build_export(index, "ar-win-s2620-w06750", 2)
    validate_export(v1)
    validate_export(v2)
    for broken in ({**v1, "schema_version": 2}, {**v2, "schema_version": 1}, {**v2, "export_info": v1["export_info"]}, {**v1, "schema_version": 3}):
        with pytest.raises(ContractError):
            validate_export(broken)
    for bad_version in (0, 3, "2", True):
        with pytest.raises(ContractError):
            build_export(index, "ar-win-s2620-w06750", bad_version)


def test_contract_module_does_not_pull_geoprocessing_dependencies():
    code = ("import sys, pipelines.geology_contract, pipelines.geology_policy;"
            "print(sorted(m for m in ('shapely','pyproj','numpy','requests','PIL') if m in sys.modules))")
    result = subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True, text=True, check=True)
    assert result.stdout.strip() == "[]"
