# PokeFC v0.8 — Original TacticMesh Source Verification

Source provided by user as `tacticmesh-main.zip` and checked against the existing
PokeFC source lock. These **unmodified original TacticMesh source files** are
included under `tacticmesh/vendor/`, including the original LICENSE and
THIRD_PARTY_NOTICES.md.

- Upstream repository: https://github.com/noddy703/tacticmesh
- Pinned commit: `603312dcf037bed0b0c817f8ba8a194eaebce8da`
- Verification: all 13 vendor files matched pinned Git blob SHA-1 hashes;
  installed SHA-256 manifest written to `tacticmesh/vendor/installed.json`.
- How to verify locally: `python3 tacticmesh/install_engine.py --check`
- How to run one genuine match: `python3 run_full_match.py --club 24`
  (this packaged copy already includes verified upstream source; it does not need GitHub access).
- Match properties: original TacticMesh AI and physics at 60 ticks/second,
  full 90-minute regulation, actual Gen IV franchise lineups, no Quick Sim or shortened match clocks.

## Test results

See `benchmark-90min-results.json` if present. The full-match test is in
progress as of the initial source verification; do not assume it passed unless
that report explicitly states `verified: true` and `gameMinutes >= 90`.
