# Checklist before submitting

## Science and honesty

- [x] The MOLA reference is identified and versioned.
- [x] NASADEM is mosaicked and compared at an equivalent spatial scale.
- [x] Sentinel-2 L2A measures non-vegetated surface with an SCL mask and a monthly series.
- [x] Earthdata and Copernicus are authenticated; credentials are not versioned.
- [x] POWER is described as regional context.
- [x] Criteria without evidence are left out of the score.
- [x] Similarity, confidence, stability and feasibility are kept separate.
- [x] The result says “preliminary screening,” not “approved site.”
- [x] Candidates come from a documented grid search (50 windows), not from a manual list.
- [x] Yungay appears as a known reference, outside the ranking.
- [x] Windows with published coordinates are excluded and visible; no candidate is declared new.
- [ ] Complete the literature review of the Puna with full texts and coordinates.
- [ ] Compare the POWER climate context of the Argentine candidates with local data.
- [ ] Visually inspect the sites in NASA Worldview or recent imagery. (partial progress: Sentinel-2 view from December 2025 per site and observations in `docs/VISUAL_REVIEW.md`; recent imagery, territorial layers for both countries and expert review are still missing)
- [ ] Obtain a quick review from a person with geological or robotics experience, if available.

## Product

- [x] Ranking, map and sheet use the same snapshot.
- [x] Selection by ranking and map works.
- [x] Quick comparator available.
- [x] Downloadable JSON sheet.
- [x] Sources and auditable analysis are accessible.
- [x] App usable with keyboard for main actions.
- [x] Demo without APIs or WebGL.
- [x] Readable error state.

## Engineering

- [x] Shared JSON Schema contracts.
- [x] Deterministic pipeline and versioned files.
- [x] SHA-256 checksums in the manifest.
- [x] Python and web tests passing.
- [x] Static build generated.
- [x] Dependencies with no known vulnerabilities according to `npm audit`.
- [ ] Test `analogos-static.zip` on a second machine or hosting.
- [ ] Test public links in incognito mode.

## Delivery

- [x] Description in Spanish and English.
- [x] Three-minute pitch.
- [x] Demo script.
- [x] Main screenshot.
- [x] Attributions and license.
- [ ] Record and upload backup video.
- [ ] Add the public demo URL, repository and video to the project page.
- [ ] Complete team names and contributions.
- [ ] Submit with time to spare and save the receipt.

## Links the team must complete

- Public demo: https://analogos.vercel.app/
- Repository: `https://github.com/Esteban12-hori/AnalogOS` (verify that judges can access it before submitting)
- Video: `PENDING`
- Team members/contributions: `PENDING`
