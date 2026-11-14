import json
from pathlib import Path

from pipelines.contracts import ROOT, validate

SCIENCE = ROOT / "artifacts" / "science-v1"


def load(name: str):
    return json.loads((SCIENCE / name).read_text("utf-8"))


def test_science_snapshot_contracts_and_versions_are_consistent():
    candidates = load("candidate-details.json")
    manifest = load("manifest.json")
    profile = load("mission-profile.json")
    validate(manifest, "data-manifest")
    validate(profile, "mission-profile")
    for candidate in candidates:
        validate(candidate, "candidate-site")
        assert candidate["data_snapshot_version"] == manifest["snapshot_version"]
        assert candidate["profile_version"] == profile["version"]


def test_final_snapshot_has_three_real_screening_candidates_and_no_fixture():
    candidates = load("candidate-details.json")
    assert len(candidates) == 3
    assert all(candidate["status"] == "candidate" for candidate in candidates)
    assert all("fixture" not in candidate["name"].lower() for candidate in candidates)
    assert all(candidate["similarity"] is not None for candidate in candidates)


def test_sources_and_missing_evidence_are_explicit():
    manifest = load("manifest.json")
    candidates = load("candidate-details.json")
    dataset_ids = {dataset["dataset_id"] for dataset in manifest["datasets"]}
    assert "nasa-pds-mola-meg128-jezero-v1" in dataset_ids
    assert "nasa-power-climatology-points-v1" in dataset_ids
    assert len({dataset_id for dataset_id in dataset_ids if dataset_id.startswith("srtm-")}) == 3
    for candidate in candidates:
        statuses = {row["criterion_id"]: row["status"] for row in candidate["score_breakdown"]}
        assert statuses["bare_ground_fraction"] == "missing"
        assert statuses["geologic_relevance"] == "needs_calibration"
        assert candidate["confidence"] < 70
        assert candidate["feasibility"] == "requires_review"


def test_yungay_is_the_reproducible_top_result():
    candidates = load("candidate-details.json")
    ranked = sorted(candidates, key=lambda candidate: (-candidate["similarity"], candidate["site_id"]))
    assert ranked[0]["site_id"] == "cl-pampa-yungay-screening"
    assert [candidate["similarity"] for candidate in ranked] == [73.65, 65.11, 40.7]
