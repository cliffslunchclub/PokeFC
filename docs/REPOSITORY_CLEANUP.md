# Repository cleanup inventory — 2026-11-05

## Intent and guardrails

- Product: `cliffslunchclub/PokeFC` (private). Public test lab: `cliffslunchclub/pokefc-simulation`.
- **Do not rewrite `main` history**. Preserve merged PR history and all production save contracts.
- Preserve the active draft Soccer-JS PR until replacement graphics and progression are browser-tested.
- The **retired public standalone Soccer-JS page** on `pokefc-simulation` `gh-pages` is different from the **required embedded 2.5D iframe HTML** at `watch/soccerjs/index.html` in draft PR #21.
- Existing historical TacticMesh/calibration source is excluded from the product deployment; don't confuse research files with live routes.

## Branch audit

### Private PokeFC (26 branches before cleanup)

- Keep: `main`, active `feature/soccerjs-watch-rebuild` (draft PR #21).
- Historic merged-PR feature branches can be deleted **from refs** after verifying their PRs are merged: `feature/challenge-compact-road-ratings`, `feature/challenge-item-sprites-primal-drag-fix`, `feature/challenge-live-event-commentary`, `feature/challenge-locked-opponent-sog-item-filters`, `feature/challenge-loss-penalties-drag`, `feature/challenge-opponent-pitch`, `feature/challenge-position-fit-effective-stats`, `feature/challenge-sprite-only-drag`, `feature/challenges-affordable-catalog-unique-rerolls`, `feature/challenges-compact-desktop-picker`, `feature/challenges-draggable-item-shop`, `feature/challenges-endmatch-recap-timeline-scroll`, `feature/challenges-gauntlet-match-actions-st-first`, `feature/challenges-native-modals`, `feature/challenges-player-sog-auto-equip`, `feature/challenges-shop-price-desc-alpha`, `feature/challenges-v2-draggable-picker-mobile-draft`, `feature/challenges-v2-full-pitch-floating-panels`, `feature/challenges-v2-result-and-pokemon-modals`, `feature/unified-match-timeline-no-provenance-tags`.
- Do **not** discard without preserving unique work: `experiment/phase9-dual-engine-calibration`, `experiment/phase10-match-director`, `experiment/phase10-soccerjs-overnight`, `experiment/phase10-soccerjs-private-staging`. These diverge from `main` and contain research commits; PR #11 was closed without merge. Compare or archive their unique files first.
- The old `feature/challenge-loss-penalties-drag` has diverged despite PR #5 being merged and PR #6 closed unmerged; ensure no desired PR #6-only changes remain before deleting.

### Public simulation repo (6 branches before cleanup)

- Keep `main` for public simulation CI and historical research.
- Research branches with unique commits: `experiment/phase10-isometric-match-director`, `experiment/phase10-knockout-baseline`, `experiment/phase10-pokemon-sprites`, `experiment/phase10-watch-handoff-browser`. **Do not delete** until relevant source, licenses, browser tests and any published artifacts have been preserved on the main research branch or as documented immutable commit SHAs.
- `gh-pages` contained the obsolete standalone Soccer-JS demonstration; retire its deployed HTML and JS/assets. Disable GitHub Pages in repository Settings if it should no longer serve any content.

## Commit strategy

- Keep existing product `main` commits for auditability, do not squash/rebase deployed history.
- Convert the active draft Soccer-JS work from dozens of incremental commits into **one reviewed feature commit rooted in current `main`**, preserving only required feature paths; revise PR #21 before merging.
- Avoid adding demo-only GitHub Pages assets/fixtures to the production SiteGround allowlist. Tests, images, and simulation source remain in the public repository.

Branch deletion must be performed by a GitHub reference-deletion-capable client; the currently connected GitHub actions support branch creation/update and file deletion but not branch-reference deletion. Do not claim stale refs are removed merely because the PR is closed.
