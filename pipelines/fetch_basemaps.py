"""Descarga y hornea los mapas base 2D oficiales (NASA GIBS) que usa la web al hacer zoom.

Solo es contexto visual: ninguna de estas imágenes entra al score.

- Regional: NASA Blue Marble Next Generation (~500 m), sin nubes, una sola petición.
- Sectores: HLS S30/L30 v2.0 (~30 m), mediana por píxel de varias fechas de 2025
  para eliminar nubes y rellenar bordes de pasada.

Las imágenes se piden por WMS en EPSG:4326, se reproyectan a Web Mercator por filas
(para que MapLibre las coloque sin distorsión en latitud) y se guardan como WebP con
transparencia donde no hubo ninguna observación válida. Nada se inventa: los huecos
quedan transparentes.

Uso: ``python -m pipelines.fetch_basemaps`` (sin credenciales; GIBS es abierto).
"""

from __future__ import annotations

import argparse
import io
import json
import math
import ssl
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date as Date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np
from PIL import Image

from pipelines.contracts import ROOT

WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
OUT_DIR = ROOT / "artifacts" / "basemaps"
CANDIDATES = ROOT / "artifacts" / "science-v2" / "candidate-details.json"
USER_AGENT = "AnalogOS-basemap-pipeline/1.0"

try:  # Python de python.org en macOS no trae certificados raíz.
    import certifi

    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:  # pragma: no cover
    SSL_CONTEXT = ssl.create_default_context()

REGION = {
    "id": "region-norte-grande",
    "label": "Norte de Chile",
    "bounds": [-73.0, -30.0, -65.0, -17.0],
    "layer": "BlueMarble_NextGeneration",
    "dates": [],
    "resolution_m": 500,
    "pixel_degrees": 0.0045,
    "source": "NASA Blue Marble: Next Generation (MODIS, 2004) vía NASA GIBS",
}

# HLS S30 (Sentinel-2A/B/C) y L30 (Landsat 8/9) pasan por órbitas distintas, así que
# la cobertura de cada fecha depende del sector. Se sondean miniaturas de días de cuatro
# meses de 2025 y se eligen fechas con cobertura casi completa, repartidas en el año.
HLS_LAYERS = ["HLS_S30_Nadir_BRDF_Adjusted_Reflectance", "HLS_L30_Nadir_BRDF_Adjusted_Reflectance"]
PROBE_MONTHS = [1, 4, 7, 10]
PROBE_PIXELS = 64
MIN_COVERAGE = 0.9
MAX_DATES = 14
SECTOR_MARGIN_DEG = 0.12
SECTOR_PIXELS = 1536


def _wms_png(layer: str, bounds: list[float], width: int, height: int, date: str | None) -> np.ndarray:
    west, south, east, north = bounds
    params = {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.3.0",
        "LAYERS": layer,
        "CRS": "EPSG:4326",
        "BBOX": f"{south},{west},{north},{east}",
        "WIDTH": width,
        "HEIGHT": height,
        "FORMAT": "image/png",
        "TRANSPARENT": "TRUE",
    }
    if date:
        params["TIME"] = date
    url = f"{WMS}?{urlencode(params)}"
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=120, context=SSL_CONTEXT) as response:
                data = response.read()
            image = Image.open(io.BytesIO(data))
            return np.asarray(image.convert("RGBA")).astype(np.float32)
        except Exception:  # noqa: BLE001 - red intermitente; se reintenta y luego se propaga
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("inalcanzable")


def _mercator_y(latitude: float) -> float:
    return math.log(math.tan(math.pi / 4 + math.radians(latitude) / 2))


def warp_rows_to_mercator(rgba: np.ndarray, south: float, north: float) -> np.ndarray:
    """Remuestrea filas de una imagen equirectangular para que sean uniformes en Web Mercator."""
    height = rgba.shape[0]
    y_north, y_south = _mercator_y(north), _mercator_y(south)
    ys = y_north - (np.arange(height) + 0.5) / height * (y_north - y_south)
    latitudes = np.degrees(2 * np.arctan(np.exp(ys)) - math.pi / 2)
    source_rows = (north - latitudes) / (north - south) * height - 0.5
    lower = np.clip(np.floor(source_rows).astype(int), 0, height - 1)
    upper = np.clip(lower + 1, 0, height - 1)
    weight = (source_rows - lower).clip(0, 1)[:, None, None]
    return rgba[lower] * (1 - weight) + rgba[upper] * weight


def median_composite(stack: list[np.ndarray]) -> tuple[np.ndarray, float]:
    """Mediana por píxel ignorando píxeles transparentes o negros (sin dato)."""
    rgb_layers = []
    for rgba in stack:
        rgb = rgba[..., :3].copy()
        invalid = (rgba[..., 3] < 128) | (rgb.sum(axis=-1) < 12)
        rgb[invalid] = np.nan
        rgb_layers.append(rgb)
    with np.errstate(all="ignore"):
        import warnings

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            median = np.nanmedian(np.stack(rgb_layers), axis=0)
    gaps = np.isnan(median).any(axis=-1)
    alpha = np.where(gaps, 0, 255).astype(np.float32)
    rgba = np.dstack([np.nan_to_num(median), alpha])
    return rgba, float(gaps.mean())


