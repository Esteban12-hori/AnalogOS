"""Descarga las fuentes autenticadas del snapshot científico v2.

Las credenciales se leen desde ``.env`` y nunca se escriben en artefactos.
NASA Earthdata aporta NASADEM y el inventario HLS; Copernicus Sentinel Hub
calcula estadísticas Sentinel-2 L2A sin descargar escenas completas.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlencode, urlsplit

import earthaccess
import requests
from dotenv import load_dotenv

from pipelines.contracts import ROOT
from pipelines.fetch_science_data import _download, _fetch_json

DEFAULT_CONFIG = ROOT / "config" / "science_snapshot_v2.json"

SENTINEL2_EVALSCRIPT = r"""//VERSION=3
function setup() {
  return {
    input: [{bands: ["B02", "B04", "B08", "B11", "SCL", "dataMask"]}],
    output: [
      {
        id: "surface",
        bands: ["nonvegetated", "vegetation", "water", "ndvi", "bsi"],
        sampleType: "FLOAT32"
      },
      {id: "dataMask", bands: 1}
    ]
  };
}
function evaluatePixel(s) {
  let valid = s.dataMask === 1 && [2, 4, 5, 6].includes(s.SCL);
  let ndviDenominator = s.B08 + s.B04;
  let bsiDenominator = s.B11 + s.B04 + s.B08 + s.B02;
  let ndvi = ndviDenominator === 0 ? 0 : (s.B08 - s.B04) / ndviDenominator;
  let bsi = bsiDenominator === 0 ? 0 :
    ((s.B11 + s.B04) - (s.B08 + s.B02)) / bsiDenominator;
  return {
    surface: [
      s.SCL === 5 ? 1 : 0,
      s.SCL === 4 ? 1 : 0,
      s.SCL === 6 ? 1 : 0,
      ndvi,
      bsi
    ],
    dataMask: [valid ? 1 : 0]
  };
}
"""


def _write_json(path: Path, content: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(content, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def _load_credentials() -> None:
    load_dotenv(ROOT / ".env")
    required = (
        "EARTHDATA_USERNAME",
        "EARTHDATA_PASSWORD",
        "COPERNICUS_CLIENT_ID",
        "COPERNICUS_CLIENT_SECRET",
    )
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError(f"Faltan credenciales en .env: {', '.join(missing)}")


def _bbox(site: dict) -> tuple[float, float, float, float]:
    half = site["half_size_degree"]
    return (
        site["longitude"] - half,
        site["latitude"] - half,
        site["longitude"] + half,
        site["latitude"] + half,
    )


def _granule_record(granule: dict) -> dict:
    metadata = granule["meta"]
    umm = granule["umm"]
    temporal = umm.get("TemporalExtent", {}).get("RangeDateTime", {})
    links = granule.data_links(access="external")
    return {
        "concept_id": metadata["concept-id"],
        "collection_concept_id": metadata["collection-concept-id"],
        "provider_id": metadata["provider-id"],
        "granule_ur": umm["GranuleUR"],
        "beginning_datetime": temporal.get("BeginningDateTime"),
        "ending_datetime": temporal.get("EndingDateTime"),
        "data_links": links,
    }


def _fetch_earthdata(config: dict) -> None:
    auth = earthaccess.login(strategy="environment")
    if not getattr(auth, "authenticated", True):
        raise RuntimeError("Earthdata Login rechazó las credenciales")

    nasadem = config["nasadem"]
    hls = config["hls_inventory"]
    nasadem_granules: dict[str, object] = {}
    inventory_sites: dict[str, dict] = {}

    for site in config["sites"]:
        area = _bbox(site)
        dem_results = earthaccess.search_data(
            short_name=nasadem["short_name"],
            version=nasadem["version"],
            bounding_box=area,
            count=-1,
        )
        dem_records = []
        for granule in dem_results:
            record = _granule_record(granule)
            zip_links = [link for link in record["data_links"] if urlsplit(link).path.endswith(".zip")]
            if not zip_links:
                continue
            filename = Path(urlsplit(zip_links[0]).path).name
            nasadem_granules[filename] = granule
            dem_records.append({**record, "filename": filename})

        hls_results = earthaccess.search_data(
            short_name=hls["short_name"],
            version=hls["version"],
            bounding_box=area,
            temporal=(hls["time_start"], hls["time_end"]),
            count=-1,
        )
        hls_records = [_granule_record(granule) for granule in hls_results]
        inventory_sites[site["site_id"]] = {
            "bbox": area,
            "nasadem": dem_records,
            "hls": {
                "short_name": hls["short_name"],
                "version": hls["version"],
                "granule_count": len(hls_records),
                "granules": hls_records,
            },
        }
        print(
            f"Earthdata {site['site_id']}: "
            f"{len(dem_records)} NASADEM, {len(hls_records)} HLS"
        )

    target_dir = ROOT / nasadem["directory"]
    target_dir.mkdir(parents=True, exist_ok=True)
    ordered = [nasadem_granules[name] for name in sorted(nasadem_granules)]
    downloaded = earthaccess.download(ordered, local_path=target_dir)
    if len(downloaded) != len(ordered):
        raise RuntimeError("No se descargaron todos los granules NASADEM esperados")

    inventory = {
        "generated_at": config["created_at"],
        "authentication": "Earthdata Login; credenciales omitidas",
        "sites": inventory_sites,
    }
    _write_json(ROOT / nasadem["inventory_file"], inventory)


def _copernicus_token(config: dict) -> str:
    response = requests.post(
        config["copernicus"]["token_url"],
        data={
            "grant_type": "client_credentials",
            "client_id": os.environ["COPERNICUS_CLIENT_ID"],
            "client_secret": os.environ["COPERNICUS_CLIENT_SECRET"],
        },
        timeout=30,
    )
    response.raise_for_status()
    token = response.json().get("access_token")
    if not token:
        raise RuntimeError("Copernicus no devolvió un access token")
    return token


def _statistics_request(config: dict, site: dict) -> dict:
    source = config["copernicus"]
    return {
        "input": {
            "bounds": {
                "bbox": list(_bbox(site)),
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            },
            "data": [{
                "type": source["collection"],
                "dataFilter": {
                    "mosaickingOrder": "leastCC",
                    "maxCloudCoverage": source["max_cloud_coverage"],
                },
            }],
        },
        "aggregation": {
            "timeRange": {"from": source["time_start"], "to": source["time_end"]},
            "aggregationInterval": {"of": source["aggregation_interval"]},
            "evalscript": SENTINEL2_EVALSCRIPT,
            "resx": source["resolution_degree"],
            "resy": source["resolution_degree"],
        },
        "calculations": {
            "surface": {
                "statistics": {
                    "default": {"percentiles": {"k": [10, 50, 90]}},
                },
            },
        },
    }


def _fetch_copernicus(config: dict) -> None:
    token = _copernicus_token(config)
    source = config["copernicus"]
    sites = {}
    for site in config["sites"]:
        request_payload = _statistics_request(config, site)
        response = requests.post(
            source["statistics_url"],
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            json=request_payload,
            timeout=240,
        )
        response.raise_for_status()
        result = response.json()
        if result.get("status") != "OK" or not result.get("data"):
            raise RuntimeError(f"Respuesta Sentinel-2 incompleta para {site['site_id']}")
        sites[site["site_id"]] = {"request": request_payload, "response": result}
        print(f"Copernicus {site['site_id']}: {len(result['data'])} intervalos")

    artifact = {
        "generated_at": config["created_at"],
        "authentication": "OAuth2 client credentials; token omitido",
        "service": source["statistics_url"],
        "collection": source["collection"],
        "evalscript_version": source["evalscript_version"],
        "sites": sites,
    }
    _write_json(ROOT / source["file"], artifact)


def _fetch_open_sources(config: dict) -> None:
    mola = config["mola"]
    _download(mola["url"], ROOT / mola["file"], mola["expected_bytes"])

    power = config["power"]
    points = {}
    for site in config["sites"]:
        query = urlencode({
            "parameters": ",".join(power["parameters"]),
            "community": power["community"],
            "longitude": site["longitude"],
            "latitude": site["latitude"],
            "format": "JSON",
        })
        url = f"{power['endpoint']}?{query}"
        points[site["site_id"]] = {"request_url": url, "response": _fetch_json(url)}
        print(f"NASA POWER {site['site_id']}")
    _write_json(ROOT / power["file"], points)


def fetch(config_path: Path) -> None:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    _load_credentials()
    _fetch_open_sources(config)
    _fetch_earthdata(config)
    _fetch_copernicus(config)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    args = parser.parse_args()
    fetch(args.config)
    print("Fuentes v2 descargadas; ninguna credencial fue persistida en los artefactos.")


if __name__ == "__main__":
    main()
