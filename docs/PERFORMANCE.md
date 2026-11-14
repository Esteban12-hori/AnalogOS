# Rendimiento de la web

Mediciones del 2026-11-14 con Chromium y GPU Metal (Mac), 1440×900, sin caché. Red simulada de 8 Mbps con 60 ms de latencia. Servidor estático con gzip, como Vercel.

## Dónde se va el tiempo

| Recurso | Costo |
|---|---|
| JavaScript hasta ver el globo | ~430 ms de CPU (parseo y compilación de three.js y la app) |
| Tareas totales del hilo principal hasta ver el globo | ~740 ms |
| Transferencia | Domina con cualquier red real: three.js ~250 KB gz, MapLibre ~290 KB gz, su worker ~145 KB gz, imágenes |
| GPU | Globo y mapa ya dibujan en GPU (WebGL); en reposo hay 0 dibujos |

## Antes y después (globo y mapa 2D)

| Métrica | `main` en `adcffcd` | Ahora |
|---|---|---|
| Globo visible con rótulos | 2,9 s | 1,9 s |
| Todo precargado (2D incluido) | 7,5 s | 5,3 s |
| Bytes totales de la sesión | 5,6 MB | 3,4 MB |
| Textura del globo | 2K (borrosa en la vista global) | 1K inmediata + 4K WebP nítida |
| Zoom en el globo | se pixelaba hasta zoom ~5,6 | pasa al 2D (Blue Marble ~500 m) al acercarse ~×1,4 |

Qué cambió:
- Textura progresiva: una 1K de 57 KB pinta el globo de inmediato y la 4K WebP de ~585 KB la reemplaza al llegar.
- Umbral de paso al 2D relativo a la vista global del panel (`flatThresholds`), para que dé igual en un monitor bajo o en uno 4K.
- La precarga del 2D espera a que el globo tenga su textura, para no competir con él.
- Las vistas Sentinel-2 de ADR-005 se dibujan en el mapa como WebP de 229 KB en vez de PNG de 3,4 MB. Los PNG originales siguen intactos y la web solo usa el WebP si el SHA-256 del PNG coincide.
- Mundo Blue Marble local (239 KB) para el 2D sin conexión.

## ¿Rust lo haría más rápido?

No, con estas mediciones:
- **Navegador (Rust → WebAssembly).** El cálculo en CPU es ~0,4 s y casi todo es parseo de three.js y MapLibre, que ya dibujan en GPU. Reescribir el render en Rust/WASM agregaría un binario WASM, en general de varios MB para motores como Bevy o maplibre-rs, y aumentaría justo lo que hoy domina: los bytes. No hay un algoritmo pesado en JavaScript que acelerar.
- **«Backend».** No hay: el sitio es estático en la CDN de Vercel, con caché inmutable en `/assets`. Un servidor en Rust (Axum, Actix) agregaría un salto de cómputo frente a archivos ya cacheados en el borde. Sería más lento, no más rápido.
- **Pipelines.** `fetch_basemaps` tarda ~3 min, casi todo esperando a NASA GIBS por red. Rust no cambia la red, y los pipelines no afectan la carga de la página.

Lo que sí sigue moviendo la aguja:
1. Bytes: dividir three.js, servir texturas KTX2/Basis o reducir MapLibre (por ejemplo, cargar el worker solo al acercarse).
2. Verificar en producción que Vercel aplique la caché de `vercel.json` y Brotli.
3. Alternativa de arquitectura, no de lenguaje: usar la proyección `globe` de MapLibre con teselas Blue Marble. Un solo motor y sin textura que se pixele, a cambio de rehacer el aspecto del globo (atmósfera, luz) y de agregar teselas locales para el modo sin conexión.
