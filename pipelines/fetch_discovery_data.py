"""Descarga acotada y reanudable de las fuentes de la búsqueda v3.

Dos etapas, para no pedir fuentes costosas antes de preseleccionar:

- ``--stage tiles``: teselas NASADEM que faltan para las ventanas de la rejilla.
- ``--stage sources``: Sentinel-2 mensual, POWER e inventario HLS solo para las
  ventanas preseleccionadas en ``artifacts/science-v3/search-results.json``.

Cada resultado se guarda con su hora real de adquisición y una clave derivada de
la petición completa (bbox, periodo, producto y transformación), de modo que un
cambio de configuración nunca reutiliza datos de otra petición. Los fallos se
registran y no se convierten en datos. Las credenciales se leen desde el
programa y solo viajan a los hosts oficiales de Earthdata y Copernicus.
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
    """Huella de la petición completa: liga la caché a bbox, periodo, producto y transformación."""
    return hashlib.sha256(json.dumps(request, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def _read(path: Path, default: dict) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def _write(path: Path, content: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(content, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def cached(store: dict, site_id: str, key: str) -> bool:
    """Solo se reutiliza una entrada correcta de exactamente la misma petición."""
    entry = store.get(site_id)
    return bool(entry) and entry.get("request_key") == key and entry.get("status") == "ok"


def _earthdata_login():
    import earthaccess
    from dotenv import load_dotenv

    if not all(os.environ.get(name) for name in ("EARTHDATA_USERNAME", "EARTHDATA_PASSWORD")):
        load_dotenv(ROOT / ".env")
    auth = earthaccess.login(strategy="environment")
    if not getattr(auth, "authenticated", True):
        raise RuntimeError("Earthdata Login rechazó las credenciales.")
    return earthaccess


def _tile_bbox(tile: str) -> tuple[float, float, float, float]:
    """Caja pequeña en el centro de la tesela ``s25w070``, para que CMR devuelva solo esa."""
    south = -int(tile[1:3]) if tile[0] == "s" else int(tile[1:3])
    west = -int(tile[4:7]) if tile[3] == "w" else int(tile[4:7])
    return (west + 0.4, south + 0.4, west + 0.6, south + 0.6)


def fetch_tiles(config: dict, science_config: dict, log: dict) -> list[str]:
    """Descarga las teselas que faltan, dentro del límite autorizado. Devuelve las pendientes."""
    nasadem = science_config["nasadem"]
    directory = ROOT / nasadem["directory"]
    needed = required_tiles(grid_windows(config))
    missing = [tile for tile in needed if not (directory / f"NASADEM_HGT_{tile}.zip").exists()]
    limit = config["limits"]["max_new_nasadem_tiles"]
    if len(missing) > limit:
        raise RuntimeError(f"Harían falta {len(missing)} teselas nuevas; el límite autorizado es {limit}.")
    print(f"teselas necesarias: {len(needed)}; en caché: {len(needed) - len(missing)}; por descargar: {missing}")
    if not missing:
        return []
    earthaccess = _earthdata_login()
    tiles_log = log.setdefault("tiles", {})
    pending = []
    for tile in missing:
        filename = f"NASADEM_HGT_{tile}.zip"
        outcome = "sin intentos"
        for attempt in range(config["limits"]["attempts_per_request"]):
            try:
                granules = earthaccess.search_data(
                    short_name=nasadem["short_name"], version=nasadem["version"], bounding_box=_tile_bbox(tile), count=-1,
                )
                matching = [g for g in granules if any(link.endswith(filename) for link in g.data_links(access="external"))]
                if not matching:
                    outcome = "CMR no devolvió esa tesela"
                    break
                earthaccess.download(matching[:1], local_path=str(directory))
                with zipfile.ZipFile(directory / filename) as bundle:
                    if not {f"{tile}.hgt", f"{tile}.swb"} <= set(bundle.namelist()):
                        raise zipfile.BadZipFile("faltan .hgt o .swb")
                link = next(link for link in matching[0].data_links(access="external") if link.endswith(filename))
                tiles_log[filename] = {
                    "acquired_at": _now(), "sha256": _sha256(directory / filename),
                    "bytes": (directory / filename).stat().st_size, "data_link": link,
                    "concept_id": matching[0]["meta"]["concept-id"],
                }
                outcome = "ok"
                break
            except (OSError, zipfile.BadZipFile) as error:
                (directory / filename).unlink(missing_ok=True)  # nunca dejar una tesela parcial en la caché
                outcome = f"fallo de descarga ({type(error).__name__}), intento {attempt + 1}"
        print(f"  {filename}: {outcome}")
        if outcome != "ok":
            pending.append(tile)
            log.setdefault("failures", []).append({"at": _now(), "stage": "tiles", "item": filename, "outcome": outcome})
    return pending


def source_requests(science_config: dict, window: dict) -> dict:
    """Peticiones exactas de una ventana según la configuración vigente (bbox, periodo, producto, transformación).

    El fetch las usa como clave de caché y el build las vuelve a derivar para comprobar
    que cada dato crudo pertenece a este experimento y no a una configuración anterior.
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
    """Sentinel-2, POWER e inventario HLS de la preselección. Devuelve los sitios con algún fallo."""
    from pipelines.fetch_science_data import _fetch_json

    if len(shortlist) > config["limits"]["max_multisource_windows"]:
        raise RuntimeError("La preselección supera el máximo de ventanas multifuente autorizado.")
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
            print(f"  {site_id}: reutilizado ({path.name})")
            return
        entry = {"request_key": key, "request": request, "acquired_at": _now()}
        try:
            entry.update(status="ok", response=fetch())
        except (VisualContextError, OSError, ValueError) as error:
            # El fallo queda registrado tal cual; nunca se rellena con datos ficticios.
            entry.update(status="failed", error=f"{type(error).__name__}: {error}"[:300])
            failed.add(site_id)
            log.setdefault("failures", []).append({"at": entry["acquired_at"], "stage": path.name, "item": site_id, "outcome": entry["error"]})
        store["sites"][site_id] = entry
        _write(path, store)  # guardado tras cada sitio: la ejecución es reanudable
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
                print("ERROR: falta search-results.json; ejecuta antes python -m pipelines.discover_candidates", file=sys.stderr)
                return 1
            selected = set(json.loads(args.search_results.read_text(encoding="utf-8"))["shortlist"])
            shortlist = [window for window in grid_windows(config) if window["window_id"] in selected]
            problems = fetch_sources(config, science_config, shortlist, log)
    finally:
        _write(log_path, log)
    if problems:
        print(f"BLOQUEO PARCIAL: quedaron pendientes {problems}. Vuelve a ejecutar; lo ya obtenido se reutiliza.", file=sys.stderr)
        return 1
    print(f"etapa {args.stage} completa; registro en {log_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
