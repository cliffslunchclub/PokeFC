# Soccer-JS Watch rebuild — consolidated PokeFC plan
Updated: 2026-11-05

## Status
- Production `main` is unchanged by this branch.
- Closed, unmerged source PR: https://github.com/cliffslunchclub/PokeFC/pull/11
- Preserved source branch: `experiment/phase10-soccerjs-private-staging`; do **not** delete until the new implementation is verified.
- Active clean rebuild branch: `feature/soccerjs-watch-rebuild`, created from current `main` after the latest Challenges v2 merges.
- Heavy browser/engine tests belong in public `cliffslunchclub/pokefc-simulation`. Never publish private Quick Sim source or sensitive fixtures; do not enable heavy private Actions runs.

## Final architecture
1. **Quick Sim** is the exclusive authority for score, player statistics and saved match outcome across Quick Play, Challenges and Franchise. Lock a complete result before entering the initial Watch presentation.
2. **Match Director** produces deterministic visual events from official match data; label reconstructed shots/passes/movement illustrative. Do not invent official statistics or modify the locked result.
3. **Soccer-JS 2.5D** is the default Watch renderer; do not let its independent match simulation determine scores.
4. **Watch → Sim to End** is allowed at any minute and reveals the same authoritative result. Record exactly once; cancel must not mutate game state. No mid-match Sim → Watch.
5. Pokémon sprites use original game artwork, normalized at ~72 px in the experiment, with red home/white away Poké Ball-style numbered badges and carrier-only player names.
6. **TacticMesh removal** is the latest target decision. Existing TacticMesh must remain working until Soccer-JS is integrated and validated across game modes. Remove TacticMesh code, fallback UI and related deployment/test hooks in a distinct, reviewed cleanup step, not as an early regression risk.
7. Mid-match tactical changes and resumable Quick Sim are a **future feature**, not currently implemented; evaluate halftime restart first.
8. Fully controlled FIFA-like Arcade Mode remains exploratory and outside this integration branch.

## Small, independently reviewable implementation slices

- [x] Close experimental PR #11; retain its source branch.
- [x] Create clean branch from latest `main`.
- [x] Import the isolated deterministic shot/outcome Match Director at `match-director/timeline.js`.
- [x] Import its original regression test at `tests/test-phase10-director.cjs`.
- [x] Execute the recovered Match Director test against current Quick Sim in isolated V8 (220 seeds); Node CLI rerun remains part of local smoke validation.
- [x] Recover the isolated renderer source/build script in `watch/soccerjs/` with pinned upstream revision. **Compiled bundle, deploy-eligible packaging, browser tests and rights review pending.**
- [x] Stage the guarded Watch bridge with strict fixture checks and same-origin message protocol; 220 additional actual Quick Sim fixtures passed snapshot/scoreAt. **Browser cancel/record-once regression still pending.**
- [ ] Add sprite loader and 2.5D renderer with original species IDs, badges, carrier labels, and mobile/reduced-motion checks.
- [x] Add a gated Quick Play entry (`/play/?watch=soccerjs`) preserving the existing default TacticMesh route. **Full browser and knockout tests pending.**
- [ ] Integrate locked Challenge XI and progression without regressing v2 Gauntlet, scouting, item shop or saved results.
- [ ] Integrate Franchise Tactical Viewer and week advancement without duplicate saves.
- [ ] Upgrade Match Director to natural player/ball sequences while preserving official event provenance.
- [ ] Public browser smoke/regression tests and local full-game checks: result consistency, halftime/replay/skip, mobile, shootouts, save compatibility and no duplicate awards/progression.
- [ ] Switch Soccer-JS Watch on by default in all three modes; verify SiteGround build allowlist includes required assets and deploy safely.
- [ ] Remove TacticMesh completely **only after** parity/rollback criteria are met.
- [ ] Delete preserved experimental source branch when new changes are verified and all useful code has been recovered.

## Recovered first slice
`match-director/timeline.js` makes a deterministic read-only shot ledger from a completed Quick Sim fixture. It preserves official scorer/assist/minute and total player/team shots/saves. Other shot times are `derived-from-quick-sim-totals`, not actual events.

Manual local regression from repo root:

```sh
node tests/test-phase10-director.cjs
```

The isolated module and test were copied without integrating them into production files. Their existence on this branch does **not** assert that the test has passed against the current production head.

## Source-of-truth conflict resolution
The old experimental PR documented a *temporary manual TacticMesh fallback*. The newer consolidated design decision supersedes that as the **final product direction** (remove TacticMesh); however, temporarily keeping its working code during migration is necessary to prevent regressions.

Keep new changes narrow and mode-specific; do not merge the old 56-commit experimental PR or delete its branch prematurely.

## Implementation checkpoint — November 5, 2026

The clean branch now contains standalone Soccer-JS source, native-renderer loader, Pokémon badges/sprite helpers, motion generator, fixture exporter/test scripts, bridge, and opt-in Quick Play integration. See [watch/soccerjs/README.md](../watch/soccerjs/README.md) for build steps and validation details.

**Isolated V8 checks** ran the recovered Match Director test against the actual current Quick Sim code: 220 seeded matches, 4,704 shots, 1,863 saves, 450 goals reconciled. A separate 220-fixture Watch bridge check reconciled 4,758 shots and 489 goals, with no result mutation or drift. All relevant JS sources parsed successfully. These are logic checks, **not a visual browser test**.

The current SiteGround build intentionally does not copy or compile this experimental source. No production feature switch, Franchise/Challenge wiring, private CI or deploy is authorized by these commits.
