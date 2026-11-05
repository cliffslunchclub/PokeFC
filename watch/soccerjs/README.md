# Soccer-JS Watch — development-only integration

This directory is a clean reconstruction from the preserved experimental source of [closed PR #11](https://github.com/cliffslunchclub/PokeFC/pull/11). Its current purpose is **isolated testing**, not production deployment. Main branch, SiteGround deploy allowlist, live Challenges and Franchise remain untouched.

## Architecture

- `../../quick-sim.js` decides every official score, scorer, assist, save and player/team statistic **before** the Watch starts.
- `watch-bridge.js` validates the immutable match payload, communicates with the same-origin viewer, supports Watch → Sim to End, and records only when the user explicitly clicks Record. Closing without recording does not advance a save.
- `viewer-entry.cjs` draws with Soccer-JS's native renderer and the Pokémon sprite helpers. It must call `sim.renderAll(ctx)` but never `sim.updateAll()` or make new official scoring decisions.
- `phase10-motion.cjs` creates deterministic **illustrative** movements and marks them as such. Only goals from Quick Sim have official timestamps.
- The original upstream Soccer-JS revision is pinned to `haeretici/soccer-js@38970e0dade0865078c9e84bc1ecfd72aaa02fde` (MIT license retained in local build).
- Sprites and Pokémon IP have separate rights considerations; verify them before distribution.

## Build and test locally

On a machine with Node/npm, Git and Python installed, from the private PokeFC repository root:

```bash
node tests/test-phase10-director.cjs
node watch/soccerjs/test-public-fixture.cjs
node watch/soccerjs/test-isometric-motion.cjs
node watch/soccerjs/test-handoff.cjs
bash watch/soccerjs/build-local.sh
python3 -m http.server 8765 --directory .
```

Open:
- `http://127.0.0.1:8765/play/?watch=soccerjs` — the **opt-in** Quick Play integration. Create or auto-fill a Free Builder XI. When the development bridge finishes loading, Watch launches Soccer-JS. The inline match center and Challenge match events remain untouched until you explicitly record the official result.
- `http://127.0.0.1:8765/watch/soccerjs/dist/` — standalone renderer using a known 2–1 sample.

**Important:** `/play/` without `?watch=soccerjs` still uses the currently deployed legacy TacticMesh Watch path. The SiteGround build does **not** include `watch/soccerjs` or compiled viewer assets; the opt-in flag is for an independently served developer checkout. Do not claim this feature is live until the production asset pipeline is updated and browser tests pass.

## Runtime and test status (Nov 5, 2026)

In an isolated JavaScript V8 execution environment using the actual GitHub source, 220 current Quick Sim results passed the Match Director test: 4,704 shots, 1,863 saves and 450 goals reconciled, without mutation.

A further 220 Quick Sim results passed the Watch bridge `snapshot` / `scoreAt` validation: 4,758 shots, 489 goals; no score drift, input mutation, or exceptions. A known 2–1 replay produced 0–0 → 1–0 → 2–0 → 2–1 at the official timestamps. The Play integration, viewer entry and motion module passed JavaScript syntax checks.

**Not yet verified in this rebuild:** browser-loaded Soccer-JS bundle, current Play DOM click-through, current Challenges v2 and Franchise regression, SiteGround bundling, mobile controls/performance, extra time and penalty shootouts. No private GitHub Actions ran.

## Next review steps

1. Verify `bash watch/soccerjs/build-local.sh` with the pinned upstream assets on a machine with internet access.
2. Run real Chromium Play 90-minute smoke tests and watch/cancel/record-once tests, using the public simulation repository for any repeatable heavy browser tests.
3. Make the renderer assets deployable in a controlled branch-only build; verify all relative URLs and same-origin messaging.
4. Keep TacticMesh as a temporary fallback only until the new renderer passes all modes; remove it in a separate cleanup.
5. Implement Challenge / Franchise integration after preserving current v2 report, saved run and tournament behavior.
