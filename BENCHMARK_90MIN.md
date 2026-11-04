# Full 90-minute TacticMesh benchmark (local only)

This tests a **real 90-minute match** with the FIFA/manager gameplay fixture:
Pewter City's starting XI against its matchweek-one opponent, 22 generated Pokémon,
franchise IVs and detailed attributes, mapped through PokeFC's TacticMesh adapter.
It uses unchanged upstream player AI, physics, 60 Hz match clock and official match report.
No simulated result is invented and no franchise save is modified.

From the extracted folder:

```sh
python3 tacticmesh/install_engine.py
python3 run_90min_test.py
```

If you already have an upstream TacticMesh source checkout, you can run the installation fully offline:

```sh
python3 tacticmesh/install_engine.py --source /path/to/tacticmesh
python3 run_90min_test.py
```

Requires Python 3 and Node.js 20+. The engine files need to be obtained once from the
official repository; no web account or deployment is required.

The test emits milestone timestamps every game minute, and writes
`benchmark-90min-results.json` on success **or** failure. The JSON includes the
real final score, number of source events, gameplay ticks, wall-clock time,
team and player report checks, and total processing throughput. Send that JSON
back to this chat to review performance and tune the viewer.

**Performance note:** A genuine 90-minute TacticMesh match processes roughly
324,000 AI/physics ticks, which can take many minutes on a single CPU. This is
intentionally different from PokeFC's fast statistical Quick Sim.

This benchmark is a development tool; it is not a substitute for verifying the
browser's Web Worker wiring and visual rendering separately.


## v0.6d performance and resilience tools

A quick, **genuine physics** profile (not a complete match):

```sh
python3 run_90min_test.py --profile-seconds=60
```

Creates `benchmark-profile-results.json` with `verifiedFullMatch:false` and
subsystem timings: `aiMs`, `tacticsMs`, `worldMs` and unclassified overhead.
For a slightly broader sample you can use `--profile-seconds=300`.

Full 90-minute test with checkpoint/resume:

```sh
python3 run_90min_test.py --checkpoint
python3 run_90min_test.py --resume  # only if the previous command was interrupted
```

The checkpoint will be saved locally every 15 in-game minutes as
`benchmark-90min-checkpoint.json`, and removed after full completion. The
upstream match identity and engine commit are checked before resuming. Do not
mix engine builds. A failure produces `benchmark-90min-results.json` with
`verified:false`, the error, progress, and measured subsystem timings. A
successful full run includes `verified:true`, elapsed time, official result,
team stats and a 90-minute trace.

**A one-minute TacticMesh baseline test performed during development took
approximately 8.5 seconds of compute time, about 7× faster than real match
clock.** The result was obtained from genuine upstream demo teams, not the
v0.6d fixture, and should not be mistaken for the missing full-length test.
Disabling core rendering snapshots made no meaningful difference in that
sample; optimizing the physics/AI workload requires an actual profiler trace.
