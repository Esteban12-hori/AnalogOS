# AI Assistance (M8) — setup and limits

AI is **optional**: with no key, no network, or in the static ZIP, the planner works fully in manual mode. See ADR-009.

## What it does and what it does not do

- **Draft** (`draft`): converts the text of the test into structured requirements **that are not confirmed**. Each requirement quotes a literal fragment of the brief; the figures must appear in that quote; a topographic metric without "median/regional/full window" is left as a point-scale value (not evaluable) with a question.
- **Explanation** (`explain`): the AI only **selects** references (sectors, requirements, evidence, checks) from IDs that the server recalculates. It does not write prose. Statuses, values, exclusions and blockers are always rendered by the app from the deterministic engine.
- The AI never chooses weights, scores, verdicts, sources or geographic facts.

## Variables (server only; never with the prefix `VITE_`)

Copy `.env.example` to `.env` (ignored by git) and fill in:

| Variable | Use |
|---|---|
| `ANTHROPIC_API_KEY` | provider key; without it the AI is "unavailable" |
| `ANTHROPIC_MODEL` | model; default `claude-sonnet-5-5`; a malformed name disables the AI |
| `ANALOGOS_AI_ALLOWED_ORIGINS` | extra exact origins, comma-separated (optional) |
| `ANALOGOS_AI_TIMEOUT_MS` | maximum provider time, 1000–55000 (default 20000) |

## Running locally

- `npm run dev` (Vite on 127.0.0.1) and `npm run build && npm run preview` serve `/api/ai` with the same logic as Vercel (`server/ai/`). Only `ANTHROPIC_*` and `ANALOGOS_AI_*` are read from the root `.env`, in the Node process.
- Optional real test: `npm run test:ai-live` (calls Anthropic; prints only model, request-id, date and usage).
- The automated tests (`npm run verify`) use a simulated `fetch` and never the network.

## Endpoint `POST /api/ai`

- JSON body ≤ 24 KB; brief ≤ 3000 characters; `max_tokens` 2000; the timeout covers headers **and** reading the body.
- Operations `draft` (`brief`) and `explain` (confirmed `request` + fingerprint + optional `geology_context_fingerprint`). `explain` recalculates the evaluation on the server from the validated `artifacts/science-v3`; it does not accept facts or geodata from the client.
- The provider output is validated with a strict JSON Schema before being used; refusals, truncation, foreign IDs or invalid JSON are discarded without repair.
- Errors use fixed messages: the provider body, the key or traces are never reflected. No brief logs.
- Rate limit: 8 calls/min per client and 60/min globally, **in memory per instance (not distributed)**.
- **Origin**: loopback `http` is accepted (not in `VERCEL_ENV=production`), the hostnames of `VERCEL_URL`/`VERCEL_BRANCH_URL`/`VERCEL_PROJECT_PRODUCTION_URL`, explicit origins and the same host as the request (alias). No wildcards. **The `Origin` check limits use from browsers; it is not authentication.** The `dev` deployment remains under the existing Vercel protection; it was not modified.

## What is sent to Anthropic

- Draft: the text of the brief.
- Explanation (without geology): the names/details of the confirmed requirements and the already calculated results (statuses, ids). The full text of the brief is **not** sent.
- Explanation **with geological guidance** (opt-in checkbox on the results screen): in addition, the **confirmed objective** (brief text, activity, objective and requirements) and the **official public geological mapping** of the evaluated, non-discarded sectors (name, code and original description of each unit, coverage fractions, scale and source) are sent. Typical input ≈ 25 000 tokens.
- The button for each operation explains this next to itself; the manual workflow transmits nothing.

## Geological guidance (M10, opt-in)

- The client declares `geology_context_fingerprint` (SHA-256 of the complete canonical JSON of the context validated in the browser). The server loads its own package (`server/ai/geology.ts`), validates it with `shared/geology/context.ts` and checks the SHA-256 of the bytes of `candidate-details.json`. Without a fingerprint there is no geological channel and the behavior is that of M8.
- Errors before the provider: `geology_context_unavailable` (the server has no valid package or it is missing) and `geology_context_stale` (a different version), both 409; the UI offers "Retry without geology".
- The AI returns `geology_ref_ids` (up to 3 per sector and 12 in total) taken from a closed catalog of unit+purpose pairs; any foreign, repeated or over-limit id discards the entire response. `max_tokens` 6000 only with a geological channel (with 2000 the real test was truncated).
- Response: `geology: { context_fingerprint, catalog_fingerprint, selection: { ref_ids } }`, separate from the M8 selection. Objective, brief and unit descriptions travel as JSON data inside `<geology>` with `<` escaped (they cannot close the delimiter).
- Vercel function: `vercel.json` includes `artifacts/geology-context-v1/index.json` and `artifacts/science-v3/candidate-details.json` in `api/ai.ts`; `scripts/check-vercel-function.mjs` checks (in CI, on the already built function) that the package travels and validates, and checks absence/corruption in isolation in a temporary copy.
- Optional real test: `npm run test:ai-live` includes two contrasting objectives (mobility versus sampling); it does not assume exact stability of the model.

- **Bounded recovery**: if the call succeeds but the selection (M8 or geology) is semantically invalid, a single second call is made with the same facts/schema and a fixed reminder for the typed reason, within the configured total deadline (the second uses the remainder; with no remainder ≥ 2 s it is not attempted). There is no retry on timeout, refusal, rate limit, truncation or upstream errors, nor for M8 without geology. Provenance is that of the accepted response; the consumption of the first call is not added. The prompt fixes `budget = min(12, 3 × sectors with references)`.

## Provenance

Each call returns model, date, `request-id`, token usage and `stop_reason`. The exported JSON stores the draft and the explanation separately (with geology, the `analogos-mission-geology-export` wrapper adds the geological selection from the same call), linked to their input fingerprint, with the user's changes calculated (edited/removed/added). If the user edits the brief afterward, the draft is no longer attributed to the AI.

## Deployment in dev and production

Production published and actually verified at `7e8c779`: [PRODUCTION_RELEASE.md](PRODUCTION_RELEASE.md). Draft and geological explanation verified from the public interface; the earlier dev evidence is kept separately.

Dan authorized the full promotion to production on 2026-11-15. The `vercel-deploy.yml` workflow receives `ANTHROPIC_API_KEY` from GitHub Secrets and injects it with `vercel deploy --env` only at runtime, along with the model, both for `dev` (preview) and for `main` (production). It is not delivered to the build and there is no need to copy `.env` into the repository. If the secret is missing, the deployment stops. To rotate it, update that secret and redeploy both environments. Dev protection is preserved. Reference: [runtime variables in Vercel CLI](https://vercel.com/docs/cli/deploy#env).

- Handler, local server and deployed function verified, including real draft and explanation calls from https://analogos-dev.vercel.app/. Evidence, request IDs and export in `docs/DEV_AI_VERIFICATION.md`.
- M8 precedent: code `9060970`; Actions 43639834860 successful. Single core in `shared/` to avoid mixing CommonJS/ESM packages. CI checks startup, contracts and the snapshot of the real package before deploying.
- The AI configuration is delivered to the deployment from GitHub; editing only a Vercel project variable with the same name does not replace the secret this workflow uses.
- The portable ZIP (`submission/analogos-static.zip`) includes neither function nor key: the AI appears "unavailable" with a clear message and manual mode remains complete.
