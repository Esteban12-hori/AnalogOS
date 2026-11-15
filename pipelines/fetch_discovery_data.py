"""Bounded, resumable download of the sources for search v3.

Two stages, so as not to request costly sources before preselecting:

- ``--stage tiles``: NASADEM tiles that are missing for the grid windows.
- ``--stage sources``: monthly Sentinel-2, POWER and HLS inventory only for the
  windows preselected in ``artifacts/science-v3/search-results.json``.

Each result is saved with its actual acquisition time and a key derived from
the complete request (bbox, period, product and transformation), so that a
configuration change never reuses data from another request. Failures are
recorded and are not turned into data. Credentials are read from the
program and are only sent to the official Earthdata and Copernicus hosts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from pipelines.build_precision_snapshot import _sha256
from pipelines.contracts import ROOT
from pipelines.discover_candidates import DEFAULT_CONFIG, DEFAULT_OUT, grid_windows, load_inputs, required_tiles, window_bbox
from pipelines.fetch_visual_context import CopernicusClient, VisualContextError


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def request_key(request: object) -> str:
    """Fingerprint of the complete request: ties the cache to bbox, period, product and transformation."""
    return hashlib.sha256(json.dumps(request, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def _read(path: Path, default: dict) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def _write(path: Path, content: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(content, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def cached(store: dict, site_id: str, key: str) -> bool:
    """Only a successful entry from exactly the same request is reused."""
    entry = store.get(site_id)
    return bool(entry) and entry.get("request_key") == key and entry.get("status") == "ok"


def _earthdata_login():
    import earthaccess
    from dotenv import load_dotenv

    if not all(os.environ.get(name) for name in ("EARTHDATA_USERNAME", "EARTHDATA_PASSWORD")):
        load_dotenv(ROOT / ".env")
    auth = earthaccess.login(strategy="environment")
    if not getattr(auth, "authenticated", True):
        raise RuntimeError("Earthdata Login rejected the credentials.")
    return earthaccess


def _tile_bbox(tile: str) -> tuple[float, float, float, float]:
    """Small box at the center of the ``s25w070`` tile, so that CMR returns only that one."""
    south = -int(tile[1:3]) if tile[0] == "s" else int(tile[1:3])
    west = -int(tile[4:7]) if tile[3] == "w" else int(tile[4:7])
    return (west + 0.4, south + 0.4, west + 0.6, south + 0.6)


def fetch_tiles(config: dict, science_config: dict, log: dict) -> list[str]:
    """Downloads the missing tiles, within the authorized limit. Returns the pending ones."""
    nasadem = science_config["nasadem"]
    directory = ROOT / nasadem["directory"]
    needed = required_tiles(grid_windows(config))
    missing = [tile for tile in needed if not (directory / f"NASADEM_HGT_{tile}.zip").exists()]
    limit = config["limits"]["max_new_nasadem_tiles"]
    if len(missing) > limit:
        raise RuntimeError(f"{len(missing)} new tiles would be needed; the authorized limit is {limit}.")
    print(f"tiles needed: {len(needed)}; cached: {len(needed) - len(missing)}; to download: {missing}")
    if not missing:
        return []
    earthaccess = _earthdata_login()
    tiles_log = log.setdefault("tiles", {})
    pending = []
    for tile in missing:
        filename = f"NASADEM_HGT_{tile}.zip"
        outcome = "no attempts"
        for attempt in range(config["limits"]["attempts_per_request"]):
            try:
                granules = earthaccess.search_data(
                    short_name=nasadem["short_name"], version=nasadem["version"], bounding_box=_tile_bbox(tile), count=-1,
                )
                matching = [g for g in granules if any(link.endswith(filename) for link in g.data_links(access="external"))]
                if not matching:
                    outcome = "CMR did not return that tile"
                    break
                earthaccess.download(matching[:1], local_path=str(directory))
                with zipfile.ZipFile(directory / filename) as bundle:
                    if not {f"{tile}.hgt", f"{tile}.swb"} <= set(bundle.namelist()):
                        raise zipfile.BadZipFile("missing .hgt or .swb")
                link = next(link for link in matching[0].data_links(access="external") if link.endswith(filename))
                tiles_log[filename] = {
                    "acquired_at": _now(), "sha256": _sha256(directory / filename),
                    "bytes": (directory / filename).stat().st_size, "data_link": link,
                    "concept_id": matching[0]["meta"]["concept-id"],
                }
                outcome = "ok"
                break
            except (OSError, zipfile.BadZipFile) as error:
                (directory / filename).unlink(missing_ok=True)  # never leave a partial tile in the cache
                outcome = f"download failure ({type(error).__name__}), attempt {attempt + 1}"
        print(f"  {filename}: {outcome}")
        if outcome != "ok":
            pending.append(tile)
            log.setdefault("failures", []).append({"at": _now(), "stage": "tiles", "item": filename, "outcome": outcome})
    return pending


def source_requests(science_config: dict, window: dict) -> dict:
    """Exact requests for a window according to the current configuration (bbox, period, product, transformation).

    The fetch uses them as a cache key and the build derives them again to verify
    that each raw data item belongs to this experiment and not to a previous configuration.
    """
    from pipelines.fetch_precision_data import _statistics_request

    power, hls = science_config["power"], science_config["hls_inventory"]
    return {
        "sentinel2": _statistics_request(science_config, {"site_id": window["window_id"], **window}),
        "power": f"{power['endpoint']}?" + urlencode({
            "parameters": ",".join(power["parameters"]), "community": power["community"],
            "longitude": window["longitude"], "latitude": window["latitude"], "format": "JSON",
        }),
        "hls": {"short_name": hls["short_name"], "version": hls["version"], "bounding_box": window_bbox(window),
                "temporal": [hls["time_start"], hls["time_end"]]},
    }


def fetch_sources(config: dict, science_config: dict, shortlist: list[dict], log: dict, client=None) -> list[str]:
    """Sentinel-2, POWER and HLS inventory of the preselection. Returns the sites with any failure."""
    from pipelines.fetch_science_data import _fetch_json

    if len(shortlist) > config["limits"]["max_multisource_windows"]:
        raise RuntimeError("The shortlist exceeds the authorized maximum of multi-source windows.")
    paths = {name: ROOT / config["sources"][name] for name in ("sentinel2_file", "power_file", "inventory_file")}
    copernicus = science_config["copernicus"]
    sentinel = _read(paths["sentinel2_file"], {"service": copernicus["statistics_url"], "collection": copernicus["collection"],
                                               "evalscript_version": copernicus["evalscript_version"], "sites": {}})
    power = _read(paths["power_file"], {"sites": {}})
    inventory = _read(paths["inventory_file"], {"sites": {}})
    client = client or CopernicusClient()
    earthaccess = None
    failed: set[str] = set()

    def record(store: dict, path: Path, site_id: str, key: str, request: object, fetch) -> None:
        if cached(store["sites"], site_id, key):
            print(f"  {site_id}: reused ({path.name})")
            return
        entry = {"request_key": key, "request": request, "acquired_at": _now()}
        try:
            entry.update(status="ok", response=fetch())
        except (VisualContextError, OSError, ValueError) as error:
            # The failure is recorded as is; it is never filled in with fictitious data.
            entry.update(status="failed", error=f"{type(error).__name__}: {error}"[:300])
            failed.add(site_id)
            log.setdefault("failures", []).append({"at": entry["acquired_at"], "stage": path.name, "item": site_id, "outcome": entry["error"]})
        store["sites"][site_id] = entry
        _write(path, store)  # saved after each site: the run is resumable
        print(f"  {site_id}: {entry['status']} ({path.name})")

    for window in shortlist:
        site_id = window["window_id"]
        requests_ = source_requests(science_config, window)
        statistics, url, query = requests_["sentinel2"], requests_["power"], requests_["hls"]

        def sentinel_fetch(payload=statistics):
            result = client.post_json(copernicus["statistics_url"], payload)
            if result.get("status") != "OK" or not isinstance(result.get("data"), list):
                raise ValueError("respuesta Statistical API incompleta")
            return result

        record(sentinel, paths["sentinel2_file"], site_id, request_key(statistics), statistics, sentinel_fetch)
        record(power, paths["power_file"], site_id, request_key(url), url, lambda url=url: _fetch_json(url))

        def hls_fetch(query=query):
            nonlocal earthaccess
            earthaccess = earthaccess or _earthdata_login()
            granules = earthaccess.search_data(short_name=query["short_name"], version=query["version"],
                                               bounding_box=tuple(query["bounding_box"]), temporal=tuple(query["temporal"]), count=-1)
            return {"granule_count": len(granules)}

        record(inventory, paths["inventory_file"], site_id, request_key(query), query, hls_fetch)
    return sorted(failed)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--stage", choices=("tiles", "sources"), required=True)
    parser.add_argument("--search-results", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args(argv)
    config, _catalog, science_config = load_inputs(args.config)
    log_path = ROOT / config["sources"]["acquisition_log"]
    log = _read(log_path, {})
    try:
        if args.stage == "tiles":
            problems = fetch_tiles(config, science_config, log)
        else:
            if not args.search_results.exists():
                print("ERROR: search-results.json is missing; run python -m pipelines.discover_candidates first", file=sys.stderr)
                return 1
            selected = set(json.loads(args.search_results.read_text(encoding="utf-8"))["shortlist"])
            shortlist = [window for window in grid_windows(config) if window["window_id"] in selected]
            problems = fetch_sources(config, science_config, shortlist, log)
    finally:
        _write(log_path, log)
    if problems:
        print(f"PARTIAL BLOCK: still pending {problems}. Run again; what was already obtained is reused.", file=sys.stderr)
        return 1
    print(f"stage {args.stage} complete; log in {log_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
