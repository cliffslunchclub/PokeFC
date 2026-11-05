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


## Inline 2.5D Quick Play viewport — implementation checkpoint

On the development branch, `/play/?watch=soccerjs` now **mounts Soccer-JS inside the existing LIVE MATCH CENTER pitch panel**. The flat `#matchPitch` canvas is hidden only while the opt-in Watch is active. The game page owns the scoreboard, play/pause/speed, **Sim to End**, one-time **Record Official Result**, Cancel Watch, Isometric/Broadcast/Top-down projection, and Wide/Follow-ball framing. The iframe renders **only the angled pitch** (no duplicate demo menus or modal overlay). Finished 2.5D play remains visible after recording until the next match.

The viewer loads in `?embedded=1&inline=1`, announces its camera mode, accepts same-origin control messages, and reports only official Quick Sim scoring changes. The bridge rejects non-isometric startup, score mismatches, and mismatched iframe origins/sources. The existing legacy Watch route remains untouched outside the test flag.

Run the new headless state-machine regression (no Chromium/native rendering required):

```sh
node watch/soccerjs/test-inline-bridge.cjs
```

To validate the **opt-in staging distribution** without changing the normal SiteGround build:

```sh
bash watch/soccerjs/build-local.sh
PFC_INCLUDE_SOCCERJS=1 bash scripts/build-siteground.sh
python3 -m http.server 8765 --directory dist
```

Then open `http://127.0.0.1:8765/play/?watch=soccerjs`; regular `/play/` still uses the existing Watch implementation. The bundle and native Soccer-JS assets are only included when `PFC_INCLUDE_SOCCERJS=1`. Do **not** set this flag for production until the actual browser regression passes.

**Verification limit:** the old public workflow has a passing native Soccer-JS browser artifact, and the current inline-bridge state machine passed source-level tests. The latest inline viewer bundle has not yet been built or screenshot-verified in this environment: upstream network access and local Chromium navigation were blocked. This is not proof of a live SiteGround deployment or successful fully integrated 2.5D rendering.
