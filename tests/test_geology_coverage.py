"""Cobertura geológica: geometría, ambigüedad, estados y reparación. Fixtures sintéticos."""

import pytest
from shapely.geometry import MultiPolygon, Polygon, box

from pipelines import geology_coverage as cov
from tests.geology_fixtures import LAYER, feature, square

AOI = square(0.0, -25.0, 1.0)  # ~1° x 1°


def run(features, aoi=AOI):
    return cov.analyze_site(aoi, features, LAYER)


def closure(result):
    f = result["area_fractions"]
    return f["unmapped"] + f["covered_unambiguous"] + f["covered_ambiguous"] + f["unusable_upper_bound"]


def test_complete_single_unit_is_available_only_when_everything_is_known():
    result = run([feature(1, square(-1, -26, 3))])
    assert result["availability"] == "available"
    assert result["area_fractions"]["unmapped"] <= cov.AVAILABLE_TOLERANCE
    assert result["feature_counts"]["positive_area"] == 1 and len(result["units"]) == 1


def test_99_percent_is_never_complete():
    result = run([feature(1, square(0.0, -25.0, 1.0).intersection(box(0, -25, 1, -24.01)))])
    assert 0.98 < result["area_fractions"]["covered_total"] < 0.995
    assert result["availability"] == "partial"


def test_hole_is_counted_as_unmapped_not_covered():
    ring = Polygon(square(-1, -26, 3).exterior.coords, [list(square(0.25, -24.75, 0.5).exterior.coords)])
    result = run([feature(1, ring)])
    assert result["availability"] == "partial"
    assert result["area_fractions"]["unmapped"] == pytest.approx(0.25, rel=2e-3)  # hueco central de 0,5° x 0,5°
    assert abs(closure(result) - 1) < cov.SUM_TOLERANCE


def test_multipolygon_parts_dissolve_into_one_unit():
    parts = MultiPolygon([box(-1, -26, 0.4, 2), box(0.6, -26, 2, 2)])
    result = run([feature(1, parts)])
    assert len(result["units"]) == 1
    assert result["area_fractions"]["unmapped"] == pytest.approx(0.2, rel=2e-3)


def test_polygon_crossing_the_border_widely_is_clipped():
    huge = box(-50, -60, 50, 10)  # cubre el sector y se extiende cientos de km fuera
    result = run([feature(1, huge)])
    assert result["availability"] == "available"
    assert sum(u["fraction_including_overlap"] for u in result["units"]) == pytest.approx(1.0)


def test_duplicate_features_of_same_unit_do_not_add_area():
    result = run([feature(1, box(-1, -26, 0.5, 2)), feature(2, box(-1, -26, 0.5, 2)), feature(3, box(0.25, -26, 0.5, 2))])
    assert len(result["units"]) == 1
    unit = result["units"][0]
    assert unit["fraction_including_overlap"] == pytest.approx(0.5, rel=2e-3)
    assert result["area_fractions"]["covered_ambiguous"] == 0
    assert {f["feature_id"] for f in unit["source_features"]} == {"1", "2", "3"}


def test_overlap_between_distinct_units_is_ambiguous_and_closes_to_one():
    a = feature(1, box(-1, -26, 0.6, 2), code="A", name="A")
    b = feature(2, box(0.4, -26, 2, 2), code="B", name="B")
    result = run([a, b])
    f = result["area_fractions"]
    assert f["covered_ambiguous"] == pytest.approx(0.2, rel=3e-3)
    assert f["covered_unambiguous"] == pytest.approx(0.8, rel=1e-3)
    assert result["availability"] == "partial"  # cubierta completa pero con ambigüedad
    assert abs(closure(result) - 1) < cov.SUM_TOLERANCE
    assert sum(u["fraction_unambiguous"] for u in result["units"]) == pytest.approx(f["covered_unambiguous"], abs=1e-9)
    for unit in result["units"]:
        assert unit["fraction_including_overlap"] == pytest.approx(unit["fraction_unambiguous"] + unit["fraction_in_ambiguity"])


def test_zero_coverage_when_only_the_bbox_touches():
    touching = box(1.0, -26, 3, 2)  # comparte solo el borde este
    result = run([feature(1, touching)])
    assert result["availability"] == "no_coverage"
    assert result["units"] == [] and result["area_fractions"]["unmapped"] == pytest.approx(1.0)
    assert result["feature_counts"]["no_positive_intersection"] == 1


def test_minimal_positive_coverage_is_partial_not_no_coverage():
    result = run([feature(1, box(0.999, -26, 3, 2))])
    assert result["availability"] == "partial" and len(result["units"]) == 1


def test_missing_description_is_visible_and_blocks_available():
    result = run([feature(1, square(-1, -26, 3), desc="*")])
    f = result["area_fractions"]
    assert f["covered_by_units_without_description"] == pytest.approx(1.0)
    assert result["units"][0]["description_present"] is False and result["units"][0]["description"] is None
    assert result["availability"] == "partial"


