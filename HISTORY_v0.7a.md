# PokeFC v0.7a — Watch → Quick Sim Hybrid Alpha

**Local-only prototype.** Nothing has been uploaded to SiteGround or
GitHub. Your franchise is stored locally in your browser, with optional JSON
save export/import. The original 251-species data and attribute formulas have
not changed.

## New in v0.7a: one-way mid-match switch

1. Start a franchise and enter **Tactical Viewer**.
2. Pick **TacticMesh · Real physics** before kickoff, then **Play**.
3. At any point, select **Finish with Quick Sim** and confirm.
4. The worker freezes the real match, verifies its score against genuine goal
   events, and passes the actual elapsed time, player minutes, goals, assists,
   cards, team stats, active players and stamina to a deterministic statistical
   continuation that simulates only the **remaining** regulation minutes.
5. Check the merged result and click **Record result & finish week**. Your
   result is applied exactly once; the other seven fixtures are Quick Sim.

The starting-mode dropdown locks after the physics match begins. Use the
**Finish with Quick Sim** button—not the dropdown—to change modes. This is a
one-way switch; a statistical continuation cannot reconstruct the exact
physics state. **Replay** starts a new run of the original seeded TacticMesh
match; it does not undo a recorded result.

**Alternative:** **Complete with full TacticMesh (slower)** still runs the
original physics engine to full time without using Quick Sim.

### Verification and limitations

- **Passed:** deterministic continuation, prior goal ledger and score
  preserved, yellow/red card state preserved in the merged report, sent-off
  players excluded from subsequent play, accumulated shots/passes/saves and
  player minutes, score/event consistency checks, and no premature franchise
  commit. Existing career, bridge and worker protocol tests passed.
- **Passed with a mocked worker:** local browser interaction from 63′ through
  hybrid result preview and one-time matchweek commit. This UI test is **not**
  proof of a full live TacticMesh physics match.
- **Still unverified:** full 90-minute TacticMesh run in this environment,
  because pinned vendor modules require a one-time local installation.
- The Quick Sim continuation is **not yet calibrated** to real TacticMesh
  distributions. Injuries, new cards, and bench substitutions are not yet
  simulated in the remaining-minute model. Historic cards and the active XI
  are carried forward; league suspensions and longer-term fatigue are not yet
  wired into the franchise economy.
- TacticMesh cannot yet validate shots on target in its official report;
  these remain **unavailable**, not invented.

## How to run locally

Use a terminal / command prompt in this extracted game folder.

**1. Install the original TacticMesh engine once:**

```sh
python3 tacticmesh/install_engine.py
```

This downloads 11 unchanged JavaScript modules, the upstream MIT license,
and THIRD_PARTY_NOTICES from pinned commit
`603312dcf037bed0b0c817f8ba8a194eaebce8da` of
<https://github.com/noddy703/tacticmesh>. Once installed, **running and
playing the game does not need internet**.

If you already downloaded or cloned the TacticMesh repository, you can
install completely offline instead:

```sh
python3 tacticmesh/install_engine.py --source /your/local/path/to/tacticmesh
```

**2. Run the local browser server:**

```sh
python3 run_local.py
```

Open <http://127.0.0.1:8765/>. Keep the terminal open while playing. Windows
users can generally use `py` instead of `python3`.

**3. Start a franchise → Tactical Viewer → “TacticMesh · Real physics”.**

Select Play (1×, 4×, 16×), Pause, Replay (restarts the same seeded match),
or Complete with full TacticMesh (runs the **full TacticMesh simulation**, not Quick Sim, to
full time as fast as possible). Finally select **Record TacticMesh Result** to
apply that match, complete the other seven fixtures with Quick Sim and advance
the league by one week.

You can choose **Quick Sim · Schematic** for the previous instant-result
visualization, which still supports seeking and previewing a seeded outcome.

Do not open `index.html` directly using a `file://` URL for the real physics
mode: browsers generally require an HTTP origin for Web Workers and imports.
The included server binds only to 127.0.0.1 on your own computer.


## Test a complete 90-minute match

After installing the original TacticMesh source, run:

```sh
python3 run_90min_test.py
```

This executes one authentic franchise fixture for the full regulation match
using the official engine with live progress updates. The results, performance
timings, genuine goal-event validation and source statistics are written to
`benchmark-90min-results.json`. See `BENCHMARK_90MIN.md` for details.
This benchmark is separate from Quick Sim and never changes your save.

To identify performance bottlenecks before a full match:

