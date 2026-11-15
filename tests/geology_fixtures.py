"""SYNTHETIC test data for geology. It exists only inside the tests: it is never real evidence."""

import io
import json
import zipfile

from shapely.geometry import Polygon, mapping

from pipelines import fetch_geology_data as fetch
from pipelines.geology_coverage import Feature, LayerConfig

LAYER = LayerConfig("fixture-source", ("code", "name", "desc"), "code", "name", "desc")
TIME = "2026-01-02T03:04:05Z"


def square(west=0.0, south=-25.0, size=1.0):
    return Polygon([(west, south), (west + size, south), (west + size, south + size), (west, south + size), (west, south)])


def feature(feature_id, geometry, code="A", name="Unidad A", desc="roca de prueba"):
    return Feature(str(feature_id), {"code": code, "name": name, "desc": desc}, geometry)


def geojson_feature(feature_id, geometry, props):
    return {"type": "Feature", "id": feature_id, "properties": props, "geometry": mapping(geometry) if geometry else None}


class FakeResponse:
    def __init__(self, status=200, body=b"", headers=None):
        self.status_code, self.body, self.headers = status, body, headers or {}
        self.closed = False

    def iter_content(self, size):
        for start in range(0, len(self.body), size):
            yield self.body[start:start + size]

    def close(self):
        self.closed = True


def zip_bytes(members, deflate=True):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED if deflate else zipfile.ZIP_STORED) as archive:
        for name, data in members.items():
            archive.writestr(name, data)
    return buffer.getvalue()


def chile_collection(features):
    return {"type": "FeatureCollection", "crs": {"type": "name", "properties": {"name": fetch.CL_CRS}},
            "features": features}


def chile_props(objectid, code="Qa"):
    return {"objectid": objectid, "cod_geologia": code, "lithostrat": "Unidad FIXTURE", "lithology": "grava FIXTURE"}


def wfs_collection(features, crs="default"):
    data = {"type": "FeatureCollection", "features": features, "totalFeatures": len(features),
            "numberMatched": len(features), "numberReturned": len(features), "timeStamp": "2026-01-02T03:04:05.000Z"}
    if crs == "default":
        crs = {"type": "name", "properties": {"name": fetch.AR_CRS}} if features else None
    data["crs"] = crs
    return data


def wfs_props(code="X1", hoja="0001"):
    return {"cod_ulito": code, "nro_hoja": hoja, "nom_hoja": "Hoja FIXTURE", "nombre": "Unidad FIXTURE",
            "descrip_litologica": "ignimbrita FIXTURE"}


def ckan_body(resources, license_id="cc-zero"):
    return json.dumps({"success": True, "result": {
        "name": "geologia-base", "license_id": license_id, "license_title": "Creative Commons CCZero", "metadata_modified": "2026-04-21T16:22:27.564114",
        "resources": resources}}).encode()


def resource(rid, fmt, name):
    return {"id": rid, "format": fmt, "url": f"https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dl/{name}.zip"}


class FakeServer:
    """Serves responses by exact URL; records the requests. Any other URL fails like a downed network."""

    def __init__(self, routes):
        self.routes, self.calls, self.kwargs = dict(routes), [], []

    def __call__(self, url, **kwargs):
        self.calls.append(url)
        self.kwargs.append(kwargs)
        answer = self.routes.get(url)
        if answer is None:
            raise OSError("sin ruta de prueba")
        if isinstance(answer, FakeResponse):
            return answer
        return FakeResponse(200, answer)


def http_for(server, clock=lambda: TIME):
    return fetch.Http(get=server, sleep=lambda _: None, clock=clock)


def synthetic_world(sites, license_id="cc-zero", shapefile_first=False):
    """Fake server with one Chilean and three SYNTHETIC Argentine responses for the geometries of ``sites``."""
    routes = {}
    resources = [resource("r-shp", "SHP", "a"), resource("r-geo", "GeoJSON", "b")]
    a_url, b_url = resources[0]["url"], resources[1]["url"]
    if shapefile_first:
        resources = resources[::-1]
    routes[fetch.CKAN_URL] = ckan_body(resources, license_id)
    big = Polygon([(-70.5, -26.0), (-69.0, -26.0), (-69.0, -23.5), (-70.5, -23.5), (-70.5, -26.0)])
    chile = chile_collection([geojson_feature(None, big, chile_props(1))])
    routes[a_url] = zip_bytes({"Fixture.geojson": json.dumps(chile).encode()})
    routes[b_url] = zip_bytes({"Fixture.shp": b"x", "Fixture.dbf": b"y"})
    for site in sites:
        if site["country"] != "AR":
            continue
        west, south, east, north = fetch.aoi_bounds(site["geometry"])
        middle = (west + east) / 2
        if site["site_id"].endswith("s2620-w06750"):
            half = Polygon([(west - 1, south - 1), (middle, south - 1), (middle, north + 1), (west - 1, north + 1)])
            body = wfs_collection([geojson_feature("fixture.1", half, wfs_props())])
        elif site["site_id"].endswith("s2640-w06730"):
            body = wfs_collection([])
        else:
            full = Polygon([(west - 1, south - 1), (east + 1, south - 1), (east + 1, north + 1), (west - 1, north + 1)])
            body = wfs_collection([geojson_feature("fixture.2", full, wfs_props("X2"))])
        routes[fetch.wfs_request(fetch.aoi_bounds(site["geometry"]))["url"]] = json.dumps(body).encode()
    return FakeServer(routes), resources


def ensure_raw(raw, sites, **kwargs):
    """For acquisition tests only: prepares and installs the cache (the real build publishes together with the package)."""
    prepared = fetch.prepare_raw(raw, sites, **kwargs)
    if prepared.staging is not None:
        fetch.publish([(prepared.staging, raw)])
    return prepared.acquisition, prepared.reused