def test_known_is_not_measured_original_properties_preserved_verbatim():
    result = run([feature(7, square(-1, -26, 3), desc="roca  con  espacios")])
    props = result["units"][0]["source_features"][0]["properties"]
    assert props["desc"] == "roca  con  espacios" and result["units"][0]["description"] == "roca  con  espacios"


BOWTIE = Polygon([(0.2, -24.8), (0.8, -24.2), (0.8, -24.8), (0.2, -24.2), (0.2, -24.8)])
SPIKE = Polygon([(0.2, -24.8), (0.8, -24.8), (0.8, -24.2), (0.5, -24.2), (0.5, -24.5), (0.5, -24.2), (0.2, -24.2)])


def test_bowtie_repair_methods_disagree_so_entity_is_rejected_and_masked():
    assert not BOWTIE.is_valid
    result = run([feature(1, box(-1, -26, 2, 2), code="Ground"), feature(2, BOWTIE, code="Bad", name="Mala")])
    diag = result["geometry_diagnostics"][0]
    assert diag["status"] == "rejected" and diag["feature_id"] == "2" and diag["rejection_reasons"]
    f = result["area_fractions"]
    assert f["unusable_upper_bound"] > 0.15  # bbox de 0,6° x 0,6° recortada
    assert result["availability"] == "partial"
    ground = result["units"][0]
    # La unidad solapada no se muestra como certeza dentro de la máscara.
    assert ground["fraction_including_overlap"] == pytest.approx(1 - f["unusable_upper_bound"], abs=1e-9)
    assert abs(closure(result) - 1) < cov.SUM_TOLERANCE
    assert result["feature_counts"]["rejected"] == 1


def test_rejected_entity_alone_is_unavailable_never_no_coverage():
    result = run([feature(2, BOWTIE)])
    assert result["availability"] == "unavailable" and result["units"] == []


def test_accepted_repair_records_before_after_and_discarded_dimension():
    assert not SPIKE.is_valid
    result = run([feature(3, SPIKE)])
    diag = result["geometry_diagnostics"][0]
    assert diag["status"] == "accepted" and "Self-intersection" in diag["validity_reason"]
    assert {"original_total_area_km2", "make_valid_total_area_km2", "buffer0_total_area_km2",
            "symmetric_difference_km2", "total_area_relative_change"} <= diag.keys()
    assert diag["make_valid_discarded_dimensions"] == [{"type": "LineString", "count": 1}]
    assert result["feature_counts"]["repaired_accepted"] == 1 and len(result["units"]) == 1


def test_invalid_geometry_without_positive_intersection_is_valid_outcome():
    far = Polygon([(10, 10), (12, 12), (12, 10), (10, 12), (10, 10)])
    huge_bbox_cross = Polygon([(0.9, -24.5), (3, -24.4), (3, -24.6), (0.9, -24.3), (0.9, -24.5)])
    result = run([feature(1, far), feature(2, huge_bbox_cross)])
    assert result["availability"] in {"no_coverage", "partial", "unavailable"}
    assert all(d["status"] != "rejected" or d["feature_id"] == "2" for d in result["geometry_diagnostics"])


def test_state_is_derived_from_fractions_only():
    base = {"unmapped": 0, "covered_unambiguous": 1, "covered_ambiguous": 0, "unusable_upper_bound": 0,
            "covered_total": 1, "covered_by_units_without_description": 0}
    assert cov.availability(base) == "available"
    assert cov.availability({**base, "unmapped": 1e-7, "covered_unambiguous": 1 - 1e-7, "covered_total": 1 - 1e-7}) == "partial"
    assert cov.availability({**base, "unmapped": 1e-9, "covered_unambiguous": 1 - 1e-9, "covered_total": 1 - 1e-9}) == "available"
    assert cov.availability({**base, "unusable_upper_bound": 1e-12}) == "partial"
    assert cov.availability({**base, "unmapped": 1, "covered_unambiguous": 0, "covered_total": 0}) == "no_coverage"


def test_features_are_never_inherited_between_sites():
    only_here = [feature(1, box(0, -25, 1, -24))]
    elsewhere = square(5, -25, 1)
    assert run(only_here)["availability"] == "available"
    assert cov.analyze_site(elsewhere, only_here, LAYER)["availability"] == "no_coverage"


def test_parse_features_validates_ranges_ids_and_types():
    good = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "id": 1, "properties": {}, "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]}},
        {"type": "Feature", "id": 2, "properties": {}, "geometry": None}]}
    features, empty = cov.parse_features(good, "objectid")
    assert len(features) == 1 and empty == 1
    bad_range = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "id": 1, "properties": {}, "geometry": {"type": "Polygon", "coordinates": [[[200, 0], [201, 0], [201, 1], [200, 0]]]}}]}
    with pytest.raises(cov.GeologyError):
        cov.parse_features(bad_range, "objectid")
    duplicate = {"type": "FeatureCollection", "features": good["features"][:1] * 2}
    with pytest.raises(cov.GeologyError):
        cov.parse_features(duplicate, "objectid")
    line = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "id": 1, "properties": {}, "geometry": {"type": "LineString", "coordinates": [[0, 0], [1, 1]]}}]}
    with pytest.raises(cov.GeologyError):
        cov.parse_features(line, "objectid")


