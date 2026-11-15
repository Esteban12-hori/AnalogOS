# P0 Architecture

## Principle

Static-first. All heavy processing happens before the demo. The browser consumes a small, versioned, validated snapshot.

## Components

```text
Open sources
  ↓
pipelines/ingest
  ↓ validation of license, checksum, CRS, units and NoData
pipelines/features
  ↓ per-cell variables
pipelines/scoring
  ↓ similarity, confidence and constraints
pipelines/candidates
  ↓ clustering and generalization
artifacts/science-v3
  ↓ JSON + GeoJSON + metadata
apps/web
  ↓ map, ranking, profile, comparison and methodology
static build
```

## Frontend

- Vite + React + TypeScript.
- 3D globe (three.js, deferred chunk, local NASA textures) with a local Natural Earth SVG map as an alternative and as a fallback without WebGL; with an optional switch to a 2D MapLibre map and NASA GIBS tiles (ADR-006/007).
- Local state; no Redux in P0.
- Final load from `/science-v3/manifest.json` and relative paths; `/demo/` is kept only for tests.
- Initial view: map + side panel.
- Optional routes: `/`, `/methodology`, `/about`.
- No login.
- No user telemetry.

## Pipeline

- Installable Python package.
- Explicit configuration, not scattered constants.
- Each stage writes a versioned artifact and readable logs.
- Large files are not versioned except for the reduced demo snapshot with a permitted license.
- Each result must record `profile_version`, `data_snapshot_version` and `pipeline_version`.

## Web contract

The frontend knows nothing about Rasterio, internal CRS, or download logic. It only consumes:

- `manifest.json`;
- `mission-profile.json`;
- `candidate-details.json`;
- `context-outline.geojson`;
- `search-results.json` and `precedents.json`;
- `analysis-summary.json`.

The files must validate against `contracts/` before the build.

## Minimal web structure

After integrating the redesign with dev (ADR-014, ADR-013), the web is a fixed scene with independent features
that read the shared stores; the team planner lives in `mission/` and
`components/planner/` and is reused within "Your mission".

```text
apps/web/src/
├── App.tsx                  # loading at the boundary and the product promise
├── shell/                   # frame: stage, dock, rail, sheet, card (Origin, Geology, Method…)
├── state/                   # ui and mission stores (single writer: the mission controller)
├── features/
│   ├── globe/               # globe, switch to 2D, markers, SVG map without WebGL (CandidateMap)
│   ├── places/              # carousel (candidates, REF, ◆, country filter, Mission groups)
│   ├── metrics/             # metrics rail and requirements layer
│   ├── leaders/             # Tesla lines
│   ├── boot/                # "Honest Orbit" startup
│   ├── composer/            # dock, "Your mission", planner controller
│   └── analysis/            # Reading: result, highlighted reasons, facts
├── components/
│   ├── planner/             # team planner pieces (PlannerView, ResultView…)
│   └── CandidateComparison.tsx, SurfaceSignals.tsx, …
├── mission/                 # re-exports from shared/mission and AI client (aiClient)
├── domain/                  # contracts (precompiled validators), discovery, formatting
└── data/                    # loadDemoSnapshot, visual context, base maps
```

## Required states

- loading;
- contract error;
- missing snapshot;
- empty list;
- selected candidate;
- insufficient data;
- fixture/non-scientific;
- offline.

## Do not build in P0

- FastAPI, unless there is evidence of need;
- database;
- PostGIS;
- authentication;
- collaborative editing;
- raster processing in web requests;
- LLM calls in the core demo.

## Security and licenses

- Secrets only in `.env`, never exposed to the frontend.
- `.env.example` contains no real values.
- Show attribution for each layer.
- Do not redistribute datasets if their license does not allow it.
- Generalize sensitive sites and never claim access permission.

## Technical Definition of Done

- `npm run build` finishes without errors.
- `npm run test` is green.
- `python -m pytest` is green.
- One command generates the demo snapshot.
- Artifacts validate against the schemas.
- The web app works by serving the built directory without an external network.
- A clean clone can run `npm run verify`; the test that reprocesses raw NASADEM is activated only when `data/raw/` is available.

## M8: planner and decision layer (ADR-009)

- **Shared core** (`apps/web/src/mission/`, strict TypeScript, pure and network-free): catalog of six measured metrics, Ajv validation, geometry, deterministic engine, per-selection explanation, export, and planner state (`plannerState.ts`, the reducer used by the UI). The UI and the server import the same code.
- **Additive contracts** in `contracts/`: `mission-request`, `mission-evaluation`, `mission-export`, `mission-ai`. The v2/v3 science contracts do not change.
- **Optional server** (`server/ai/`, `api/ai.ts`): testable agnostic handler + Node adapter for Vercel and for the local server (plugin from `apps/web/vite.config.ts`). Facts always come from validated `artifacts/science-v3`. Details and limits in `docs/AI_SETUP.md`.

The pure engine and the shared TypeScript contracts live in `shared/mission/` and `shared/domain/contracts.ts`. The old web paths re-export this single implementation; the server imports `shared/` directly so as not to cross the ESM scope of the frontend package during NodeNext compilation. Before deploying, CI runs `scripts/check-vercel-function.mjs` against the actual Vercel output and requires controlled responses without credentials or network.
- **Engine**: critical first (unmet ⇒ does not comply; unknown or inadequate scale ⇒ insufficient evidence); among the rest, ordering is by met preferences, v3 similarity, and ID. No new suitability percentage. Geometries: only an identical window (epsilon 1e-9°) or an explicitly chosen one inherits statistics; point, sub-bbox, and partial coverage do not.
- **UI** (`components/planner/`): two entry points, steps (describe, sector, confirm, result), requirements editor, local SVG diagram, result, printable report (CSS `@media print`), and validated JSON export. Any edit invalidates confirmation, result, and pending AI calls; late responses are ignored by `requestId` and fingerprints.
- **Static/offline**: nothing in the planner requires a network; the ZIP carries no function or key.
