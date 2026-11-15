# Submission Package — AnalogOS (Chile–Argentina pilot)

## Files to submit

- [PROJECT_PAGE_EN.md](PROJECT_PAGE_EN.md): main project text in English for evaluation.
- [PITCH_3_MIN_EN.md](PITCH_3_MIN_EN.md): three-minute spoken script in English.
- [DEMO_SCRIPT_2_MIN_EN.md](DEMO_SCRIPT_2_MIN_EN.md): English product walkthrough and optional AR6 mission example.
- Optional Spanish counterparts: [project page](PROJECT_PAGE_ES.md), [pitch](PITCH_3_MIN_ES.md), and [demo script](DEMO_SCRIPT_2_MIN_ES.md).
- `METHODOLOGY.md`: method, formulas, sources and limits.
- `RESULTS_AND_LIMITATIONS.md`: final table and correct reading.
- `ATTRIBUTIONS.md`: credits and data/software licenses.
- `TEAM.md`: template for team members, contributions and AI declaration.
- `VIDEO_SHOT_LIST.md`: backup recording plan.
- `JUDGING_CHECKLIST.md`: audit before submitting.
- `assets/analogos-production.jpg`: production screenshot used by the root README.
- `assets/analogos-pilot-overview.jpg`: historical capture of the pilot's first scientific review.
- `analogos-static.zip`: v3 static build ready to publish.
- `analogos-static.zip.sha256`: checksum of the v3 ZIP.
- Historical v2 files, which are not regenerated: `analogos-chile-static.zip`, `SHA256SUMS.txt` and the captures `assets/analogos-chile-*.jpg`.

## Central message

> AnalogOS does not say "this place is Mars". It says "this place deserves to be investigated for this test, for these reasons, with these limitations".

## Result that can be claimed

With the preliminary rover mobility profile and the `science-screening-v3` snapshot, a search over 50 windows in two test regions of Chile and Argentina shortlisted six candidates. The three Chilean ones obtain between 90.35 and 94.87 similarity and the three Argentine ones between 49.43 and 63.85; Yungay, recalculated as a known reference, obtains 75.67 and is left out of the ranking. Confidence is around 77/100 and feasibility remains at “requires review” for all of them.

It cannot be claimed that any candidate is a new analog, that it is a better site than Yungay, or that the terrain is available: both regions have published precedents and the territorial cross-check is still missing.

## Starting the demo

```bash
cd analogos-chile
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`. For a demo without development tools, unzip `analogos-static.zip` on any static hosting, at the root or in a subdirectory such as `/AnalogOS/`: the build uses relative paths.

## Regenerating and checking the ZIP

From the repository root, with `npm install` done and the Python environment active:

```bash
npm run release:package
(cd submission && shasum -a 256 -c analogos-static.zip.sha256)
```

The current ZIP contains the compiled interface, its required assets, local basemaps, the v3 science snapshot, the seven stored Sentinel-2 images and the validated geological context. Its current SHA-256 is recorded in `analogos-static.zip.sha256`; the command above checks it against the actual archive. The archive is deterministic for the same build. The images are preliminary context from December 2025: they do not validate the sites or change the ranking. GIBS tiles are an optional online enhancement. The static package does not include the optional AI server. Test it over local HTTP in a subdirectory:

```bash
mkdir -p /tmp/analogos-demo/AnalogOS
unzip -o -q submission/analogos-static.zip -d /tmp/analogos-demo/AnalogOS
python3 -m http.server 8080 --bind 127.0.0.1 --directory /tmp/analogos-demo
```

Open `http://127.0.0.1:8080/AnalogOS/`. Opening `index.html` with `file://` is not guaranteed to work; the demo needs an HTTP server, even if it is local.
