# AnalogOS Development and Operations

This guide covers installation, verification, packaging, and data reproduction. To understand the product, start with the [README](../README.md). All commands are run from the repository root unless otherwise indicated.

## Set up the environment

- **Node.js 22+ and npm:** web application and optional AI server.
- **Python 3.11+:** pipelines, data tests, and portable packaging.

```bash
npm install
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
```

The activation shown applies to macOS/Linux; on Windows, use your terminal's virtual environment activator. The initial installation requires a connection. Dependencies are declared in the repository files.

The processed data is already included. You do not need credentials to explore the pilot, run the manual walkthrough, or verify the software. To use the optional assistance, follow [AI_SETUP.md](AI_SETUP.md): the variables are loaded on the server only.

## Run and verify

```bash
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

With the Python environment active, the full check is:

```bash
npm run verify
```

It runs Python tests, server type checking, web tests, and the build. Real AI tests are optional and are not part of this check.

To build and review the local production version:

```bash
npm run build
npm run preview
```

The build ends up in `apps/web/dist/`. The core uses the local files; the public NASA GIBS tiles are an optional enhancement. The development and preview servers include the AI endpoint when it is configured. Serving only the static files does not include that endpoint.

## Repository structure

| Path | Contents |
|---|---|
| `apps/web/` | React/TypeScript interface, 3D globe, and 2D fallback map. |
| `shared/` | Evaluation and validation shared between browser and server. |
| `server/ai/`, `api/` | Optional Anthropic assistance and deployable function entry point. |
| `pipelines/` | Acquisition, transformation, and artifact generation. |
| `artifacts/science-v3/` | Snapshot of the Chile–Argentina pilot consumed by the web app. |
| `artifacts/visual-context-v3/` | Local images and provenance for the seven sectors. |
| `artifacts/geology-context-v1/` | Official geological context of the sectors, with coverage and limits. |
| `artifacts/science-v2/`, `artifacts/demo/` | Scientific history and synthetic fixtures for tests. |
| `config/`, `contracts/` | Profiles, search configuration, and JSON Schema contracts. |
| `docs/`, `project/` | Decisions, method, status, and development coordination. |
| `submission/` | Portable package, screenshots, and presentation materials. |

The product brand is AnalogOS; the internal names `analogos-chile` are kept for compatibility.

## Prepare a portable version

With the dependencies installed and the Python environment active:

```bash
npm run release:package
(cd submission && shasum -a 256 -c analogos-static.zip.sha256)
```

The command rebuilds the frontend and validates its contents before writing `submission/analogos-static.zip` and its SHA-256 checksum. It includes the v3 snapshot, local base maps, and images declared in the visual index. If the build contains the geological package, it also validates and includes it. A failed validation preserves the previous deliverable.

The ZIP is deterministic for a given build. The historical file `analogos-chile-static.zip` is not regenerated. The detailed checks are in [scripts/package_release.py](../scripts/package_release.py).

To test the package over HTTP under a subdirectory:

```bash
mkdir -p /tmp/analogos-demo/AnalogOS
unzip -o -q submission/analogos-static.zip -d /tmp/analogos-demo/AnalogOS
python3 -m http.server 8080 --bind 127.0.0.1 --directory /tmp/analogos-demo
```

Open [http://127.0.0.1:8080/AnalogOS/](http://127.0.0.1:8080/AnalogOS/) with the trailing slash. The build paths are relative. Opening `index.html` with `file://` is not a supported mode: the browser may block modules and JSON reads.

The package works in manual mode without a connection. It does not include an AI server or credentials.

## Reproduce the scientific pilot

Source reproduction is independent of exploring the included artifacts. It requires Earthdata and Copernicus accounts for authenticated downloads.

If a local `.env` does not yet exist, create it from [.env.example](../.env.example) and fill in the necessary variables. Keep the file ignored by Git and do not overwrite credentials that are already configured.

With the Python environment active:

```bash
python -m pipelines.fetch_discovery_data --stage tiles
python -m pipelines.discover_candidates
python -m pipelines.fetch_discovery_data --stage sources
python -m pipelines.build_context_outline
python -m pipelines.build_discovery_snapshot
python -m pipelines.fetch_visual_context --snapshot v3
npm run verify
```

The process searches over 50 windows in two regions and characterizes up to six candidates, in addition to the Yungay reference. It uses MOLA, NASADEM, Sentinel-2, POWER, and HLS inventory; it is not an interactive global search. The method and results are in [DISCOVERY_REPORT.md](DISCOVERY_REPORT.md) and [ADR-008](decisions/ADR-008-global-discovery-pilot.md).

