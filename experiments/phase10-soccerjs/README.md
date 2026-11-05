# PokéFC Phase 10 — Soccer-JS watched-match integration (EXPERIMENT)

**Status:** technically verified prototype, **not** the full production Watch ⇄ Quick Sim implementation.

This folder stages source from the PUBLIC `pokefc-simulation` technical proof on an isolated **private** feature branch. Its pinned reference is `haeretici/soccer-js@38970e0dade0865078c9e84bc1ecfd72aaa02fde` (MIT).

## What passed

- Public Chromium browser smoke test of original Soccer-JS player sprites, pitch, and ball.
- A real **Quick Sim v0.7b** 2–1 result: official goals displayed sequentially 1–0 → 2–0 → 2–1.
- Replay, seek, and skip preserve that original result.
- A separate public test showed an externally directed 120-minute timeline can feed native Soccer-JS entities without simulating new goals.
- The **private local exporter** now reproduces the exact public 2–1 fixture (score, individual goals/minutes, shot totals, full box score) from the same Quick Sim seed, without publishing engine source. That was checked without GitHub Actions.

## Experimental Watch → Quick Sim mode hooks (new)

Private staging now includes an opt-in, same-origin iframe bridge in `watch-bridge.js`. It supplies a **precomputed and immutable Quick Sim result** to the Soccer-JS renderer, then records that exact result when the user chooses **Sim to End → Record official result**.

- **Franchise:** Open `/franchise/?phase10=soccerjs`, select **Soccer-JS · Phase 10 test** in the Tactical Viewer. It uses `getTacticalPreview().result` and calls `simWeek()` only on explicit recording. The other 15 fixtures still follow the existing Quick Sim path.
- **Challenges:** From a locked Gauntlet team, use the existing **Watch Match** link to `/play/?challenge=1`. There is a new **Soccer-JS · Phase 10 test** button beside Quick Sim and TacticMesh. This uses the existing locked Challenge roster and `saveChallengeResult()` only after explicit recording.
- **Exhibition:** Open `/play/?phase10=soccerjs` to expose that same experimental button.
- **Cancel:** Closing the watch overlay before recording does not advance a week or resolve a challenge.
- **Handoff:** Pressing **Sim to End** reveals the existing 90-minute Quick Sim result. There is **no second simulation** and no change to official scorers/assists/stats. This is one-way replay handoff, not mid-match tactical re-simulation.
- **Current limits:** No cross-origin framing, match-event editing, 120-minute watched knockout gameplay or production deployment.

### Local mode integration trial

After running the local builder below, start the web server **from the private repo root**:

```sh
node experiments/phase10-soccerjs/test-handoff.cjs
bash experiments/phase10-soccerjs/build-local.sh
python3 -m http.server 8765 --directory .
```

Then open `http://localhost:8765/franchise/?phase10=soccerjs` (create/load a franchise and choose Tactical) or `http://localhost:8765/play/?phase10=soccerjs`. For Challenges, navigate to `/challenge/`, lock an XI and use its Watch link.

**Cost policy:** No private Actions CI runs; the iframe browser end-to-end test runs in the public repo:
https://github.com/cliffslunchclub/pokefc-simulation/actions/runs/41968855684
That run verified the original sprite assets, official 1–0 at 54', Sim to End 2–1, one result saved, and cancel without saving.

**Do not merge these opt-in HTML hooks into production until the experimental viewer assets are packaged in a deployment-safe location** and the actual Franchise/Challenges UIs pass complete browser playtests. The current production allowlist deliberately excludes `experiments/`.

## NOT yet implemented

- Dynamically triggering Watch from Franchise/Challenges with their current match state.
- Watch → Quick Sim or Quick Sim → Watch *during* a live match.
- Authentic pass, tackle, goalkeeper, and possession animations; the on-pitch movement is illustrative.
- A production 90-minute full-game animation runtime, substitutes/tactics changes, or performance coverage on mobile devices.
- Soccer-JS's own 90–120-minute or penalty shootout controller. Pure knockout-period rules have been tested separately in the public research repo.

## Local-only reproduction (no private GitHub Actions costs)

```sh
# From the private PokéFC repository root:
node experiments/phase10-soccerjs/test-public-fixture.cjs
node experiments/phase10-soccerjs/export-fixture.cjs --seed phase10-real-fixture-2
bash experiments/phase10-soccerjs/build-local.sh
python3 -m http.server 8765 --directory experiments/phase10-soccerjs/dist
```

Open `http://localhost:8765/`. Requires Git, Node/npm, and Python 3. The script retrieves a pinned, public Soccer-JS revision and includes its MIT license in the local-only browser build.

To export an arbitrary **existing PokéFC Quick Sim-compatible starting fixture**, save its `{ home, away, seed? }` object (two starting XIs, with original player stats) to JSON and run:

```sh
node experiments/phase10-soccerjs/export-fixture.cjs --preview ./your-fixture.json --seed example-seed
```

The exporter outputs only the teams' public labels/IDs/positions, completed match result, official goal ledger, team statistics, and player box stats. It does **not** publish private Quick Sim code. Keep fixtures private until reviewed for any sensitive names or other data.

After re-exporting, rerun `build-local.sh` to refresh `dist/fixture.json`.

## Integration boundaries

1. Private `quick-sim.js` is the **sole outcome authority**.
2. `match-director/timeline.js` is the experimental shot-ledger layer; the viewer currently uses the goal ledger and illustrative motion directly.
3. Soccer-JS `Simulator.renderAll()` draws; it must **not** advance `updateAll()` or independently determine goals.
4. The production `scripts/build-siteground.sh` uses an explicit allowlist and does **not** include `experiments/`.
5. No site deploys or private-repo GitHub Actions should be added for this prototype. All heavy CI/browser tests remain in PUBLIC `pokefc-simulation`.

## Public validation references

- Validated browser render: https://github.com/cliffslunchclub/pokefc-simulation/actions/runs/41965539911
- Knockout-period contract: https://github.com/cliffslunchclub/pokefc-simulation/actions/runs/41963569180
- Native renderer external-state proof: https://github.com/cliffslunchclub/pokefc-simulation/actions/runs/41963234553

**Next milestone:** Complete full browser playtests inside Franchise and the locked Challenge gauntlet, then create natural possession/shot/goalkeeper animation sequences and implement the eventual production Watch ↔ Quick Sim match-state contract.
