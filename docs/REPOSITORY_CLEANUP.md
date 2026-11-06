# PokéFC repository cleanup — November 5, 2026

- Private product repo: `cliffslunchclub/PokeFC`; public research/test lab: `cliffslunchclub/pokefc-simulation`.
- Superseded PRs closed (unmerged): #31 and #33 → #54; #35, #39, #43 → #47; #51 → #52.
- Still open: PR #56, Challenges result-screen replays. Its code is not intentionally deleted; rebase after retirement as needed.
- Remove current-tree TacticMesh worker, bridge, vendor/optimized engine, hybrid continuation, TM-only tests, and obsolete v0.5/v0.7 complete game copies. All old code remains in Git history.
- Keep current PSE, Soccer-JS Watch, Franchise schematic, species data, active regressions, future calibration data and separate Arcade test workflow.
- No rewrite of `main` history, tags or archived commits; no branch force push.
- Pending: retirement PR checks, deployed browser QA, remote SiteGround TM artifact removal verification, optional stale branch ref pruning.
