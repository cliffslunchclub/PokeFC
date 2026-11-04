# PokeFC v0.8b.1 — Stat definitions aligned

**New:** TacticMesh and Quick Sim share explicit definitions for pass attempts, completed passes, shot attempts, tackle attempts and successful tackles; forwards now challenge, too. Watch → Quick Sim preserves both tackle counters. See `CHANGES_v0.8b1.md` and `calibration/aligned-first-half-comparison.json`.

**Balance remains provisional.** The first-half dataset is genuine but cannot validate full-match statistical rates. Original physics engine and Pokémon ratings are unchanged.

# PokeFC v0.8b — Four-Region Calibration Diagnostics (Local Alpha)

**New this build:** genuine, SHA-verified TacticMesh physics segment measurements from Kanto, Johto, Hoenn and Sinnoh, plus 5,000 complete Quick Sim Monte Carlo runs, compared in `CALIBRATION_AUDIT_v0.8b.md` and `calibration/v08b-summary.json`. Run `node tests/test-calibration-diagnostics.cjs` to audit the shipped diagnostic records or `node tests/diagnose-quick-vs-tm.cjs --club=24 --minutes=2 --replicates=2000` to generate a fresh genuine-engine sample.

**Calibration remains provisional.** These are early-match partial observations, not complete TacticMesh references. No Quick Sim parameters, rating formulas or watched-match physics were modified. The original pinned engine is included.

---

# PokeFC v0.8 — Gen IV / 32 Gyms + Genuine TacticMesh Stress

Local-only playable prototype. No PokeFC GitHub repository, database server, SiteGround deployment or account service has been created.

## What works

- **493 National Pokédex species** from Gen I–IV: first 251 preserved from v0.7c, plus 242 default-form Gen III–IV species using PokeAPI base stats/types. IVs (0–31), levels, rating weights, development and detailed attribute variance remain unchanged.
- **32 gym clubs**, eight each in Kanto, Johto, Hoenn and Sinnoh. Each has a canonical leader and a signature Pokémon in Classic mode (Mossdeep gets Solrock + Lunatone). No legendary or mythical starters.
- **22-match regular season**: 14 in-region home/away and eight interregional opponents from all three other regions. Each gym plays once every matchweek; **352 total regular-season fixtures**.
- **16-gym playoff tournament**: best four finishers from each of four regions, 8 round-of-16 matches + 4 quarterfinals + 2 semifinals + 1 championship.
- **25-round, 32-team snake Fantasy Draft**: 800 selections, 25 senior Pokémon per club and five initial practice prospects (practice capacity 10). More than one athlete of the same species may exist across the league.
- Quick Sim, watchable TacticMesh tactical viewer (requires original pinned source), Watch → Quick Sim continuation, lineup previews, progression, scouting, season rollover and browser export/import.
- **Legacy v0.7c 16-team franchise** accessible from `legacy-v07c/index.html`. The new 32-team franchise uses a separate browser save key/version so previous local careers are not replaced. Existing 16-team saves are not automatically migrated to the 32-team world.

## Start locally

Extract ZIP and run `python3 run_local.py`, then browse to http://127.0.0.1:8765/ . Quick Sim works without internet. The original TacticMesh engine is only needed for real AI/physics watched matches. To install its pinned source once: `python3 tacticmesh/install_engine.py`. No publishing or accounts.

## TacticMesh stress tested in this turn

Original pinned TacticMesh source ran **two independent 2-minute physics/AI segments** (7,200 ticks each; **14,400 ticks total**), with no worker or engine exceptions, 22 active players per verified snapshot, and 35.76 seconds total processing time in that test environment. **This is NOT two completed matches or a verified full 90-minute result.** Those short samples used upstream fictional teams; `run_tm_stress.py` enables genuine four-region Pokémon lineup tests with locally installed source. Details: `TM_STRESS_RESULTS.md`.

Important: **zero completed, audited 90-minute original-engine reference reports**, so v0.8's statistical Quick Sim calibration remains provisional. Standard official TacticMesh reports do not validate conventional shots on target and saves; those cannot be used as calibration ground truth.

## Full 90-minute and regional stress tools

```sh
python3 tacticmesh/install_engine.py  # one-time source install (or --source /existing/local/TacticMesh)
python3 run_tm_stress.py --minutes 2 --regions all --no-install
python3 run_90min_test.py --club=24 --checkpoint
python3 run_calibration_local.py --matches 8 --no-install
```

The 90-minute benchmark can resume interrupted checkpoints with `python3 run_90min_test.py --club=24 --resume`. The 8-match collection is expensive and automatically verifies complete reports and canonical engine source before it will fit any parameters. No full match reference is bundled or fabricated.

## Automated tests

```sh
node tests/test-node.cjs
node tests/test-v08-league.cjs
node tests/test-hybrid.cjs
node tests/test-calibration.cjs
node tests/test-provenance.cjs
node tests/test-tm-bridge.cjs
node tests/test-tm-worker.cjs
node tests/test-tm-handoff.cjs
python3 tests/browser_v08_test.py
python3 tests/browser_handoff_test.py
```

`test-v08-league` verifies fixture uniqueness, three-season schedule rotation, Gen III–IV data, gym signatures, full 352-game season, postseason and saved-profile status. Browser physics handoff UI tests use a **mocked** TacticMesh worker and are not evidence that a full physical match completed.

## Source provenance and copyright

Base stats/types for additional Pokémon are from PokeAPI's `data/v2/csv/pokemon.csv`, `pokemon_stats.csv` and `pokemon_types.csv`, National Pokédex IDs #252–493 (default forms), incorporated into `species.js`. `gen3-4-stats.csv` and `tools-build-species.py` provide the retained intermediate reference and repeatable build. Pokémon characters/names belong to their respective owners; this is an unofficial noncommercial prototype. Original TacticMesh source is MIT licensed (Energen Games); its source-lock and license files are preserved by the installer. The full original upstream source is not redistributed in this ZIP; users install exact verified bytes from the official source for watched physics.

## Genuine first-half calibration audit

The added `run_45min_test.py` runs one actual 45-minute **first half** using the original, version-verified TacticMesh engine, stops at the engine's real halftime boundary, saves the event ledger and halftime checkpoint, and compares 5,000 full Quick Sim samples for the same Pokémon lineups. Use `--resume` to continue from the most recently saved 5-minute checkpoint. It never promotes a half-match to an official full-time calibration reference or changes the game's production match settings.
