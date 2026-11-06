# PokéFC

Unofficial Pokémon-themed football management and match-play project. **Private product source** lives in this repository; the public research/test harness lives in [pokefc-simulation](https://github.com/cliffslunchclub/pokefc-simulation).

**Public alpha:** https://pfc.cliffslunchclub.com/  
**Last status review:** 2026-11-05 — TacticMesh retired in merged PR #60; SiteGround deployment #184 succeeded.  
**Authoritative roadmap:** [DEVELOPMENT_TODO.md](DEVELOPMENT_TODO.md)

> **Important distinction:** “Available” below means implemented on the current `main` deployment path, not a claim of newly verified live-site availability. An experimental branch/PR is **not deployed** until merged and verified through the SiteGround workflow.

## Available on `main` — current game

| Area | Implemented features | Scope / limits |
| --- | --- | --- |
| **Home / XI Builder** (`/`) | Search and assemble an XI, five formations, Pokémon sprites/artwork, position-based XI grades, autosave and copy/export options | **1,025 National Dex base species (Gen I–IX)**; browser-local data |
| **Quick Play** (`/play/`) | Gym/Elite Four/Champion exhibitions, instant Quick Sim and **default native Soccer-JS 2.5D Watch**, with isometric/broadcast/top-down cameras, pause/speed and Watch → Sim to End | Uses locally saved XI; Soccer-JS is the sole Watch renderer |
| **Challenges** (`/challenge/`) | Classic Gen I–IV or National Gen I–IX, six-boss Gauntlet, four local leaderboard categories, animated scouting reels, type/generation rerolls, S–D positional tiers, 11-player XI, ₽1,000 item shop, Mega/Primal handling, item assignment and AI Auto-Equip, boss scouting, match/event reports, victory/result and Pokémon detail dialogs, responsive draft and movable desktop panels, downloadable result card | Locked boss matches use native **2.5D Soccer-JS Watch**; local saves/leaderboards, one-record progression; provisional seeded shootout resolver pending true extra-time/penalty rules |
| **Franchise** (`/franchise/`) | 32 Gym clubs across Kanto/Johto/Hoenn/Sinnoh, 22 league matches per club (352 fixtures), 16-club playoffs, 25 senior roster slots and up to 10 Practice Squad spots (five initial prospects), drafting, scouting, training/progression, season rollover, Quick Sim and **default 2.5D Soccer-JS Tactical Viewer**, save export/import | **493 Gen I–IV species** remain pinned to existing saves; one explicit Record advances a week, optional read-only Quick Sim schematic |

**Match rules: [Enclosed PokéFC pitch](docs/POKEFC-ENCLOSED-PITCH.md).** Continuous soccer without throw-ins, corners, fouls, free kicks or in-match penalties. Standing challenges and goals remain; tied knockout matches still use separate penalty shootouts.

**Current match engine: PokéFC Sim Engine (PSE)**, implemented in `quick-sim.js`, exclusively determines official score, goal ledger, stats and saved result. **Quick Sim** remains the user-facing instant-simulation action; PSE is the engine behind it. The native Soccer-JS 2.5D renderer visualizes those authoritative results in Quick Play, Challenges and Franchise, with **Watch → Sim to End** and explicit one-time Record/Cancel. TacticMesh is retired from the active build; its previous source remains accessible in Git history. Match commentary and final recorded events share one timeline.

**Known limits:** browser-local records (no verified online accounts or cross-user rankings); incomplete 90-minute calibration parity; official 120-minute extra time and shootouts implemented with further balance/long-play QA needed; alternate regional/cosmetic forms aren't all separate player choices. Art rights must be reviewed before commercial distribution.

## 2.5D Watch rollout and remaining development

- **Soccer-JS 2.5D is the deployed primary Watch**, through merged [PR #21](https://github.com/cliffslunchclub/PokeFC/pull/21) (Quick Play opt-in), [PR #26](https://github.com/cliffslunchclub/PokeFC/pull/26) (Challenge/Franchise integration) and [PR #28](https://github.com/cliffslunchclub/PokeFC/pull/28) (Quick Play default). The [real desktop hosted-site browser run](https://github.com/cliffslunchclub/pokefc-simulation/actions/runs/42097420753) verified all three modes and save lifecycles; [native 390px mobile fixture run](https://github.com/cliffslunchclub/pokefc-simulation/actions/runs/42099546920) passed. Live hosted-mobile verification remains limited by intermittent HTTP 202 replies to cloud automation.
- **Match Director** includes deterministic read-only shot/goal visuals for the precomputed fixture. Movements other than official goal times are illustrative; natural full-match player and keeper movement remains subject to realism and long-play QA; official knockout and shootouts are implemented.
- **Final architecture:** PokéFC Sim Engine (PSE), invoked by Quick Sim, owns official match outcomes; Soccer-JS renders 2.5D in all three modes. TacticMesh was retired from the active runtime and removed from SiteGround by PR #60; see [retirement audit](docs/TACTICMESH-RETIREMENT.md).
- **One-way Watch → Sim to End** is the currently locked Soccer-JS UX. Mid-match **Sim → Watch** is not implemented. Tactical changes during a simulated match require a future resumable Quick Sim state API (start with halftime).

The old experimental [PR #11](https://github.com/cliffslunchclub/PokeFC/pull/11) is closed and unmerged. The public `pokefc-simulation` repo remains a test bed, not another product or public match page. Arcade/FIFA-like direct control remains a separate idea, not a shipped mode.

## Save and API compatibility

The `FXI_*` JavaScript namespaces and older `futbol-xi-*` browser-storage keys intentionally remain for existing saved careers. Franchise exports retain `PokeFC-v08-<seed>.json` conventions. Do not change save serialization, seeds, or player IDs as part of cosmetic housekeeping. See [product scope](docs/PRODUCT_SCOPE.md).

## Repository and deployment boundaries

The SiteGround build publishes the homepage, ratings explainer and the three playable modes; it additionally includes **only the embedded Soccer-JS iframe runtime assets** under `/watch/soccerjs/` for all modes' 2.5D Watch. There is **no separate Soccer-JS product page**. Standalone demos and research fixtures are not production routes. Historic TacticMesh and old game sources remain retrievable in Git history; useful PSE calibration materials stay in private source.

```sh
# From a checked-out private repository
bash scripts/build-siteground.sh
python3 -m http.server 8765 --directory dist

# Selected local validation (requires Node)
node tests/test-play.cjs
node tests/test-phase10-quickplay-lifecycle.cjs
node tests/test-challenge-soccerjs-watch.cjs
node tests/test-franchise-soccerjs-watch.cjs
node watch/soccerjs/test-inline-bridge.cjs
node tests/test-v08-league.cjs
node tests/test-challenge-gauntlet.cjs
```

Production deploy workflow: [`.github/workflows/deploy-siteground.yml`](.github/workflows/deploy-siteground.yml) on changes to specified runtime paths on `main`, with validation before FTPS publishing to the PokeFC **subdomain only**. See [SITEGROUND_DEPLOY.md](SITEGROUND_DEPLOY.md) for safeguards. The CI workflow now compiles the pinned native Soccer-JS assets and includes the allowlisted runtime during a validated deployment. Soccer-JS is the only active Watch path; Franchise retains an optional Quick Sim schematic. Challenges and Franchise use the same authoritative viewer. Research fixtures, stand-alone demos and private Quick Sim source are **not** copied to the webroot.

More detail: [development TODO](DEVELOPMENT_TODO.md) · [product scope](docs/PRODUCT_SCOPE.md) · [repository cleanup notes](docs/REPOSITORY_CLEANUP.md). v0.5–v0.8b1 version notes and benchmarks remain accessible in Git history.

Pokémon characters and artwork belong to their respective owners. PokéFC is an unofficial project, not affiliated with Pokémon or FIFA/EA.
