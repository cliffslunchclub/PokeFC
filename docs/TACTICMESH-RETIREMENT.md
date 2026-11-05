# TacticMesh retirement plan — PokéFC

**Status (2026-11-05): NOT YET REMOVED.** This is the concrete cleanup checklist after the [Soccer-JS default PR #28](https://github.com/cliffslunchclub/PokeFC/pull/28). The canonical user-facing roadmap is [DEVELOPMENT_TODO.md](../DEVELOPMENT_TODO.md).

## Current shipped architecture

- **Quick Sim** (`quick-sim.js`) alone computes the official score, goals, stats and saves.
- **Soccer-JS 2.5D** is the primary Watch in Quick Play, locked Challenges and regular-season Franchise Tactical Viewer. Native public 2.5D renderer/390px mobile fixture checks [passed](https://github.com/cliffslunchclub/pokefc-simulation/actions/runs/42099546920); all three real desktop hosted game flows and single-record/Cancel checks [passed](https://github.com/cliffslunchclub/pokefc-simulation/actions/runs/42097420753).
- **TacticMesh is not authoritative for these default flows.** Quick Play offers the explicit temporary rollback `?watch=tacticmesh`; Franchise retains a Legacy TacticMesh selector.
- True user mobile hosted-site parity is **not yet verified** because the cloud-hosted test browser encountered intermittent HTTP 202 initial responses from SiteGround. The public fixture's mobile native renderer test did pass. Do not misstate this as an engine render failure or a live mobile pass.

## Release gate before deleting the fallback

- [x] Quick Play, Challenge and Franchise 2.5D default/locked view integrated in product `main`.
- [x] Score/result provenance: precomputed Quick Sim fixture, same-origin viewer, one-way Watch → Sim to End, no Sim → Watch, immutable official result.
- [x] One-time Challenge/Franchise record, single standings/XP/leaderboard update, cancel-without-save and repeat-match logic checks.
- [x] Native Soccer-JS Chromium 22-Pokémon isometric render, camera switching, sample 0–90' replay/seek and original red/white markers.
- [x] 390px mobile *fixture-level* native 2.5D field-fit/sprite/record check.
- [ ] Verify **hosted** Quick Play/Challenge/Franchise on an actual mobile device, including the alternate camera UI, Watch → Sim, record/cancel and no unexpected overflow.
- [ ] Long 90-minute watched playback and low-power mobile performance, pause/seek/reduced-motion and network/sprite offline fallback.
- [ ] Full regulation/knockout/extra-time/penalty result consistency. Existing Challenges seeded penalty tiebreak and Franchise seeded playoff tiebreak are provisional, not visualized native shootouts.
- [ ] Confirm a tested rollback for all modes, including a server/commit rollback if TM is physically removed, and capture export/import compatibility for existing Franchise saves.
- [ ] Review Pokémon sprite/image usage rights, Soccer-JS MIT notices and accessibility.

## Cleanup implementation slices (separate PRs)

1. **Disable legacy Watch selection only after gates above.**
   - Remove the `?watch=tacticmesh` link and old TacticMesh option from the Franchise selector only once safe.
   - Keep the Quick Sim schematic option where it genuinely adds useful functionality.
   - Do not remove the Watch → Sim button; it must continue to record the same immutable Quick Sim result.
2. **Delete no-longer-used active TM runtime imports/code.**
   - Quick Play: `play/play.js` TacticMesh `watchMatch` controller and `showSnapshot` adapter; remove `hybrid-sim.js` and `tm-engine-bridge.js` scripts from `play/index.html`.
   - Franchise: simplify `tactical-viewer.js` to schematic-only (or rename explicitly), eliminate TM-specific states, `tm-engine-bridge.js` and `hybrid-sim.js` script references from `franchise/index.html`. Keep `soccerjs-franchise-viewer.js` and official `career.js` simulation/record path unchanged.
   - Remove active root `tm-worker.js`, `tm-engine-bridge.js`, `hybrid-sim.js` and `tacticmesh/vendor/`, `tacticmesh/optimized/` only after all import/deploy references are gone.
   - Private archival history is already anchored in `archive/pre-cleanup-experiments-20261105`; do not erase historical git commits.
3. **Remove obsolete deployment dependencies and worker tests.**
   - `scripts/build-siteground.sh`: stop copying TM vendor/license/worker/bridge. Continue allowlisting only the required Soccer-JS bundle and MIT license.
   - `.github/workflows/deploy-siteground.yml`: drop TM-specific path triggers, copy assertions, and legacy physics/hybrid CI steps. Replace legacy `tests/test-challenge-watch-v1.cjs`, `tests/test-hybrid.cjs`, `tests/test-tm-worker.cjs` with coverage for the authoritative 2.5D Record and cancel paths.
   - Run all unaffected Builder, Challenge Gauntlet, League, Match Report and Franchise save/export/import regressions before shipping.
4. **Prove the deployed package has no active TM dependency.**
   - Use a non-destructive SiteGround build; verify no active HTML/JS references TM workers/vendor, no 404 resources and no unintended legacy routes.
   - Do not assume a source-tree deletion automatically removes historical files from the FTPS destination. Check the deployment action's sync state and verify remote files before claiming physical deletion.
   - Keep a rollback plan that restores a known-good commit and compatible local saves if browser QA finds a regression.

## Intentional non-goals

- Removing TacticMesh **does not** mean replacing authoritative Quick Sim with Soccer-JS physics. Soccer-JS remains a display/animation layer.
- Removing TacticMesh **does not** implement resumable tactical changes, FIFA-style manual Arcade control, full extra time or authentic PK animation.
- Avoid publishing private Quick Sim source, career saves or third-party rights-sensitive assets into the public simulation repository.

No deletion branch or PR is merged as of this document. TacticMesh remains operational until the release gates above are satisfied.
