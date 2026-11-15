"""Offline exploratory audit; it does NOT modify the snapshot or compute suitability.

Uses the public cache specified in GEOLOGY_FEASIBILITY.md. Requires shapely and
pyproj in the research environment, without adding dependencies to the application.
"""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

from pyproj import Transformer
from shapely import make_valid, transform
from shapely.geometry import box, shape
from shapely.ops import unary_union


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


TO_AREA = Transformer.from_crs(4326, 6933, always_xy=True).transform


def area(geometry):
    return transform(geometry, TO_AREA, interleaved=False).area


def parse_features(data):
    assert data["type"] == "FeatureCollection"
    result = []
    for f in data["features"]:
        if f["geometry"] is None:
            continue
        g = shape(f["geometry"])
        if g.is_empty:
            continue
        p = f["properties"]
        result.append((g, p, str(f.get("id", p.get("objectid", "unknown")))))
    return result


def measure(site, records, layer, scale, fields):
    aoi = shape(site["geometry"])
    denominator = area(aoi)
    groups, properties, feature_ids, repaired, descriptions = {}, {}, {}, [], []
    clipped_count = 0
    for g, p, feature_id in records:
        if not box(*g.bounds).intersects(aoi):
            continue
        if not g.is_valid:
            repaired.append(feature_id)
            g = make_valid(g)
        cut = g.intersection(aoi)
        if cut.is_empty or cut.area == 0:
            continue
        clipped_count += 1
        key = tuple(str(p.get(k) or "").strip() for k in fields)
        groups.setdefault(key, []).append(cut)
        feature_ids.setdefault(key, []).append(feature_id)
        properties[key] = p
        if str(p.get(fields[-1]) or "").strip() not in ("", "*"):
            descriptions.append(cut)
    dissolved = {k: unary_union(parts) for k, parts in groups.items()}
    all_parts = [g for parts in groups.values() for g in parts]
    union = unary_union(all_parts)
    shapes = list(dissolved.values())
    # Distinguish overlap between units from duplication within the same unit.
    conflict = unary_union([g.intersection(h) for i, g in enumerate(shapes) for h in shapes[i+1:]])

    def pct(g):
        return round(100 * area(g) / denominator, 6)

    units = [{
        "key": list(k), "feature_ids": sorted(feature_ids[k]),
        "original_properties": properties[k],
        "mapped_area_pct_including_overlap": pct(g),
        "unambiguous_area_pct": pct(g.difference(conflict)),
    } for k, g in dissolved.items()]
    units.sort(key=lambda row: (-row["mapped_area_pct_including_overlap"], row["key"]))
    return {
        "site_id": site["site_id"], "country": site["country"],
        "layer": layer, "scale_denominator": scale,
        "area_km2_equal_area": round(denominator / 1e6, 6),
        "intersecting_features_with_positive_area": clipped_count,
        "coverage_pct": pct(union), "unmapped_pct": pct(aoi.difference(union)),
        "description_coverage_pct": pct(unary_union(descriptions)),
        "cross_unit_overlap_pct": pct(conflict),
        "overlap_excess_pct": round(max(0, 100 * (sum(area(g) for g in all_parts) - area(union)) / denominator), 6),
        "invalid_nearby_feature_ids_repaired_for_audit": sorted(repaired),
        "units": units,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, required=True)
    parser.add_argument("--candidates", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    sites = read_json(args.candidates)
    raw = args.raw_dir
    # The resource labeled SHP actually contains GeoJSON; verified in the ZIP.
    with zipfile.ZipFile(raw / "cl-resource-labeled-shp.zip") as archive:
        names = [n for n in archive.namelist() if n.lower().endswith(".geojson")]
        assert len(names) == 1
        chile = json.loads(archive.read(names[0]))
    assert chile["crs"]["properties"]["name"] == "urn:ogc:def:crs:OGC:1.3:CRS84"
    layers = [
        ("CL", "SERNAGEOMIN via MMA: Geología Base", 1000000, chile,
         ("cod_geologia", "lithostrat", "lithology")),
        ("AR", "sigam:e250K_UnidadGeologica", 250000, read_json(raw / "ar-250k-region.json"),
         ("nro_hoja", "cod_ulito", "nombre", "descrip_litologica")),
        ("AR", "sigam:e1M.NOA.Geol", 1000000, read_json(raw / "ar-1m-noa.json"),
         ("unidad", "edad", "tipoderoca")),
        ("AR", "sigam:e2.5M.UnidadesGeologicas", 2500000, read_json(raw / "ar-2_5m.json"),
         ("sigla", "nombre", "litologia")),
    ]
    measurements, source_counts = [], []
    for country, name, scale, data, fields in layers:
        if country == "AR":
            assert data["numberReturned"] == len(data["features"]) == data["numberMatched"], "Consulta truncada"
            assert data["crs"]["properties"]["name"] == "urn:ogc:def:crs:EPSG::4326"
        records = parse_features(data)
        source_counts.append({"layer": name, "features": len(data["features"]),
                              "null_or_empty_geometry_count": len(data["features"]) - len(records),
                              "server_timestamp": data.get("timeStamp")})
        for site in sites:
            if site["country"] == country:
                measurements.append(measure(site, records, name, scale, fields))
    result = {
        "status": "feasibility_audit_not_production_or_field_validation",
        "audit_date": "2026-11-14", "base_commit": "92392f1181133ee2b86fb6b13c97ec9b10de021d",
        "method": "Intersection in lon/lat; area EPSG:6933. Invalid nearby geometries repaired with make_valid only for audit; original inputs unchanged. Unit overlaps remain explicit. No lithology classification, score, confidence or field suitability derived.",
        "candidate_input_sha256": digest(args.candidates),
        "raw_input_sha256": {p.name: digest(p) for p in sorted(raw.iterdir()) if p.is_file()},
        "source_counts": source_counts, "measurements": measurements,
        "independent_argentina_check": read_json(raw / "ar-independent-checks.json"),
        "independent_chile_check": read_json(raw / "cl-independent-checks.json"),
        "individual_argentina_requests": read_json(raw / "ar-individual-requests.json"),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Audit written: {len(measurements)} site/layer intersections; {args.output}")


if __name__ == "__main__":
    main()
