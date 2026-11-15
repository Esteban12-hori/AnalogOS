"""Offline tests of the pure functions in pipelines/fetch_basemaps.py."""

import json
import math

import numpy as np

from pipelines.contracts import ROOT
from pipelines.fetch_basemaps import median_composite, warp_rows_to_mercator


def test_median_composite_ignora_sin_dato_y_marca_huecos():
    a = np.zeros((2, 2, 4), np.float32)
    b = np.zeros((2, 2, 4), np.float32)
    c = np.zeros((2, 2, 4), np.float32)
    for layer, value in ((a, 100), (b, 110), (c, 250)):
        layer[..., :3] = value
        layer[..., 3] = 255
    # Pixel (1, 1): no data on any date.
    for layer in (a, b, c):
        layer[1, 1, 3] = 0
    rgba, gaps = median_composite([a, b, c])
    assert rgba[0, 0, 0] == 110  # median, the outlier date (cloud) does not dominate
    assert rgba[1, 1, 3] == 0  # the gap stays transparent, nothing is made up
    assert gaps == 0.25


def test_warp_rows_to_mercator_conserva_extremos_y_reordena_filas():
    height = 100
    rgba = np.zeros((height, 1, 4), np.float32)
    rgba[:, 0, 0] = np.arange(height)  # the value encodes the source row
    warped = warp_rows_to_mercator(rgba, south=-30.0, north=-17.0)
    assert warped.shape == rgba.shape
    assert warped[0, 0, 0] < 1 and warped[-1, 0, 0] > height - 2
    # At the middle of the Mercator image, the latitude is lower (further south) than the linear midpoint.
    y = lambda lat: math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    mid_lat = math.degrees(2 * math.atan(math.exp((y(-17) + y(-30)) / 2)) - math.pi / 2)
    expected_row = (-17 - mid_lat) / 13 * height - 0.5
    assert abs(warped[height // 2, 0, 0] - expected_row) < 1.0


def test_manifiesto_versionado_es_coherente():
    manifest = json.loads((ROOT / "artifacts" / "basemaps" / "basemaps.json").read_text())
    assert manifest["purpose"].startswith("Contexto visual")
    ids = {entry["id"] for entry in manifest["basemaps"]}
    candidates = json.loads((ROOT / "artifacts" / "science-v2" / "candidate-details.json").read_text())
    candidates = candidates if isinstance(candidates, list) else candidates["candidates"]
    assert {c["site_id"] for c in candidates} <= ids
    for entry in manifest["basemaps"]:
        west, south, east, north = entry["bounds"]
        assert west < east and south < north
        assert (ROOT / "artifacts" / entry["image"]).is_file()
        if entry["kind"] == "sector":
            assert entry["dates"], "a sector without dates is not a traceable median"
            assert entry["gap_fraction"] < 0.05


def test_vistas_previas_ligadas_al_sha_del_png_original():
    import hashlib

    manifest = json.loads((ROOT / "artifacts" / "basemaps" / "basemaps.json").read_text())
    index = json.loads((ROOT / "artifacts" / "visual-context" / "index.json").read_text())
    shas = {site["site_id"]: site["sha256"] for site in index["sites"]}
    assert {p["site_id"] for p in manifest["context_previews"]} == set(shas)
    for preview in manifest["context_previews"]:
        assert preview["source_sha256"] == shas[preview["site_id"]]
        original = ROOT / "artifacts" / preview["source_image"]
        assert hashlib.sha256(original.read_bytes()).hexdigest() == preview["source_sha256"]
        assert (ROOT / "artifacts" / preview["image"]).is_file()
