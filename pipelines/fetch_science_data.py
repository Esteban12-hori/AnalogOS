"""Downloads the open inputs of the preliminary science snapshot.

Requires no credentials. Reuses files that already have the expected size.
"""

from __future__ import annotations

import argparse
import json
import ssl
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import certifi

from pipelines.contracts import ROOT

DEFAULT_CONFIG = ROOT / "config" / "science_snapshot_v1.json"
USER_AGENT = "AnalogOS-Chile/0.1 NASA-Space-Apps-2026"
TLS_CONTEXT = ssl.create_default_context(cafile=certifi.where())


def _download(url: str, destination: Path, expected_bytes: int | None = None) -> None:
    if destination.exists() and (expected_bytes is None or destination.stat().st_size == expected_bytes):
        print(f"reused {destination}")
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=120, context=TLS_CONTEXT) as response, destination.open("wb") as target:
        while chunk := response.read(1024 * 1024):
            target.write(chunk)
    if expected_bytes is not None and destination.stat().st_size != expected_bytes:
        raise RuntimeError(f"Unexpected size for {destination}")
    print(f"downloaded {destination}")


def _fetch_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=60, context=TLS_CONTEXT) as response:
        return json.load(response)


def fetch(config_path: Path) -> None:
    config = json.loads(config_path.read_text("utf-8"))
    mola = config["mola"]
    _download(mola["url"], ROOT / mola["file"], mola["expected_bytes"])

    for site in config["sites"]:
        tile = site["srtm_tile"]
        url = f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{tile[:3]}/{tile}.hgt.gz"
        _download(url, ROOT / "data" / "raw" / "srtm" / f"{tile}.hgt.gz")

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
    target = ROOT / power["file"]
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(points, ensure_ascii=False, indent=2, sort_keys=True) + "\n", "utf-8")
    print(f"wrote {target}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    args = parser.parse_args()
    fetch(args.config)


if __name__ == "__main__":
    main()
