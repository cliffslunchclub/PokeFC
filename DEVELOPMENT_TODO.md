# PokéFC — Development TODO / source-of-truth status

Updated: 2026-11-05. Scope: current `main` plus clearly labeled unmerged work. **Done** means merged into `main`; **staged** means code exists only in a draft branch; **planned** is not implemented. Do not infer live deployment from a draft PR.

## Implemented on `main`

- [x] National Gen I–IX (1,025 base species) Home XI Builder with formations, ratings, sprites, browser-local persistence.
- [x] Quick Play against Gym/Elite Four/Champion opponents with Quick Sim and legacy TacticMesh Watch → Sim to End.
- [x] Franchise Gen I–IV (493 species), 32 Gyms, 22-week season, 16-team playoffs, 25 senior + up to 10 Practice Squad, draft/scouting and save export/import.
- [x] Challenges Classic/National six-boss Gauntlet with local four-division leaderboards, downloadable results card, seeded match reports and saved run history.
- [x] Challenges S/A/B/C/D position tiers; rapid tier re-sort, hover-to-preview, animated three-stage scouting reels, one-time rerolls and locked team.
- [x] Challenges v2 full-pitch layout, movable desktop scouting picker, simplified mobile picker, collapsible/draggable Item Shop, player-details and boss-result dialogs, AI Auto-Equip and stat-filtered budget-aware items.
- [x] Match timeline unified between live and recorded events, authentic scorer/assist/minute display, individual shots on goal when recorded, hidden redundant engine provenance badges while retaining underlying source metadata.
- [x] Challenges final-match-first recap: on elimination or completion show the actual last match result, authentic goals, penalties and match statistics first; continue to the tournament overview inside the same modal.
- [x] Goals-first expandable match timelines in Play/Challenges (other recorded events collapsed initially); save event provenance unchanged, with no invented set pieces.
- [x] Pokémon picker and Item Shop single-scroll desktop panels, reduced scroll redraw, visible scrollbar gutters and preserved item shop scroll position; mobile uses simplified full-screen dropdown draft.
- [x] Local and GitHub test/deployment workflow for the three primary game modes.

## In development — draft PR, **not released**

- [ ] **P0 — Soccer-JS 2.5D renderer**: [PR #21](https://github.com/cliffslunchclub/PokeFC/pull/21) has isolated renderer/Match Director/Watch bridge and opt-in Quick Play inline 2.5D path. **Not done:** refresh against latest `main`, compile native Soccer-JS assets, visually validate real 2.5D with Pokémon, browser-test playback, phone performance, license/sprite coverage, and pass all Quick Play regressions.
- [ ] **P0 — Watch→Sim state integrity:** test 0–90' playback, seeking, pause/resume, skip, cancel-without-save, idempotent record, unchanged official score/box/events, reduced motion and errors in real browsers.
- [ ] **P1 — Production packaging and rollout:** artifact/license bundle, deploy allowlist, staged SiteGround verification, rollout/rollback flags, Quick Play first. Do **not** silently deploy experiments or run expensive private CI.
- [ ] **P1 — Challenges Watch integration:** preserve latest v2 UI, boss locked XI/items, victory and terminal run popups, timeline, four local leaderboard categories, save history, and one-only progression.
- [ ] **P1 — Franchise Watch integration:** preserve 32-club calendar, week results, tactical preview, save compatibility, full 90' results, playoffs, extra time and penalties.
- [ ] **P1 — Remove TacticMesh:** after Soccer-JS parity and rollback checks pass across all modes, delete old worker/vendor/fallback/deployment dependencies in a separate reviewed change. **Not yet removed.**
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

- [ ] Squash the active Soccer-JS development branch **without rewriting `main`**; verify it includes latest `main` timeline changes.
- [ ] Retire the public `gh-pages` standalone Soccer-JS demo (embedded `watch/soccerjs/index.html` inside the game is required and must **not** be removed).
- [ ] Remove old merged feature branches and obsolete experimental branches only after verifying unmerged code/references are retained; branch deletion is separate from closing PRs.
- [ ] Keep one canonical README/TODO per repository; research workflows/artifacts belong in the public simulation repo. See [docs/REPOSITORY_CLEANUP.md](docs/REPOSITORY_CLEANUP.md).
