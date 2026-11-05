# PokéFC Phase 10 — Soccer-JS watched-match integration (EXPERIMENT)

**Status:** technically verified prototype, **not** the full production Watch ⇄ Quick Sim implementation.

This folder stages source from the PUBLIC `pokefc-simulation` technical proof on an isolated **private** feature branch. Its pinned reference is `haeretici/soccer-js@38970e0dade0865078c9e84bc1ecfd72aaa02fde` (MIT).

## What passed

- Public Chromium browser smoke test of original Soccer-JS player sprites, pitch, and ball.
- A real **Quick Sim v0.7b** 2–1 result: official goals displayed sequentially 1–0 → 2–0 → 2–1.
- Replay, seek, and skip preserve that original result.
- A separate public test showed an externally directed 120-minute timeline can feed native Soccer-JS entities without simulating new goals.
- The **private local exporter** now reproduces the exact public 2–1 fixture (score, individual goals/minutes, shot totals, full box score) from the same Quick Sim seed, without publishing engine source. That was checked without GitHub Actions.

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

**Next milestone:** Call the exporter with a saved Franchise/Challenges match, direct a real five-minute sequence with the Match Director, and prove the score and player events agree when skipping or resuming.
