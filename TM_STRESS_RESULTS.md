# Genuine TacticMesh preliminary CPU stress — PokeFC v0.8 development

Status: **Partial-duration real-engine stress completed. Full 90-minute benchmark not yet completed.**

Testing used the original upstream TacticMesh modules from commit `603312dcf037bed0b0c817f8ba8a194eaebce8da`, evaluated in an isolated JavaScript V8 execution environment. The simulator ran actual `TF.engine.stepMatch()` calls at the original fixed 60-Hz simulation rate, with the original AI, physics, tactics, rules, and telemetry modules. This was **not** Quick Sim and was **not** a shortened clock. The test harness used TacticMesh's compiled fictional starter teams, not the PokeFC Gen IV bridge; the next local runner specifically exercises each regional Pokémon gym.

## Verified preliminary measurements

| Match seed | Real TacticMesh ticks | Simulated match time | Wall time | Effective ticks per real second | Live snapshots checked | Event records | Status |
|---|---:|---|---:|---:|---:|---:|---|
| 63716 | 7,200 | 2:00 | 17.42s | 413 | 12 | 96 | running without errors |
| 79243 | 7,200 | 2:00 | 18.34s | 393 | 12 | 97 | running without errors |
| **Total** | **14,400** | **4:00** | **35.76s** | **403 combined** | **24** | **193** | **partial stress pass** |

Each snapshot contained exactly 22 active players. Both partial results happened to be 0–0. No numerical extrapolation from this sample is considered a verified 90-minute measurement. These were isolated environmental timings, not a performance guarantee on a user's computer.

TacticMesh's true full match still requires a completed regulation run and auditable official match report. The genuine reference count is **0 completed 90-minute matches**; Quick Sim calibration remains provisional and has not been activated.

## Repeat genuine regional physics stress on a local machine

After installing pinned upstream source, run:

```sh
python3 tacticmesh/install_engine.py
python3 run_tm_stress.py --minutes 2 --regions all --no-install
```

This executes four *actual franchise lineup* mini-benchmarks (Kanto, Johto, Hoenn, Sinnoh) without changing game clocks, original physics or original Pokémon ratings. These runs are labeled *partial* and cannot qualify as 90-minute calibration references. `tm-stress/summary.json` and individual JSON profiles are generated only after real engine execution, never synthesized.

For the real 90-minute proof with resumable 15-minute checkpoints:

```sh
python3 run_90min_test.py --club=24 --checkpoint
```

For independently verified full-time reference matches distributed across all regions:

```sh
python3 run_calibration_local.py --matches 8 --no-install
```

These are intentionally expensive tests. The installed-source checks fail closed. Do not use partial-duration reports to calibrate Quick Sim.
