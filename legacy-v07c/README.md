# PokeFC v0.7c — Local Calibration Runner + Match Audit

**Local-only Pokémon football-management prototype.** The existing game modes, original 251 Gen I/II Pokémon species, 16-club franchise, 22-match schedule, Fantasy Draft, fixed native Pokémon six-stat attribute mappings, IVs, TacticMesh viewer, and Watch → Quick Sim handoff are preserved.

## Start playing locally

1. Extract this folder.
2. In a terminal opened inside the extracted folder, run `python3 run_local.py`.
3. Open http://127.0.0.1:8765/ on this computer. Select a club → Tactical Viewer.
4. Quick Sim works immediately, fully offline. For genuine TacticMesh watched physics, first run `python3 tacticmesh/install_engine.py` (one-time source installation) or use `--source /your/local/TacticMesh` with a checked-out upstream source folder.

Browser data stays local; franchise saves can be exported/imported as JSON. Use an HTTP local origin so Web Workers can load correctly. **No GitHub PokeFC repo or SiteGround deployment.**

## What's actually new

**One shared statistical model** now drives the full 90-minute Quick Sim and supplies the rate parameters for the remaining minutes of a watched match when you select **Finish with Quick Sim**. Previously recorded TacticMesh scores, goals, assists, cards, elapsed time and player statistics stay intact. Remaining-minute results are seeded/deterministic. Franchise standings change only when you explicitly record a final match.

We've also added a reproducible **TacticMesh statistical calibration pipeline**. The local reference collector runs genuine full physics matches using pinned, unchanged TacticMesh modules, verifies authentic final goals and reports, then saves the data locally. Once there are at least eight verified full-length matches, the fitter attempts parameter tuning, evaluates on withheld matches, and activates the new profile only if it passes basic holdout safeguards.

**Calibration status: provisional.** This ZIP contains **zero completed, verified TacticMesh reference matches**. We have **not** achieved or claimed statistical parity yet. The held-out evaluation report is created only after actual source evidence exists. Prefer 32+ varied reference matches for meaningful early conclusions. These full physics simulations are CPU-intensive.

Official TacticMesh cannot currently provide fully validated shots on target or conventional saves, so those measures are excluded from calibration. Quick Sim still estimates them for gameplay and marks its method separately.

## One-command calibration (local only)

The following command verifies/installs the **exact pinned upstream TacticMesh sources**, runs eight authentic 90-minute physics matches (resuming any saved 15-game-minute checkpoints), audits the original official reports, compares Quick Sim, and attempts a fitted profile only if there are at least eight verified reports:

```sh
python3 run_calibration_local.py --matches 8
```

Requires Python 3 and Node.js 20+. Full physics matches are **CPU-intensive**. The official upstream source is downloaded just once; no PokeFC repository or website is created. If you already downloaded TacticMesh, an offline source option is supported:

```sh
python3 run_calibration_local.py --matches 8 --source /path/to/your/tacticmesh-checkout
```

For computers with spare CPU cores, `--jobs 2` can run two separate fixtures concurrently. Rerunning exactly the same command will validate completed original match reports and resume any interrupted checkpoint rather than replacing results. Use `--start 8 --matches 8` to collect eight **additional** independent fixtures. `--dry-run` only prints the planned steps.

Raw original event-based reports are saved under `calibration/reports/`, paired reference summaries under `calibration/references/`, and human-readable comparisons under `calibration/reference-comparison.json`. The saved source manifest is independently checked against Git object hashes pinned in `tacticmesh/source-lock.json`. Incorrectly altered stats, missing original reports and shortened matches are rejected.

If a profile passes held-out evaluation, it updates `calibration-profile.js` for **future** fixtures only. Existing recorded games are never rewritten. Eight results are only an experimental first fit; 32 or more varied matches would provide stronger confidence. A rejected fit leaves the provisional game parameters in place.

**Status in this release environment:** TacticMesh's source files could not be downloaded into the local container (network name resolution unavailable), so none of the eight real full-time matches were completed. The pipeline was tested without inventing reference data. Our game remains provisional. Run the local command above on a computer that has the engine installed or can download it.

## Tests

```sh
node tests/test-node.cjs
node tests/test-hybrid.cjs
node tests/test-calibration.cjs
node tests/test-provenance.cjs
node tests/test-tm-bridge.cjs
node tests/test-tm-worker.cjs
node tests/test-tm-handoff.cjs
```

A separate browser test uses a **mocked** TacticMesh worker to validate UI handoff/commit behavior; it does not verify a real full-length physics run. No full real-engine test has completed in this release environment because the official modules must be installed locally.

All code and data in this ZIP are intended for ongoing local prototyping. TacticMesh is by Energen Games and is MIT-licensed; source attribution/third-party notices are retained by its installer. Pokémon is third-party intellectual property and this is an unofficial fan project.