```sh
python3 run_90min_test.py --profile-seconds=60
```

This creates `benchmark-profile-results.json`, explicitly marked as **not a
full-match validation**. For a full 90-minute run that saves a resumable
checkpoint every 15 game minutes:

```sh
python3 run_90min_test.py --checkpoint
```

If interrupted *after the first checkpoint*, resume with:

```sh
python3 run_90min_test.py --resume
```

The checkpoint is a local file in the game folder, not a browser save. It is
removed when a full match completes. Never edit the upstream engine or switch
versions between checkpoint and resume. See `BENCHMARK_90MIN.md`.

## What the TacticMesh connection does

- Maps each Pokémon's **46 TacticMesh attributes** from its individual generated
  detailed ratings and six headline ratings (including the existing IVs),
  with matching 0–1 TacticMesh personality/tendency values.
- Preserves stable individual Pokémon IDs, all 22 starting players and each
  club's tactics. Initial watch matches use a standard **4-3-3** formation.
- Sets a constant size (1.8m / 75kg) for every Pokémon so no Pokémon's
  Pokédex height or weight confers an advantage.
- Runs official TacticMesh world simulation, player AI, tactics, ball physics,
  match rules and event recording in a **separate local Web Worker**.
- Streams genuine player / ball positions and the authoritative engine score
  to the tactical board. No scripted movement is shown in real engine mode.
- Uses TacticMesh's event-based final report, translating actual goals,
  assists, shots, passes, possession, tackles, keeper shot-stops, minutes and
  ratings to the franchise result format, with no generated/fake goal events.
- Does not commit a result if the worker fails, a match is unfinished, or
  the final score disagrees with the event record.
- Leaves Quick Sim available separately for the other seven weekly fixtures.

## Important limitations

- **Official engine source is not bundled inside this ZIP.** The one-time
  installer is required before real TacticMesh matches can run. The code
  adapter, worker and UI are implemented, but a full end-to-end game with
  original TacticMesh physics could **not be verified in this environment**:
  network access for fetching its source was unavailable.
- Engine execution may be slow: the original model advances at 60 simulation
  ticks per match second (roughly 324,000 ticks for 90 minutes). Finish Match
  still uses physics and AI; it is **not instant**. The statistical Quick Sim
  remains instant and is not yet calibrated against TacticMesh results.
- TacticMesh's official validated standard report currently does **not**
  provide a reliable shots-on-target field or conventional keeper-save count.
  These fields are shown as “—” where unsupported; its shot-stop count is used
  for goalkeeper credit instead.
- This alpha has no user-editable lineup, substitutions, formation presets or
  in-match coaching overrides yet. 4-3-3 and starting XI are automatically
  selected using franchise role-suitability scores.
- There is currently no mid-match checkpoint persistence. Leaving or
  refreshing the page discards the unrecorded match; replay starts the same
  seeded fixture from kickoff.
- Real engine match integration is for regular-season user-club fixtures.
  Playoffs and non-user fixtures use the existing statistical simulator.
- Pokémon sprites, online multiplayer, persistent database, transfer market,
  richer coaching/contract systems and season-to-season calibration remain
  subsequent development work.

## Testing and source provenance

Run the local automated tests with Node 20+:

```sh
node tests/test-node.cjs
node tests/test-tm-bridge.cjs
node tests/test-tm-worker.cjs
```

These passed for season generation, 251 species, all 16 clubs, 176 league
fixtures, the Fantasy Draft, and adapter contracts for attributes, lineup,
size, match result/event attribution and unsupported report metrics.
**They are not a substitute for a live TacticMesh integration/performance
benchmark after installation.** Browser automation was restricted in the
build environment and is not claimed as completed.

TacticMesh is MIT licensed; original author Energen Games, with the original
copyright attribution preserved in the copied LICENSE. See the upstream
<https://github.com/noddy703/tacticmesh> and its THIRDPARTY notices. All
TacticMesh modules are used unchanged. Pokémon identities and characters
belong to their respective owners. This is an unofficial fan prototype.

## v0.6 mechanics retained from v0.6b

251 Gen I–II species; Pokémon main ratings and IVs; 16 Kanto/Johto city
clubs; 22-game season; 8-team playoffs; random, Classic and 25-round Fantasy
Draft starts; 25-player senior squads + 5 initial Practice Squad members;
scouting; legendary frequency; autosave/export/import; old v0.5 Builder in
`legacy-v05/`. The existing quick-sim match engine remains unchanged.