def _save_webp(rgba: np.ndarray, path: Path) -> None:
    image = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA")
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=82, method=6)


def _sector_bounds(candidate: dict) -> list[float]:
    ring = candidate["geometry"]["coordinates"][0]
    lons = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    m = SECTOR_MARGIN_DEG
    return [round(min(lons) - m, 4), round(min(lats) - m, 4), round(max(lons) + m, 4), round(max(lats) + m, 4)]


def build_region() -> dict:
    west, south, east, north = REGION["bounds"]
    width = round((east - west) / REGION["pixel_degrees"])
    height = round((north - south) / REGION["pixel_degrees"])
    rgba = _wms_png(REGION["layer"], REGION["bounds"], width, height, None)
    warped = warp_rows_to_mercator(rgba, south, north)
    path = OUT_DIR / f"{REGION['id']}.webp"
    _save_webp(warped, path)
    return {
        "id": REGION["id"],
        "kind": "regional",
        "label": REGION["label"],
        "bounds": REGION["bounds"],
        "image": f"basemaps/{path.name}",
        "layers": [REGION["layer"]],
        "dates": [],
        "resolution_m": REGION["resolution_m"],
        "gap_fraction": 0.0,
        "source": REGION["source"],
    }


def select_hls_dates(bounds: list[float]) -> list[tuple[str, str]]:
    """Devuelve pares (capa, fecha) con cobertura >= MIN_COVERAGE, repartidos en el año."""
    probes = []
    for layer in HLS_LAYERS:
        for month in PROBE_MONTHS:
            day = Date(2025, month, 1)
            while day.month == month:
                probes.append((layer, day.isoformat()))
                day += timedelta(days=1)

    def coverage(probe: tuple[str, str]) -> float:
        layer, day = probe
        try:
            rgba = _wms_png(layer, bounds, PROBE_PIXELS, PROBE_PIXELS, day)
        except Exception:  # noqa: BLE001
            return 0.0
        return float(((rgba[..., 3] >= 128) & (rgba[..., :3].sum(axis=-1) >= 12)).mean())

    with ThreadPoolExecutor(max_workers=8) as pool:
        covered = [probe for probe, value in zip(probes, pool.map(coverage, probes)) if value >= MIN_COVERAGE]
    covered.sort(key=lambda probe: probe[1])
    if len(covered) <= MAX_DATES:
        return covered
    step = len(covered) / MAX_DATES
    return [covered[int(index * step)] for index in range(MAX_DATES)]


def build_sector(candidate: dict) -> dict:
    bounds = _sector_bounds(candidate)
    west, south, east, north = bounds
    aspect = (north - south) / ((east - west) * math.cos(math.radians((north + south) / 2)))
    width = SECTOR_PIXELS
    height = round(SECTOR_PIXELS * aspect)
    stack, used = [], []
    layers_used = set()
    for layer, date in select_hls_dates(bounds):
        try:
            stack.append(_wms_png(layer, bounds, width, height, date))
            used.append(f"{layer.split('_')[1]}:{date}")
            layers_used.add(layer)
        except Exception as error:  # noqa: BLE001
            print(f"  aviso: {layer} {date} no disponible ({error})")
    if not stack:
        raise RuntimeError(f"Sin imágenes HLS para {candidate['site_id']}")
    composite, gaps = median_composite(stack)
    warped = warp_rows_to_mercator(composite, south, north)
    path = OUT_DIR / f"{candidate['site_id']}.webp"
    _save_webp(warped, path)
    return {
        "id": candidate["site_id"],
        "kind": "sector",
        "label": candidate["name"],
        "bounds": bounds,
        "image": f"basemaps/{path.name}",
        "layers": sorted(layers_used),
        "dates": used,
        "resolution_m": 30,
        "gap_fraction": round(gaps, 5),
        "source": f"NASA HLS S30/L30 v2.0 · mediana de {len(used)} fechas 2025 vía NASA GIBS",
    }


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args(argv)
    candidates = json.loads(CANDIDATES.read_text())
    candidates = candidates if isinstance(candidates, list) else candidates["candidates"]
    print("Regional Blue Marble…")
    entries = [build_region()]
    for candidate in candidates:
        print(f"Sector {candidate['site_id']}…")
        entries.append(build_sector(candidate))
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "purpose": "Contexto visual del mapa 2D. No entra al score.",
        "service": "NASA GIBS WMS EPSG:4326 (best)",
        "service_url": WMS,
        "projection": "Web Mercator por filas (EPSG:3857), bounds en grados WGS84",
        "license": "Imágenes NASA GIBS: uso libre con atribución. HLS incluye datos Copernicus Sentinel-2 modificados.",
        "basemaps": entries,
    }
    (OUT_DIR / "basemaps.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    for entry in entries:
        size = (ROOT / "artifacts" / entry["image"]).stat().st_size / 1e6
        print(f"  {entry['id']}: {size:.2f} MB, huecos {entry['gap_fraction']:.2%}")


if __name__ == "__main__":
    main()
