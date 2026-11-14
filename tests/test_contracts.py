import copy
import json

import pytest

from pipelines.build_demo import DEFAULT_FIXTURES, DEFAULT_OUT, build, dump
from pipelines.contracts import ROOT, ContractError, load_profile, validate

PROFILE = ROOT / "config" / "mission_profiles" / "mars-rover-mobility-v1.json"


@pytest.fixture(scope="module")
def snapshot():
    return build(PROFILE, DEFAULT_FIXTURES, DEFAULT_OUT)


def test_p0_profile_is_valid_and_weights_sum_to_one():
    profile = load_profile(PROFILE)
    assert sum(c["weight"] for c in profile["criteria"]) == pytest.approx(1.0)
    assert profile["status"] == "needs_calibration"


def test_profile_with_bad_weights_is_rejected(tmp_path):
    profile = json.loads(PROFILE.read_text("utf-8"))
    profile["criteria"][0]["weight"] = 0.5
    path = tmp_path / "profile.json"
    path.write_text(json.dumps(profile), "utf-8")
    with pytest.raises(ContractError, match="pesos"):
        load_profile(path)


def test_committed_demo_snapshot_matches_pipeline_output(snapshot):
    """artifacts/demo no puede quedar desfasado respecto de fixtures + pipeline."""
    for name, content in snapshot.items():
        assert (DEFAULT_OUT / name).read_text("utf-8") == dump(content), (
            f"{name} desactualizado: ejecutar python -m pipelines.build_demo --profile {PROFILE}")


def test_demo_candidates_are_three_labelled_fixtures(snapshot):
    candidates = snapshot["candidate-details.json"]
    assert len(candidates) == 3
    assert {c["status"] for c in candidates} == {"fixture"}
    assert all("fixture" in c["site_id"] and "FIXTURE" in c["limitations"][0] for c in candidates)
    assert all(c["data_snapshot_version"] == snapshot["manifest.json"]["snapshot_version"]
               for c in candidates)
    # Los tres estados que la UI debe mostrar: completo, con faltantes, insuficiente.
    a, b, c = candidates
    assert a["similarity"] is not None and b["similarity"] is not None
    assert b["confidence"] < a["confidence"]
    assert c["similarity"] is None


def test_invalid_candidate_is_rejected(snapshot):
    candidate = copy.deepcopy(snapshot["candidate-details.json"][0])
    candidate["geometry"] = {"type": "Point", "coordinates": [-70, -30]}  # pins no permitidos
    with pytest.raises(ContractError, match="geometry"):
        validate(candidate, "candidate-site")
    candidate = copy.deepcopy(snapshot["candidate-details.json"][0])
    candidate["similarity"] = 140
    with pytest.raises(ContractError):
        validate(candidate, "candidate-site")
    manifest = copy.deepcopy(snapshot["manifest.json"])
    manifest["created_at"] = "ayer"
    with pytest.raises(ContractError):
        validate(manifest, "data-manifest")
