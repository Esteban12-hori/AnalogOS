"""Genera el snapshot demo NO CIENTÍFICO en artifacts/demo a partir de fixtures.

    python -m pipelines.build_demo --profile config/mission_profiles/mars-rover-mobility-v1.json

Escribe manifest.json, mission-profile.json y candidate-details.json, todos
validados contra contracts/. La salida es determinista: mismas entradas, mismos bytes.
"""

import argparse
import hashlib
import json
from pathlib import Path

from pyproj import Geod

from pipelines import __version__
from pipelines.contracts import ROOT, load_profile, validate
from pipelines.scoring import aggregate, sensitivity

DEFAULT_FIXTURES = ROOT / "tests" / "fixtures" / "demo_snapshot_input.json"
DEFAULT_OUT = ROOT / "artifacts" / "demo"
_GEOD = Geod(ellps="WGS84")


def _area_km2(geometry: dict) -> float:
    """Área geodésica (WGS84), no en grados."""
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    total = 0.0
    for rings in polygons:
        for index, ring in enumerate(rings):
            area, _ = _GEOD.polygon_area_perimeter([p[0] for p in ring], [p[1] for p in ring])
            total += abs(area) if index == 0 else -abs(area)  # los anillos interiores restan
    return round(total / 1e6, 1)


def build(profile_path: Path, fixtures_path: Path, out_dir: Path) -> dict[str, object]:
    """Devuelve {nombre_de_archivo: contenido} ya validado; no escribe nada."""
    profile = load_profile(profile_path)
    fx = json.loads(fixtures_path.read_text("utf-8"))

    datasets = [fx["fixture_dataset"] | {
        "checksum": "sha256:" + hashlib.sha256(fixtures_path.read_bytes()).hexdigest()}]
    for context in fx["context_datasets"]:
        entry = dict(context)
        digest = hashlib.sha256((out_dir / entry.pop("file")).read_bytes()).hexdigest()
        datasets.append(entry | {"checksum": "sha256:" + digest})
    manifest = {
        "snapshot_version": fx["snapshot_version"],
        "created_at": fx["created_at"],
        "pipeline_version": __version__,
        "datasets": datasets,
    }
    validate(manifest, "data-manifest")

    candidates = []
    for site in sorted(fx["sites"], key=lambda s: s["site_id"]):
        inputs = {
            criterion_id: {"dataset_id": fx["default_dataset_id"],
                           "explanation": fx["default_explanation"]} | given
            for criterion_id, given in site["criteria"].items()
        }
        for criterion in profile["criteria"]:
            inputs.setdefault(criterion["id"], {"dataset_id": fx["default_dataset_id"],
                                                "explanation": fx["missing_explanation"]})
        result = aggregate(profile["criteria"], inputs, **{
            k: profile["aggregation"][k] for k in ("epsilon", "minimum_valid_weight")})
        sensitivity_result = sensitivity(profile["criteria"], inputs, **{
            k: profile["aggregation"][k] for k in ("epsilon", "minimum_valid_weight")})
        candidate = {
            "site_id": site["site_id"],
            "name": site["name"],
            "profile_id": profile["id"],
            "profile_version": profile["version"],
            "data_snapshot_version": fx["snapshot_version"],
            "pipeline_version": __version__,
            "geometry": site["geometry"],
            "area_km2": _area_km2(site["geometry"]),
            "status": "fixture",  # nunca "candidate": esto no es un resultado científico
            "similarity": result["similarity"],
            "confidence": result["confidence"],
            "feasibility": site["feasibility"],
            "stability": sensitivity_result["stability"],
            "score_breakdown": result["score_breakdown"],
            "warnings": site["warnings"],
            "limitations": fx["limitations"],
            "field_checks": fx["field_checks"],
            "evidence": fx["evidence"],
        }
        validate(candidate, "candidate-site")
        candidates.append(candidate)

    return {
        "manifest.json": manifest,
        "mission-profile.json": profile,
        "candidate-details.json": candidates,
    }


def dump(content: object) -> str:
    return json.dumps(content, ensure_ascii=False, indent=2) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--profile", type=Path, required=True)
    parser.add_argument("--fixtures", type=Path, default=DEFAULT_FIXTURES)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for name, content in build(args.profile, args.fixtures, args.out).items():
        (args.out / name).write_text(dump(content), "utf-8")
        print(f"escrito {args.out / name}")
    print("AVISO: snapshot de fixtures NO CIENTÍFICO.")


if __name__ == "__main__":
    main()
