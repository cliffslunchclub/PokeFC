# PokeFC v0.7b — Statistical Calibration Infrastructure

## Delivered

- `quick-sim.js`: shared deterministic, fast full-match statistical simulation, powered by the **existing six headline Pokémon stats and detailed TacticMesh-style attributes**. Does not use overall BST as a single rating.
- Replaced legacy career `calcMatch` internals with shared Quick Sim; the league scheduler, franchise save format and draft are retained.
- `hybrid-sim.js`: calibrated parameter fields shared with the full-game Quick Sim, including shots, goals, possession, passing, tackles, and assists. Existing TacticMesh prefix and score remain immutable.
- `calibration-profile.js`: deliberately **provisional** with **zero** verified real TacticMesh reference matches. No fake calibration numbers are installed.
- `tests/collect-tm-reference.cjs`: incremental local full-90-minute physics reference collection, pinned to upstream TacticMesh commit; source hashes verified; stored match-event goal ledger verified; resume checkpoints per 15 match minutes; supports multiple random and Classic league fixtures.
- `calibration-fit.js` and `tests/fit-profile.cjs`: aggregate ratio and conditional-possession fitting; train/holdout split; evaluated goal, shot, pass, completed pass, tackle and assist distributions. Refuses partial matches, missing goal events and mixed engine sources; rejects a candidate clearly worse than the initial model on holdout.
- New quick-sim and calibration tests, plus a repeatable mocked browser Watch → Quick Sim handoff test.

## Statistics caveats

- TacticMesh's official reports currently expose **shotStops**, not fully validated conventional saves or shots on target. These are **excluded from calibration**, not imputed or declared equivalent.
- The reference sample is empty until authentic complete 90-minute matches are run on a local machine. A full physics match is computationally expensive. Early calibration from 8 matches is experimental; 32+ diverse matches is recommended before tuning expectations.
- The v0.7b model is still **provisional** and no actual similarity percentage has been measured here.
- No player injuries, tactical substitutions or new cards are synthesized in midmatch Quick Sim; those are future match-rule tasks.

## Run

```
python3 run_local.py
node tests/test-node.cjs
node tests/test-hybrid.cjs
node tests/test-calibration.cjs
```

To obtain actual real-engine reference samples locally, install upstream engine once and collect incrementally:

```
python3 tacticmesh/install_engine.py
node tests/collect-tm-reference.cjs --start=0 --count=1
node tests/collect-tm-reference.cjs --start=1 --count=1
```

After at least 8 completed matches:

```
node tests/fit-profile.cjs
```

On a successful held-out comparison, that produces `calibration/calibration-evaluation.json`, `calibration/calibration-profile.json`, and updates `calibration-profile.js`. Refresh the local game to use the new profile **for future fixtures**. Existing recorded scores are never rewritten.

No GitHub repository has been created for PokeFC and nothing is hosted or deployed.
