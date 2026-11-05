# PokéFC — Development TODO / source-of-truth status

Updated: 2026-11-05. Scope: current `main` plus clearly labeled unmerged work. **Done** means merged into `main`; **staged** means code exists only in a draft branch; **planned** is not implemented. Do not infer live deployment from a draft PR.

## Implemented on `main`

- [x] National Gen I–IX (1,025 base species) Home XI Builder with formations, ratings, sprites, browser-local persistence.
- [x] Quick Play against Gym/Elite Four/Champion opponents with instant Quick Sim, **default Soccer-JS 2.5D Watch**, one-way Watch → Sim to End, and explicit legacy `?watch=tacticmesh` rollback.
- [x] Franchise Gen I–IV (493 species), 32 Gyms, 22-week season, 16-team playoffs, 25 senior + up to 10 Practice Squad, draft/scouting and save export/import.
- [x] Challenges Classic/National six-boss Gauntlet with local four-division leaderboards, downloadable results card, seeded match reports and saved run history.
- [x] Challenges S/A/B/C/D position tiers; rapid tier re-sort, hover-to-preview, animated three-stage scouting reels, one-time rerolls and locked team.
- [x] Challenges v2 full-pitch layout, movable desktop scouting picker, simplified mobile picker, collapsible/draggable Item Shop, player-details and boss-result dialogs, AI Auto-Equip and stat-filtered budget-aware items. Newer grouped goal/incident match timelines and match-first terminal recaps are merged.
- [x] Match timeline unified between live and recorded events, authentic scorer/assist/minute display, individual shots on goal when recorded, hidden redundant engine provenance badges while retaining underlying source metadata.
- [x] Challenges final-match-first recap: on elimination or completion show the actual last match result, authentic goals, penalties and match statistics first; continue to the tournament overview inside the same modal.
- [x] Goals-first expandable match timelines in Play/Challenges (other recorded events collapsed initially); save event provenance unchanged, with no invented set pieces.
- [x] Pokémon picker and Item Shop single-scroll desktop panels, reduced scroll redraw, visible scrollbar gutters and preserved item shop scroll position; mobile uses simplified full-screen dropdown draft.
- [x] Local and GitHub test/deployment workflow for the three primary game modes.
- [x] **Soccer-JS 2.5D primary Watch deployed in all three modes:** [PR #21](https://github.com/cliffslunchclub/PokeFC/pull/21) Quick Play, [PR #26](https://github.com/cliffslunchclub/PokeFC/pull/26) Challenges/Franchise, and [PR #28](https://github.com/cliffslunchclub/PokeFC/pull/28) Quick Play default. Real desktop SiteGround browser run [passed](https://github.com/cliffslunchclub/pokefc-simulation/actions/runs/42097420753), and native 390px mobile fixture test [passed](https://github.com/cliffslunchclub/pokefc-simulation/actions/runs/42099546920). Result/score/save-once and cancel-without-save regression tests passed.

## Current priorities — not yet fully implemented

- [ ] **P0 — Finish Soccer-JS parity before TM deletion**: all three desktop hosted modes and native mobile fixture now pass, and Quick Play default is deployed. **Still pending:** hosted mobile browser testing (cloud runner receives intermittent HTTP 202), sustained 90-minute pacing/low-end device performance, reduced motion, gameplay compatibility, full extra-time and penalty contract, and rights review.
- [ ] **P0 — Watch→Sim state integrity:** test 0–90' playback, seeking, pause/resume, skip, cancel-without-save, idempotent record, unchanged official score/box/events, reduced motion and errors in real browsers.
- [x] **SiteGround native runtime packaging**: CI builds pinned Soccer-JS MIT assets, allowlists the embedded iframe for all three game modes and tests Quick Play, Challenge and Franchise result integrity. TacticMesh fallback remains packaged until separately removed.
- [x] **P1 — Default Watch rollout:** all three modes now start Soccer-JS 2.5D; old Quick Play `?watch=tacticmesh` rollback still exists; previous real hosted desktop checks passed. Mobile hosted-site check remains unverified and is tracked separately.
- [x] **P1 — Challenges Watch integration:** locked boss XI/items route through Soccer-JS, and official Quick Sim result advances/archives the run once on Record; browser and source-mode regression passed. Terminal UI still requires ongoing mobile validation.
- [x] **P1 — Franchise 2.5D regular-season Tactical Viewer:** real Quick Sim precomputed result, correct species sprite IDs, 16-fixture matchweek saved once on Record; cancel/skip leave career unchanged. Existing 32-club schedule, draft, and saves preserved.
- [ ] **P1 — Franchise playoff Watch, extra time and shootouts:** playoffs presently resolve through Quick Sim/provisional seeded tie-breaking; full knockout Watch sequences remain unimplemented.
- [ ] **P1 — Remove TacticMesh:** pending final browser/mobile, knockouts/performance/rollback review. Retire old worker/vendor/fallback/deployment dependencies in a **separate** PR. See [retirement plan](docs/TACTICMESH-RETIREMENT.md). **Not yet removed.**
- [ ] **P1 — Natural Match Director:** coherent passing, possession, shooting and goalkeeper animation, with derived movements labeled illustrative and goals/statistics fixed by Quick Sim.

## Additional open work

- [ ] **Real match resumption/tactical changes:** design seeded continuation state (clock, score, events, stats, tactics, lineups, RNG), prototype halftime changes, then arbitrary-minute adjustments without re-simulating elapsed match.
- [ ] Full knockout extra-time and penalty-shootout rules, replacing provisional seeded tie resolution.
- [ ] Gen I–IX shared master dataset adoption across modes **without breaking Gen I–IV Franchise saves**; support/select alternate forms where appropriate.
- [ ] Independent multi-browser and touch/mobile accessibility review of Challenges picker, floating Item Shop and item drag/drop; preserve keyboard/touch and Pokémon-dropdown alternatives.
- [ ] More event types only if genuinely reported by the official match model; don't fabricate cards, keeper saves or major chances from aggregate totals.
- [ ] Better calibrated soccer attributes, deterministic balance tests, positional and item balance.
- [ ] Server-verified online leaderboard, accounts, authenticated sharing and anti-cheat (current leaderboard is local only).
- [ ] Evaluate a separate full-control Arcade concept; **not** a fourth product mode until prototyped and approved.
- [ ] Preserve compatibility with existing local Challenge/Franchise saves; add migration tests before changing serialized schemas.

## Repository hygiene

- [x] Soccer-JS PR #21 merged to `main` as one squashed feature commit, preserving existing `main` history and all newer Challenges UI changes.
- [x] Pruned the old public `gh-pages` standalone Soccer-JS demo (published assets removed; branch contains only `.nojekyll`). **Disable Pages in repository Settings** separately. The embedded game viewer is still required.
- [ ] Remove old merged feature branches and obsolete experimental branches only after verifying unmerged code/references are retained; branch deletion is separate from closing PRs.
- [x] Refreshed the private product README/TODO and public research README/TODO as separate canonical status documents. See [docs/REPOSITORY_CLEANUP.md](docs/REPOSITORY_CLEANUP.md).
