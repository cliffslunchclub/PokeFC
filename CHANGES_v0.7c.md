# PokeFC v0.7c — Reference collection and integrity audit

## Implemented

- `run_calibration_local.py`: one-command, local-only, resumable batch of genuine 90-minute TacticMesh games. Optional concurrency and offline local source checkout; automatic reference audit and conditional fit.
- `tacticmesh/source-lock.json`: pinned upstream Git object hashes for 11 core/report modules and attribution notices, tied to TacticMesh commit `603312dcf037bed0b0c817f8ba8a194eaebce8da`.
- `tacticmesh/install_engine.py`: independently validates these source fingerprints, supports offline `--source`, and validates already-installed sources using `--check`. It stages a complete verified install before replacing local files.
- `tests/collect-tm-reference.cjs`: verifies pinned source hashes, saves the official raw TacticMesh full-match report alongside each reference, and checks report/summary consistency. Completed fixtures are reaudited on rerun; incomplete matches resume from previous checkpoints.
- `calibration-fit.js`: additionally validates team/stat alignment, goal timestamps, and exact consistency against the saved official report. Payload checksums detect accidental changes; they are **not** cryptographic proof of who generated a file.
- `tests/fit-profile.cjs`: refuses to fit from reference JSON without the corresponding original TacticMesh match report.
- `tests/report-calibration.cjs`: writes `calibration/reference-comparison.json`. Reports real-measured Quick Sim vs TacticMesh discrepancies **only** when genuine audited references exist.
- `tests/test-provenance.cjs`: new in-memory fixture tests (synthetic exclusively in tests) covering source manifest integrity and tamper/short-match rejection.

## Unchanged

- No Pokémon attribute formula, IV, Quick Sim gameplay rate, mid-match handoff, 16-club season structure, franchise save format or tactical viewer changes.
- No GitHub PokeFC repo, SiteGround deployment, or cloud runtime.

## Verified vs pending

- Passing: existing local franchise/hybrid/adapter/worker/calibration unit tests, new original-report provenance checks, one-command dry run, missing-source fail-closed and no-reference fail-closed checks.
- **Not verified:** completion of full 90-minute TacticMesh samples in this runtime, statistical parity, or a trained calibration profile. Network access to pinned upstream files is blocked in this container. `calibration/reference-comparison.json` intentionally reports zero authentic samples.

## Statistical comparability caveat

- TacticMesh's `shotStops` differs from Quick Sim's estimated `saves`. TacticMesh's conventional shots on target and individual interceptions are unavailable; none of those are fitted or represented as measured parity.
