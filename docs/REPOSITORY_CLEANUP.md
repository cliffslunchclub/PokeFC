# PokéFC repository cleanup — November 5, 2026

## Completed
- Closed superseded PRs #31/#33 (replaced by #54), #35/#39/#43 (by #47), and #51 (by #52).
- Merged TM retirement PR #60 (73 source/runtime/old-version files removed); five CI workflows passed and [SiteGround deployment #184](https://github.com/cliffslunchclub/PokeFC/actions/runs/42155722741) confirmed FTPS deleted the retired TM directories and worker/bridge files.
- Root historical changelogs, v0.6–v0.8b1 TM benchmarks, the old MVP and broken TM-only local runners are removed from current source. Previous versions remain accessible in Git history. Active scope and compatible save keys are consolidated in [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md).
- PSE, Soccer-JS, both species databases, Franchise saves and read-only schematic, current CI, calibration data and separate Arcade test remain intact.

## Git branch-reference pruning
- An audit-friendly one-time GitHub workflow first records every branch name and tip SHA in a downloadable artifact.
- Its pruning script deletes a branch only if it belongs to a merged PR, its remote tip still exactly equals that PR's last head SHA, and there is no open PR using it.
- Protect `main`, all `archive/*` and `experiment/*` branches, and the historically divergent `feature/challenge-loss-penalties-drag` branch. PR #56 (result-screen replays) and other open PR heads remain protected.
- Skip closed-but-unmerged branches and any changed tip instead of risking unique commits. Never rewrite history or force-update a branch.
- Script can also be run with `bash scripts/prune-merged-branches.sh --dry-run`, then `--apply` using authenticated GitHub CLI if GitHub Actions lacks write permissions.
- The one-shot cleanup workflow triggers when introduced on `main`; future re-runs require an explicit manual dispatch.