Downloads are resumable and bounded. The cache is tied to the exact request: changing region, period, product, or transformation requires querying again. Raw data ends up in `data/raw/`, ignored by Git; versionable outputs go in `artifacts/`. The manifests preserve sources, versions, units, transformations, and checksums, without credentials.

### Visual context

The cards show Sentinel-2 L2A natural-color images from the December 2025 mosaic. They are served as local files and do not modify the assessment.

```bash
python -m pipelines.fetch_visual_context --snapshot v3
python -m pipelines.fetch_visual_context --snapshot v3 --refresh
```

The first command reuses the existing local package without network access or credentials. `--refresh` queries Copernicus again and requires your credentials. See [VISUAL_REVIEW.md](VISUAL_REVIEW.md) and [ADR-005](decisions/ADR-005-offline-visual-context.md).

### Geological context

```bash
python -m pipelines.build_geology_context --offline
python -m pipelines.build_geology_context --refresh
```

`--offline` requires the local raw cache to exist at `data/raw/geology-context-v1/`; that cache is not included in Git. `--refresh` downloads public cartography of Chile and Argentina, without credentials. The processed package is included and the web app can use it without rebuilding it.

The cartography from SERNAGEOMIN (via MMA, scale 1:1,000,000) and SEGEMAR/SIGAM (1:250,000) provides units, gaps and overlaps. Its coverage is not a measure of suitability or accuracy. If the context is missing or invalid, the application indicates it and keeps the rest of the flow.

Operation, sources, licenses and limits: [GEOLOGY_CONTEXT.md](GEOLOGY_CONTEXT.md). Decisions: [ADR-010](decisions/ADR-010-geology-context.md) and [ADR-011](decisions/ADR-011-geology-guided-test-guidance.md). The AI guidance is optional and does not change the scores or the requirements outcome.

### Historical snapshots and fixtures

These commands do not replace the v3 snapshot that the application consumes:

```bash
python -m pipelines.fetch_precision_data
python -m pipelines.build_precision_snapshot
```

They rebuild the v2 history in `artifacts/science-v2/` and require Earthdata/Copernicus. The v1 history keeps the `pipelines.fetch_science_data` and `pipelines.build_science_snapshot` modules, without credentials.

To regenerate only the synthetic contract fixtures:

```bash
python -m pipelines.build_demo --profile config/mission_profiles/mars-rover-mobility-v1.json
```

## Deployment

The frontend can be served statically. The AI additionally needs a server compatible with `api/ai.ts`, its artifacts and environment configuration; the repository workflow uses Vercel.

| Branch | Environment | URL |
|---|---|---|
| `main` | Production | https://analogos.vercel.app/ |
| `dev` | Team preview | https://analogos-dev.vercel.app/ |

The `.github/workflows/vercel-deploy.yml` workflow builds the web app and checks that the packaged function starts up before deploying. Both environments receive the Anthropic configuration only at runtime from GitHub Secrets. To promote a reviewed version, merge dev into main and push without force. A `master` branch is not used.

The team environment on dev keeps access protection and is not a public demo. See [AI_SETUP.md](AI_SETUP.md) to configure the function and [DEV_AI_VERIFICATION.md](DEV_AI_VERIFICATION.md) for the verification evidence. Real tests consume the configured API:

```bash
npm run test:ai-live
```

## Contributing and resuming work

Before editing, read [AGENTS.md](../AGENTS.md), the [current status](../project/STATUS.md), the [assigned task](../project/NEXT_TASK.md), the latest [changelog](../project/CHANGELOG.md) and the [decision records](decisions/). Respect the owner and scope of the task; preserve existing team changes.

The agents have [CLAUDE.md](../CLAUDE.md), [START_CLAUDE.md](../prompts/START_CLAUDE.md) and [RESUME_CODEX.md](../prompts/RESUME_CODEX.md). Continuity is documented in [HANDOFF_PROTOCOL.md](../project/HANDOFF_PROTOCOL.md).

Before delivering changes, run tests and build, record the results and update the status. Scientific results, similarity and confidence must keep their traceability; passing the software tests is not equivalent to validating the sectors in the field.

## Explore / Mission interface

The web app uses a fixed scene: the 3D globe in the background, which switches to a 2D map only when zooming in, with the carousel of places, the metric lines, the rail, “Your mission” and the Reading. Internally it uses the deterministic engine (`shared/mission`), the optional AI (`server/ai`) and the team's v3 and geology data.

- Design and decisions: `docs/UX_REDESIGN.md`.
- File ownership by feature (`apps/web/src/features/*`): `docs/BUILD_CONTRACTS.md`.
- Correspondence with the planner and the team's geology: `docs/INTEGRATION_PLAN.md`.
- Performance and measurements: `docs/PERFORMANCE.md`.

