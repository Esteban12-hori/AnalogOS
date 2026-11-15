# Two-minute demonstration

**English** · [Español](DEMO_SCRIPT_2_MIN_ES.md)

## Preparation

- Serve the extracted `submission/analogos-static.zip` over HTTP, at the root or under `/AnalogOS/`, or run `npm run dev`.
- Use a window of at least 1280 × 800. The app opens in Explore, with the globe and the site carousel below.
- This script follows the integrated Explore/Mission interface and the team's planner and optional AI (ADR-013).
- Keep `docs/DISCOVERY_REPORT.md` available for questions about a specific window.
- For a live AI demonstration, use the configured deployment. The portable static ZIP supports the full manual workflow but does not include an AI server.

## 0:00–0:20 — Set the context

Show the pilot summary: snapshot v3, six candidates and one reference. Point out the preliminary-screening notice.

“This is AnalogOS, a pilot in Chile and Argentina. It is not a global search: it covers two test regions, 50 windows roughly 20 kilometers across, and approximately 22,000 square kilometers. This is preliminary screening with real data, not permission to use the land.”

## 0:20–0:45 — Globe and carousel

Point to the globe markers and site carousel: six candidates with their ranks, and Yungay separately marked REF.

“Each card is a shortlisted window, three per country. We show Yungay as a known reference, not as a discovery: it has no discovery rank.”

The 50 windows and search grid are available in the full site profile's Method tab. Filter the carousel by Argentina, then return to All.

“Filtering by country preserves the global discovery rank.”

## 0:45–1:15 — Examine a candidate

Select candidate #1. Open its full profile and the Origin tab.

“Similarity is 94.9, confidence is 77.5, and feasibility requires review. They are always separate. Origin and precedents shows where this result comes from: a grid window ranked first in the topographic preselection. It also states that the region has published precedents, with a sampling coordinate from a 2003 study about 20 kilometers from the center. We are not presenting it as a new discovery.”

Open Sources and the satellite context.

“This is a real Sentinel-2 image from December 2025, stored for offline use. Linear traces are visible: that is an observation to verify, not an identification.”

## 1:15–1:35 — Examine an Argentine candidate

Select candidate #4 in the carousel or on the globe.

“Its topography is similar to the Chilean candidates, but its similarity score is 63.9. The main reason appears in the breakdown: POWER assigns hundreds of millimeters of rainfall to its regional climate cell. That cell is much larger than the window, and the profile makes this limitation explicit. We did not adjust the weights to improve the result.”

## 1:35–1:50 — Reference and comparison

Select REF and open Compare in the full profile.

“Yungay scores 75.67, the same value as in our previous version. A higher candidate score does not make it a better test site: Yungay has two decades of field research behind it.”

## 1:50–2:00 — Close with evidence

Download the site JSON from the profile or Sources. In Method, open the 50 search windows and their recorded reasons.

“The evidence is exportable and auditable: each site retains its role, origin, and published precedents, and every search window records why it was included or excluded.”

## Optional mission demonstration

If time allows, switch to Mission, open Your mission, load the example, review the requirements, confirm, and evaluate. Use Go to Reading to inspect the explanation. Download the JSON or print the report from the result in Your mission.

For a focused demonstration, start from AR6 and choose Evaluate this sector. Enter this explicitly synthetic test brief:

> Demonstration test: evaluate Mars rover mobility and plan geological reconnaissance in the selected AR6 window. Required: regional median slope no greater than 9 degrees. Preferences: non-vegetated fraction of at least 95%, identifying mapped geological units, and checking traction in the field. Geology and traction are pending preferences, not measured requirements.

Request an AI draft only if the server is configured. Review and confirm the proposed requirements before evaluating. Verify that only AR6 is evaluated, then request highlighted reasons with geology enabled. Show the official sources and the field checks that remain outstanding. If AI is unavailable, enter the requirements manually; never present the example as a real mission specification.

## Quick answers

- **Did you discover new analog sites?** We do not claim that. We found windows worth reviewing in regions with published precedents.
- **Why only two regions?** This is a bounded pilot demonstrating the method with real data and explicit acquisition limits.
- **Why do Chilean candidates score above Yungay?** Their regional topography at approximately 480 m is closer to the Jezero reference. The score does not measure soil mechanics, access, or field-campaign history.
- **Can teams visit these sites?** That has not been established. Ownership, access, protected areas, and urban use still require territorial checks in both countries.
- **Does AI produce the ranking?** No. Similarity is calculated deterministically using a weighted geometric mean. Mission evaluates confirmed requirements. AI can draft requirements or highlight existing reasons on request; it does not generate scores or rank sites.
- **Does geology improve the similarity score?** No. Official SERNAGEOMIN and SEGEMAR maps provide a separate evidence layer and reconnaissance questions. Geological compatibility is not calibrated and does not enter the similarity score.
- **Does it work offline?** Yes, after installation or extraction and local serving of the portable package. The manual workflow uses bundled data and images. Online map tiles and AI are optional; the static ZIP has no AI endpoint.
