# Demo Acceptance Criteria

## In 30 seconds

The jury understands:

- what problem we solve;
- for whom;
- why "similar to Mars" is not enough;
- what sets AnalogOS apart.

## 90–120-second flow

1. Select or present the P0 profile.
2. Show 3–5 zones in Chile.
3. Open the first one.
4. Separate similarity, confidence, and feasibility.
5. Show the breakdown and a source.
6. Compare with another candidate.
7. Show a limitation and a field verification.
8. Close with reproducibility and the next step.

## Functional acceptance

- The map loads without external services.
- Candidates are polygons or cells, not falsely exact pins.
- The ranking and the detail sheet use the same snapshot/versions.
- The UI clearly distinguishes a fixture from a scientific result.
- Sources are accessible from the detail sheet.
- Missing data is visible.
- The comparison uses consistent units.
- A readable error state exists.
- The app can be used with the keyboard for main actions.

## Scientific acceptance

- The planetary reference is identified.
- Atacama acts as a control, not a training label.
- Each criterion explains its calculation and unit.
- The top 3 passed visual inspection.
- At least one sensitivity result exists.
- Each candidate states where the analogy fails.

## Operational acceptance

- Static build saved.
- Backup video recorded.
- Links tested in incognito mode.
- README, chosen license, attributions, and limitations complete.
- There are no secrets in the repository.

## M8 walkthroughs (guide for the team)

Integrated interface (ADR-013): the team planner lives in "Your mission" ("Mission" tab: left panel ≥1440 px, popover from the composer <1440 px, "Your mission" tab of the sheet on mobile).

1. The "Mission" tab opens "Your mission" with "Define a test" and "Evaluate a sector". The rail and the detail sheet of each sector have "Evaluate this sector". The composer's "Send" loads the text into "Your mission" (it never calls the AI).
2. Define a test: "Load an example" (editable sample values) → review/edit requirements → Next (choose what to compare) → Confirm → Evaluate. Test: slope ≤ 0,001 ⇒ no prioritized area; "traction" essential ⇒ insufficient evidence in all. The statuses appear in the carousel, the globe, the rail, and the Reading.
3. Evaluate a sector: choose an area (Yungay appears as REF), a point (-69,7 / -25), or a rectangle; verify that a sub-rectangle requires choosing the full window and that a point outside coverage produces an exportable report.
4. Changing any data after evaluating leaves the previous result dimmed and requires confirming again. "Download JSON" and "Print report" from the "Your mission" result.
5. Optional AI (requires `.env`, see `docs/AI_SETUP.md`): "Propose requirements with AI" (in "Your mission") and "Highlight reasons with AI" (in the Reading, after evaluating). Without a key, or in the ZIP, a friendly message appears and everything else keeps working.
   Geological orientation (M10): after evaluating, "Your mission" shows, after "Download JSON", "Print report" and "Back to editing", the fold "Geological orientation for this test · General orientation without AI · N sectors" (closed by default); when opened, limits, official source, and "Download JSON with geological orientation". In the Reading, the checkbox "Include the test's geological orientation" (active by default) changes the submission notice; with AI, the fold summary and the section change to "AI selection" without changing statuses, order, or figures. If the server does not have the same context, the Reading offers "Retry without geology".
7. Explore: carousel with country filter; select a place → "View full sheet" → Origin, Geology (official geological context with coverage, scale, provenance, and "Download geological context (JSON)"), Signal, Compare, Method (50 windows and "Open the 50 windows and their reasons") and Sources (satellite context). "Export sheet (JSON)" in the sheet header.
6. Without WebGL, 390 px mobile, and keyboard: the planner uses native controls and a local SVG diagram.
