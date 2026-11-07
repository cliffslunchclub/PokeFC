# Secondary repository consolidation

Primary development and all PR CI: https://github.com/cliffslunchclub/PokeFC
Secondary snapshot audited: `bc43f23f0ab49c9937067de3d9eb04bc09124491`.

## Useful work migrated

- `tests/test-quick-seed-compat.cjs`: current-PSE deterministic repeatability, official goal/score reconciliation, consistent statistics and distinct seeded outputs, replacing retired v0.8b hashes.
- `tests/test-calibration.cjs`: distinguishes save events from goals and preserves strict verified-reference validation, provisional calibration, metric/fitting and holdout checks.
- `.github/workflows/pse-stress.yml`: manual, read-only stress/calibration and full-season checks, pinned action revisions.
- The current primary already contains the dynamic onside movement fix, receiver-first possession, ball sprite, fullscreen, handoff, knockout, wall/keeper and browser QA work represented by the experimental branches. Older runtime copies were not used to overwrite newer primary code.
- Pinned browser tooling and read-only/cancellable QA safeguards are adopted for the new official-save workflow. Secondary mirror-only production bans are not applicable to the primary deployment repository.

## Preserved historical work

All 13 heads were enumerated and their trees/history inspected against secondary main. Experiment heads contain historical standalone Watch prototypes and superseded tests, not new authoritative PSE logic. Their full histories remain accessible in the archived secondary repository; no branches or commits are deleted. The pinned refs below make those experiments recoverable without importing obsolete runtime implementations. `gh-pages` is generated output, not a source of unique game logic. Attribution/licence notices already present in the primary remain in force.

| Branch | Pinned commit |
| --- | --- |
| `archive/phase10-experiments-20261105` | `c0bf432bd558cbae507d66f73dde0184f605c5de` |
| `archive/pre-full-game-mirror-20261106` | `1854a4acb1fedfae713c22f0a8071bde7db53e69` |
| `chore/public-ci-safeguards` | `486a2894dfffcd165aae1803762fbf06a0856e33` |
| `experiment/phase10-isometric-match-director` | `a7d2005a9fac7b20a601cf7c4a023d187a228a19` |
| `experiment/phase10-knockout-baseline` | `520d3fda8e38a9f034492efb4e6673a3fa473b58` |
| `experiment/phase10-pokemon-sprites` | `7e0a01bd3c5f37626f221e20438ce1763038d9df` |
| `experiment/phase10-watch-handoff-browser` | `58a5f67dfaf47297920202522c5e00f81a7b24ba` |
| `feature/full-public-pokefc-mirror-20261106` | `1acd58c7b54e339f05c3aeeee89b3bd75d2665ad` |
| `fix/dynamic-onside-movement` | `0fbf953275b3c7e2e2789cd9051d3eb28f7163b9` |
| `gh-pages` | `aef3a1ffb4f8366582c58db16d192d912ed1a802` |
| `main` | `bc43f23f0ab49c9937067de3d9eb04bc09124491` |
| `mirror/full-pokefc-game-20261106` | `0c9c0a7769a1083b8936145999a9e1770c0c371a` |
| `test/phase10-inline-2p5d` | `e745a0094d9ef52e44d7e172c1af7033be46cb32` |

## Archive status

Archive the secondary repository only after this preservation/migration branch is published and checked. Archiving is administrative and does not merge this PR or deploy the primary. No production approval is implied by this consolidation.
