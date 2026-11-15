# Desarrollo y operación de AnalogOS

Esta guía reúne instalación, verificación, empaquetado y reproducción de datos. Para entender el producto, empieza por el [README](../README.md). Todos los comandos se ejecutan desde la raíz del repositorio, salvo que se indique otra cosa.

## Preparar el entorno

- **Node.js 22+ y npm:** aplicación web y servidor opcional de IA.
- **Python 3.11+:** pipelines, pruebas de datos y empaquetado portable.

```bash
npm install
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
```

La activación mostrada corresponde a macOS/Linux; en Windows usa el activador del entorno virtual de tu terminal. La instalación inicial necesita conexión. Las dependencias se declaran en los archivos del repositorio.

Los datos procesados ya están incluidos. No necesitas credenciales para explorar el piloto, ejecutar el recorrido manual o verificar el software. Para usar la asistencia opcional, sigue [AI_SETUP.md](AI_SETUP.md): las variables se cargan solo en el servidor.

## Ejecutar y verificar

```bash
npm run dev
```

Abre [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

Con el entorno Python activo, la comprobación integral es:

```bash
npm run verify
```

Ejecuta pruebas Python, comprobación de tipos del servidor, pruebas web y build. Las pruebas de IA real son optativas y no forman parte de esta comprobación.

Para construir y revisar la versión de producción local:

```bash
npm run build
npm run preview
```

El build queda en `apps/web/dist/`. El núcleo usa los archivos locales; las teselas públicas de NASA GIBS son una mejora opcional. Los servidores de desarrollo y preview incluyen el endpoint de IA cuando está configurado. Servir únicamente los archivos estáticos no incluye ese endpoint.

## Estructura del repositorio

| Ruta | Contenido |
|---|---|
| `apps/web/` | Interfaz React/TypeScript, globo 3D y mapa 2D de respaldo. |
| `shared/` | Evaluación y validación compartidas entre navegador y servidor. |
| `server/ai/`, `api/` | Asistencia opcional de Anthropic y entrada de la función desplegable. |
| `pipelines/` | Adquisición, transformación y generación de artefactos. |
| `artifacts/science-v3/` | Snapshot del piloto Chile–Argentina que consume la web. |
| `artifacts/visual-context-v3/` | Imágenes locales y procedencia de los siete sectores. |
| `artifacts/geology-context-v1/` | Contexto geológico oficial de los sectores, con cobertura y límites. |
| `artifacts/science-v2/`, `artifacts/demo/` | Histórico científico y fixtures sintéticos para pruebas. |
| `config/`, `contracts/` | Perfiles, configuración de búsqueda y contratos JSON Schema. |
| `docs/`, `project/` | Decisiones, método, estado y coordinación del desarrollo. |
| `submission/` | Paquete portable, capturas y materiales de presentación. |

La marca del producto es AnalogOS; los nombres internos `analogos-chile` se conservan por compatibilidad.

## Preparar una versión portable

Con las dependencias instaladas y el entorno Python activo:

```bash
npm run release:package
(cd submission && shasum -a 256 -c analogos-static.zip.sha256)
```

El comando reconstruye el frontend y valida su contenido antes de escribir `submission/analogos-static.zip` y su checksum SHA-256. Incluye el snapshot v3, mapas base locales e imágenes declaradas en el índice visual. Si el build contiene el paquete geológico, también lo valida y lo incluye. Una validación fallida conserva la entrega anterior.

El ZIP es determinista para un mismo build. El archivo histórico `analogos-chile-static.zip` no se regenera. Los controles detallados están en [scripts/package_release.py](../scripts/package_release.py).

Para probar el paquete por HTTP bajo un subdirectorio:

```bash
mkdir -p /tmp/analogos-demo/AnalogOS
unzip -o -q submission/analogos-static.zip -d /tmp/analogos-demo/AnalogOS
python3 -m http.server 8080 --bind 127.0.0.1 --directory /tmp/analogos-demo
```

Abre [http://127.0.0.1:8080/AnalogOS/](http://127.0.0.1:8080/AnalogOS/) con la barra final. Las rutas del build son relativas. Abrir `index.html` con `file://` no es un modo soportado: el navegador puede bloquear módulos y lecturas de JSON.

El paquete funciona en modo manual sin conexión. No incluye servidor de IA ni credenciales.

## Reproducir el piloto científico

La reproducción de fuentes es independiente de la exploración de los artefactos incluidos. Requiere cuentas Earthdata y Copernicus para las descargas autenticadas.

Si aún no existe un `.env` local, créalo a partir de [.env.example](../.env.example) y completa las variables necesarias. Conserva el archivo ignorado por Git y no sobrescribas credenciales ya configuradas.

Con el entorno Python activo:

```bash
python -m pipelines.fetch_discovery_data --stage tiles
python -m pipelines.discover_candidates
python -m pipelines.fetch_discovery_data --stage sources
python -m pipelines.build_context_outline
python -m pipelines.build_discovery_snapshot
python -m pipelines.fetch_visual_context --snapshot v3
npm run verify
```

El proceso busca sobre 50 ventanas en dos regiones y caracteriza hasta seis candidatas, además de la referencia Yungay. Usa MOLA, NASADEM, Sentinel-2, POWER e inventario HLS; no es una búsqueda global interactiva. El método y los resultados están en [DISCOVERY_REPORT.md](DISCOVERY_REPORT.md) y [ADR-008](decisions/ADR-008-global-discovery-pilot.md).

Las descargas son reanudables y acotadas. La caché está ligada a la petición exacta: cambiar región, periodo, producto o transformación requiere consultar de nuevo. Los datos crudos quedan en `data/raw/`, ignorados por Git; las salidas versionables, en `artifacts/`. Los manifiestos conservan fuentes, versiones, unidades, transformaciones y checksums, sin credenciales.

### Contexto visual

Las fichas muestran imágenes Sentinel-2 L2A en color natural del mosaico de diciembre de 2025. Se sirven como archivos locales y no modifican la evaluación.

```bash
python -m pipelines.fetch_visual_context --snapshot v3
python -m pipelines.fetch_visual_context --snapshot v3 --refresh
```

El primer comando reutiliza el paquete local existente sin red ni credenciales. `--refresh` vuelve a consultar Copernicus y requiere sus credenciales. Consulta [VISUAL_REVIEW.md](VISUAL_REVIEW.md) y [ADR-005](decisions/ADR-005-offline-visual-context.md).

### Contexto geológico

```bash
python -m pipelines.build_geology_context --offline
python -m pipelines.build_geology_context --refresh
```

`--offline` requiere que exista la caché cruda local en `data/raw/geology-context-v1/`; esa caché no viene en Git. `--refresh` descarga cartografía pública de Chile y Argentina, sin credenciales. El paquete procesado sí está incluido y la web puede utilizarlo sin reconstruirlo.

La cartografía de SERNAGEOMIN (vía MMA, escala 1:1.000.000) y SEGEMAR/SIGAM (1:250.000) aporta unidades, huecos y solapes. Su cobertura no es una medida de aptitud o precisión. Si el contexto está ausente o es inválido, la aplicación lo indica y conserva el resto del recorrido.

Operación, fuentes, licencias y límites: [GEOLOGY_CONTEXT.md](GEOLOGY_CONTEXT.md). Decisiones: [ADR-010](decisions/ADR-010-geology-context.md) y [ADR-011](decisions/ADR-011-geology-guided-test-guidance.md). La orientación de IA es opcional y no cambia los puntajes ni el resultado de requisitos.

### Snapshots históricos y fixtures

Estos comandos no sustituyen el snapshot v3 que consume la aplicación:

```bash
python -m pipelines.fetch_precision_data
python -m pipelines.build_precision_snapshot
```

Reconstruyen el histórico v2 en `artifacts/science-v2/` y requieren Earthdata/Copernicus. El histórico v1 conserva los módulos `pipelines.fetch_science_data` y `pipelines.build_science_snapshot`, sin credenciales.

Para regenerar exclusivamente las fixtures sintéticas de contratos:

```bash
python -m pipelines.build_demo --profile config/mission_profiles/mars-rover-mobility-v1.json
```

## Despliegue

El frontend puede servirse estáticamente. La IA necesita además un servidor compatible con `api/ai.ts`, sus artefactos y configuración de entorno; el flujo del repositorio usa Vercel.

| Rama | Entorno | URL |
|---|---|---|
| `main` | Producción | https://analogos.vercel.app/ |
| `dev` | Preview del equipo | https://analogos-dev.vercel.app/ |

El workflow `.github/workflows/vercel-deploy.yml` construye la web y comprueba el arranque de la función empaquetada antes de desplegar. Ambos entornos reciben la configuración de Anthropic solo en runtime desde GitHub Secrets. Para promover una versión revisada, integrar dev en main y hacer push sin force. No se usa una rama `master`.

El entorno del equipo en dev conserva protección de acceso y no es una demo pública. Consulta [AI_SETUP.md](AI_SETUP.md) para configurar la función y [DEV_AI_VERIFICATION.md](DEV_AI_VERIFICATION.md) para la evidencia de verificación. Las pruebas reales consumen la API configurada:

```bash
npm run test:ai-live
```

## Contribuir y retomar trabajo

Antes de editar, lee [AGENTS.md](../AGENTS.md), el [estado actual](../project/STATUS.md), la [tarea asignada](../project/NEXT_TASK.md), el último [changelog](../project/CHANGELOG.md) y los [registros de decisiones](decisions/). Respeta el propietario y el alcance de la tarea; conserva cambios existentes del equipo.

Los agentes cuentan con [CLAUDE.md](../CLAUDE.md), [START_CLAUDE.md](../prompts/START_CLAUDE.md) y [RESUME_CODEX.md](../prompts/RESUME_CODEX.md). La continuidad se documenta en [HANDOFF_PROTOCOL.md](../project/HANDOFF_PROTOCOL.md).

Antes de entregar cambios, ejecuta tests y build, registra resultados y actualiza el estado. Los resultados científicos, la similitud y la confianza deben conservar su trazabilidad; pasar las pruebas de software no equivale a validar los sectores en campo.

## Interfaz Explorar / Misión

La web usa un escenario fijo: el globo 3D de fondo, que pasa solo a un mapa 2D al hacer zoom, con el carrusel de lugares, las líneas de métricas, el riel, «Tu misión» y la Lectura. Por dentro usa el motor determinista (`shared/mission`), la IA opcional (`server/ai`) y los datos v3 y de geología del equipo.

- Diseño y decisiones: `docs/UX_REDESIGN.md`.
- Propiedad de archivos por feature (`apps/web/src/features/*`): `docs/BUILD_CONTRACTS.md`.
- Correspondencia con el planificador y la geología del equipo: `docs/INTEGRATION_PLAN.md`.
- Rendimiento y mediciones: `docs/PERFORMANCE.md`.

