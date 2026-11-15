# ADR-004 — Portable static release and deterministic packaging

- Status: accepted by Codex, after independent review of the implementation, tests and demo over HTTP
- Date: 2026-11-14

## Context

The release ZIP was assembled by hand with `zip -r` on `apps/web/dist/`. That did not guarantee which files went in, its bytes changed on every run because of internal timestamps, and it did not protect the previous release in case of an error. In addition, the build used absolute paths (`/assets/...`), so it only loaded at the root of a domain and not in a subdirectory such as `/AnalogOS/`.

## Decision

1. `base: './'` in Vite. `index.html`, the JSON loading and the link to the auditable analysis already use `import.meta.env.BASE_URL`, so the same build works at `/` and in a subdirectory.
2. `npm run release:package` chains `npm run build` with `scripts/package_release.py` (Python standard library only).
3. Explicit content list: `index.html`, the JS/CSS files that this HTML references relatively under `assets/`, and the five `science-v2/` files. Additional files, symbolic links, absolute or external references, and missing required files are rejected.
4. Deterministic ZIP: alphabetical order, fixed internal date (1980-01-01), fixed permissions and no compression (`ZIP_STORED`), so that the bytes do not depend on the zlib version.
5. Writing to unique temporary files next to the destination, verification of the ZIP against the build, and paired replacement. If replacing the checksum fails, the previous ZIP is restored.
6. Destinations that are identical to each other or located inside the build are rejected before writing.

## Consequences

- The ZIP weighs ~514 kB instead of ~146 kB; in exchange, its SHA-256 is reproducible for the same build.
- If Vite ever emits more chunks, images or fonts, the packager fails with an explicit message and the list will have to be extended based on the Vite manifest.
- The URL in a subdirectory must end with a slash (`/AnalogOS/`); common static hosting services redirect automatically.
- Opening `index.html` with `file://` is not guaranteed to work.

## Limits

- There is no atomicity in the face of a power outage or a `kill` between the two renames: the ZIP and the checksum can end up out of sync, and `shasum -a 256 -c SHA256SUMS.txt` detects it. An interrupted process may leave `.analogos-chile-static.zip.*.tmp` temporary files in `submission/`.
- The determinism applies to the ZIP with respect to the build. Whether two machines produce the same build depends on the versions pinned in `package-lock.json`.
- The packager does not publish anything: deployment remains a human action.
