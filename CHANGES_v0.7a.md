# Changes — PokeFC v0.7a

- Added `hybrid-sim.js`: deterministic remaining-minute statistical simulator.
- Added atomic `handoff` command to the local TacticMesh worker.
- Added worker extraction of official partial match statistics using
  `TF.productReports.reduce(handle)` (actual engine event archive).
- Preserves all pre-switch goals and assists, cards, minutes, current score,
  team and goalkeeper action totals, eligible active Pokémon and stamina.
- Added explicit one-way **Finish with Quick Sim** control and a separate
  **Complete with full TacticMesh** control.
- Corrected combined possession percentage to use weighted seconds.
- Added user-facing review/record step and locked starting-mode dropdown once
  live physics has begun; replay discards unrecorded result.
- Added hybrid correctness and worker handoff tests.
- Kept v0.6 save format compatible, base stats/IV/headline mappings unchanged.
- No hosting, repository or shared backend changes.

## Evidence

```
node tests/test-node.cjs
node tests/test-tm-bridge.cjs
node tests/test-tm-worker.cjs
node tests/test-tm-handoff.cjs
node tests/test-hybrid.cjs
```

All five passed on the development container. A browser end-to-end test with a
mocked TacticMesh worker passed. Actual upstream physics source is installed
only on the user's computer; the full live worker integration is pending
verification against those locally installed modules.