# --- Regresiones de la revisión A de Codex -----------------------------------------------------------------

def test_material_total_area_change_is_rejected_even_when_both_repair_methods_agree():
    aoi = box(-70, -25, -69, -24)
    piece = box(-69.9, -24.9, -69.1, -24.1)
    duplicated = MultiPolygon([piece, piece])  # inválido: dos copias; ambos métodos dan un cuadrado
    result = cov.analyze_site(aoi, [feature("dup", duplicated), feature("ground", box(-71, -26, 0, 0), code="G")], LAYER)
    diag = result["geometry_diagnostics"][0]
    assert diag["status"] == "rejected"
    assert diag["symmetric_difference_km2"] == 0.0  # el contraste simétrico entre métodos se conserva
    assert diag["total_area_relative_change"] == pytest.approx(0.5)
    assert any("total" in reason for reason in diag["rejection_reasons"])
    assert result["area_fractions"]["unusable_upper_bound"] > 0  # máscara conservadora
    assert result["availability"] == "partial"


def test_original_area_not_positive_is_rejected_with_mask():
    collapsed = Polygon([(0.1, -24.5), (0.5, -24.5), (0.9, -24.5), (0.1, -24.5)])  # sin área
    assert not collapsed.is_valid
    result = run([feature(1, box(-1, -26, 2, 2), code="G"), feature(2, collapsed, code="Z")])
    diag = result["geometry_diagnostics"][0]
    assert diag["status"] == "rejected" and any("no es positiva" in r for r in diag["rejection_reasons"])


def test_accepted_repairs_satisfy_all_three_independent_limits():
    result = run([feature(3, SPIKE)])
    diag = result["geometry_diagnostics"][0]
    assert diag["status"] == "accepted"
    assert diag["total_area_relative_change"] <= cov.REPAIR_TOTAL_AREA_LIMIT
    assert diag["symmetric_difference_relative_to_entity"] <= cov.REPAIR_ENTITY_RELATIVE_LIMIT
    assert diag["symmetric_difference_fraction_of_aoi"] <= cov.REPAIR_AOI_FRACTION_LIMIT


def _collection(geometry):
    return {"type": "FeatureCollection", "features": [{"type": "Feature", "id": "f", "properties": {}, "geometry": geometry}]}


RING = [[-70, -25], [-69, -25], [-69, -24], [-70, -24], [-70, -25]]


@pytest.mark.parametrize("geometry", [
    {"type": "Polygon", "coordinates": [[[-70, -25], [-69, -25], [float("nan"), -24], [-70, -24], [-70, -25]]]},  # NaN interno
    {"type": "Polygon", "coordinates": [[[-70, -25], [-69, -25], [-69, float("inf")], [-70, -24], [-70, -25]]]},
    {"type": "Polygon", "coordinates": [[[-70, -25], [-69, -25], [-69, -24, 100], [-70, -24], [-70, -25]]]},  # no 2D
    {"type": "Polygon", "coordinates": [[[-70, -25], [-69, -25], [-69], [-70, -24], [-70, -25]]]},  # hoja malformada
    {"type": "Polygon", "coordinates": [[[-70, -25], [-69, -25], ["x", -24], [-70, -24], [-70, -25]]]},
    {"type": "Polygon", "coordinates": [[[-70, -25], [-69, -25], [True, -24], [-70, -24], [-70, -25]]]},
    {"type": "Polygon", "coordinates": [[[-70, -25], [-69, -25], [-70, -25]]]},  # anillo corto
    {"type": "Polygon", "coordinates": [RING, "no-es-un-anillo"]},
    {"type": "Polygon", "coordinates": "texto"},
    {"type": "MultiPolygon", "coordinates": [[RING], [[[-70, -25], [-69, "?"], [-69, -24], [-70, -25]]]]},
    {"type": "MultiPolygon", "coordinates": [RING]},  # falta un nivel
    {"type": "Polygon", "coordinates": [[[-70, 95], [-69, -25], [-69, -24], [-70, 95]]]},  # fuera de rango
    {"type": "GeometryCollection", "geometries": []},
    "no-es-un-dict",
])
def test_parse_features_validates_structure_and_every_vertex_before_shapely(geometry):
    with pytest.raises(cov.GeologyError):
        cov.parse_features(_collection(geometry), "objectid")


def test_parse_features_accepts_valid_multipolygon_and_explicit_empty():
    good = {"type": "MultiPolygon", "coordinates": [[RING], [[[-60, -25], [-59, -25], [-59, -24], [-60, -25]]]]}
    features, empty = cov.parse_features(_collection(good), "objectid")
    assert len(features) == 1 and empty == 0
    for empty_geometry in ({"type": "Polygon", "coordinates": []}, {"type": "MultiPolygon", "coordinates": []}):
        features, empty = cov.parse_features(_collection(empty_geometry), "objectid")
        assert features == [] and empty == 1
