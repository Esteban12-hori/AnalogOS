"""Outlines of Chile and Argentina for the SVG map, from Natural Earth 1:50m.

Converts the TopoJSON from ``world-atlas`` (Natural Earth, public domain) into a
GeoJSON with the two countries. The outlines are geographic context: they are not
official boundaries nor a source of territorial authority.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from pipelines.contracts import ROOT

SOURCE_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json"
DEFAULT_SOURCE = ROOT / "data" / "raw" / "naturalearth" / "world-atlas-2.0.2-countries-50m.json"
DEFAULT_OUT = ROOT / "artifacts" / "science-v3" / "context-outline.geojson"
COUNTRIES = {"152": ("CL", "Chile"), "032": ("AR", "Argentina")}


def decode(topology: dict, geometry: dict) -> dict:
    """TopoJSON geometry (quantized, delta-encoded arcs) to GeoJSON MultiPolygon."""
    scale, translate = topology["transform"]["scale"], topology["transform"]["translate"]

    def arc(index: int) -> list[list[float]]:
        points, x, y = [], 0, 0
        for dx, dy in topology["arcs"][index if index >= 0 else ~index]:
            x, y = x + dx, y + dy
            points.append([round(x * scale[0] + translate[0], 4), round(y * scale[1] + translate[1], 4)])
        return points if index >= 0 else points[::-1]

    def ring(indices: list[int]) -> list[list[float]]:
        coordinates: list[list[float]] = []
        for index in indices:
            part = arc(index)
            coordinates.extend(part[1:] if coordinates else part)
        return coordinates

    polygons = geometry["arcs"] if geometry["type"] == "MultiPolygon" else [geometry["arcs"]]
    return {"type": "MultiPolygon", "coordinates": [[ring(indices) for indices in polygon] for polygon in polygons]}


def build(topology: dict) -> dict:
    # Some Natural Earth territories do not come with a numeric code; they are not needed here.
    geometries = {item.get("id"): item for item in topology["objects"]["countries"]["geometries"]}
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"country": code, "name": name, "source": "Natural Earth 1:50m vía world-atlas 2.0.2"},
                "geometry": decode(topology, geometries[identifier]),
            }
            for identifier, (code, name) in COUNTRIES.items()
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    if not args.source.exists():
        raise SystemExit(f"Missing {args.source}; download it from {SOURCE_URL}")
    outline = build(json.loads(args.source.read_text(encoding="utf-8")))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(outline, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {args.out} ({args.out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
