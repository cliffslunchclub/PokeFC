# Phase 10 — Match Director (small chunks)

## Chunk 1: deterministic shot/outcome ledger

**Branch:** `experiment/phase10-match-director` (not production).

`match-director/timeline.js` creates a read-only animation plan from an **existing completed Quick Sim result** and the same two starting lineups.

The plan has exactly one shot event per official shot. Every Quick Sim goal preserves its exact minute, scoring team, scorer, and assist. Every player's shot total, each team's shots on target, and all goalkeeper saves reconcile with the Quick Sim match report. It can be regenerated identically from the same seed and offers `eventsBetween(plan, startMinute, endMinute)` and `scoreAt(plan, minute)` for a future viewer.

**Important provenance limit:** Quick Sim v0.7b produces official *goal timestamps* and aggregated shot statistics. It does **not** produce real timestamps for missed/saved shots or a chronological passing/interception ledger. Chunk 1 creates deterministic **illustrative** placements for non-goal shots, explicitly identified as `source: "derived-from-quick-sim-totals"`. It does not claim these movements actually happened. Passing, possession, and tackles are **not** represented yet. The timeline contract says `coverage: "shots-and-goals-only"`.

```js
const quick = require('../quick-sim.js');
const director = require('./timeline.js');

const result = quick.simulate(fixture, { seed: 'fixture-100' });
const plan = director.build(fixture, result, { seed: 'fixture-100' });
director.validate(plan);                 // fail on any stat/score mismatch
director.eventsBetween(plan, 0, 5);     // opening five game-minutes
director.scoreAt(plan, 45);             // official score at halftime
director.scoreAt(plan, 90);             // same score as Quick Sim
```

Run locally from repository root:

```sh
node tests/test-phase10-director.cjs
node tests/test-quick-seed-compat.cjs
node scripts/demo-phase10.cjs
```

## Explicitly not done in chunk 1

- No modifications to `quick-sim.js`, `hybrid-sim.js`, or production/game files.
- No TacticMesh physics, stadium rendering, or full 22-player animation yet.
- No UI integration, tactical changes, substitutions, or Watch ↔ Quick Sim handoff.
- No claim that inferred shot timestamps or movement are official historical events.

## Next small chunk — 10B-1

Build a **single five-minute visual clip** in a separate Match Director adapter: use TacticMesh movement/positions and ball interpolation to portray one immutable shot event, then verify a skip/replay results in exactly the same official score. Don't give TacticMesh authority to create goals.

Only after this test should we begin a possession/pass-event director and full 90-minute viewing.
