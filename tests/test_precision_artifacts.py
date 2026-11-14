import json
from pathlib import Path

import pytest

from pipelines.build_precision_snapshot import _nasadem_metrics
from pipelines.contracts import ROOT, validate


SCIENCE = ROOT / "artifacts" / "science-v2"
CONFIG_PATH = ROOT / "config" / "science_snapshot_v2.json"
YUNGAY_TILE = ROOT / "data" / "raw" / "nasadem" / "NASADEM_HGT_s24w070.zip"


def load(name: str):
    return json.loads((SCIENCE / name).read_text("utf-8"))


def test_precision_snapshot_contracts_and_versions_are_consistent():
    candidates = load("candidate-details.json")
    manifest = load("manifest.json")
    profile = load("mission-profile.json")
    validate(manifest, "data-manifest")
    validate(profile, "mission-profile")
    for candidate in candidates:
        validate(candidate, "candidate-site")
        assert candidate["data_snapshot_version"] == manifest["snapshot_version"]
        assert candidate["profile_version"] == profile["version"]


def test_precision_snapshot_uses_authenticated_real_sources():
    candidates = load("candidate-details.json")
    manifest = load("manifest.json")
    dataset_ids = {dataset["dataset_id"] for dataset in manifest["datasets"]}
    assert "copernicus-sentinel2-l2a-surface-2025-v1" in dataset_ids
    assert "nasa-earthdata-hls-s30-inventory-2025-v1" in dataset_ids
    assert any(dataset_id.startswith("nasadem-") for dataset_id in dataset_ids)
    assert all(candidate["confidence"] > 70 for candidate in candidates)
    assert all(
        next(row for row in candidate["score_breakdown"] if row["criterion_id"] == "bare_ground_fraction")["status"] == "valid"
        for candidate in candidates
    )


def test_versioned_yungay_analysis_records_four_complete_tiles():
    summary = load("analysis-summary.json")
    site = next(item for item in summary["sites"] if item["site_id"] == "cl-pampa-yungay-screening")
    assert site["nasadem"]["tiles"] == ["s24w070", "s24w071", "s25w070", "s25w071"]
    assert site["nasadem"]["source_valid_fraction"] == 1.0


@pytest.mark.skipif(
    not YUNGAY_TILE.exists(),
    reason="integración NASADEM opcional: ejecutar python -m pipelines.fetch_precision_data",
)
def test_raw_yungay_mosaic_crosses_four_tiles_without_truncation():
    config = json.loads(CONFIG_PATH.read_text("utf-8"))
    site = next(item for item in config["sites"] if item["site_id"] == "cl-pampa-yungay-screening")
    metrics = _nasadem_metrics(site, config)
    assert metrics["tiles"] == ["s24w070", "s24w071", "s25w070", "s25w071"]
    assert metrics["source_valid_fraction"] == 1.0


def test_precision_ranking_is_reproducible_and_water_trace_is_visible():
    candidates = load("candidate-details.json")
    ranked = sorted(candidates, key=lambda candidate: (-candidate["similarity"], candidate["site_id"]))
    assert [candidate["site_id"] for candidate in ranked] == [
        "cl-pampa-yungay-screening",
        "cl-domeyko-interior-screening",
        "cl-pampa-maria-elena-screening",
    ]
    assert [candidate["similarity"] for candidate in ranked] == [75.67, 71.6, 49.99]
    maria_elena = next(candidate for candidate in candidates if candidate["site_id"] == "cl-pampa-maria-elena-screening")
    assert any("agua permanente" in warning for warning in maria_elena["warnings"])


def test_secret_fields_are_absent_from_versionable_artifacts():
    text = "\n".join(path.read_text("utf-8") for path in SCIENCE.glob("*.json"))
    forbidden = ["access_token", "client_secret", "EARTHDATA_PASSWORD", "COPERNICUS_CLIENT_SECRET"]
    assert all(term not in text for term in forbidden)
