# PokeFC v0.8 — original TacticMesh 90-minute benchmark

**Goal:** use unchanged original TacticMesh source to play a full 90-minute Kanto/Johto/Hoenn/Sinnoh fixture and verify that the final goal log, score, and match report agree. This test does **not** use Quick Sim and does **not** alter your franchise saves.

## One-click start

- **Mac:** double-click `RUN_FULL_MATCH.command` (you may need to right-click > Open once).
- **Windows:** double-click `RUN_FULL_MATCH.bat`.
- **Terminal:** `python3 run_full_match.py`.

Prerequisites: Python 3 and Node.js 20+. Internet access is required **once** to download the pinned engine files from `raw.githubusercontent.com`. No GitHub account is needed. The installer verifies original Git blob hashes and SHA-256 values before executing the engine. If you already have a local checkout of the original repo, use `python3 run_full_match.py --source /path/to/tacticmesh`.

Default is a full 90-minute Sinnoh-region Pokémon fixture (`--club 24`). The benchmark records progress every match minute and saves a resumable checkpoint every 15 game minutes. Restart the script after an interruption to resume. Use `--fresh` to ignore a previously saved checkpoint; the file is not deleted.

On success it writes `benchmark-90min-results.json` with final score, official stats, tick count, elapsed processing time, and profiler breakdown. A full match requires about **324,000 engine ticks** plus potential stoppage. The previous isolated V8 stress test achieved ~400 ticks per wall-clock second, but performance on your computer may vary.

If download fails, the test **has not been completed**. Do not mistake partial smoke tests for a verified full 90-minute match.

Original source: https://github.com/noddy703/tacticmesh/tree/603312dcf037bed0b0c817f8ba8a194eaebce8da (MIT-licensed, Energen Games; original license available in downloaded source).
