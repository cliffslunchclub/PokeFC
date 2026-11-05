# PokéFC

Unofficial Pokémon-themed football management and match-play project. **Private product source** lives in this repository; the public research/test harness lives in [pokefc-simulation](https://github.com/cliffslunchclub/pokefc-simulation).

**Public alpha:** https://pfc.cliffslunchclub.com/  
**Last status review:** 2026-11-05  
**Authoritative roadmap:** [DEVELOPMENT_TODO.md](DEVELOPMENT_TODO.md)

> **Important distinction:** “Available” below means implemented on the current `main` deployment path, not a claim of newly verified live-site availability. An experimental branch/PR is **not deployed** until merged and verified through the SiteGround workflow.

## Available on `main` — current game

| Area | Implemented features | Scope / limits |
| --- | --- | --- |
| **Home / XI Builder** (`/`) | Search and assemble an XI, five formations, Pokémon sprites/artwork, position-based XI grades, autosave and copy/export options | **1,025 National Dex base species (Gen I–IX)**; browser-local data |
| **Quick Play** (`/play/`) | Gym/Elite Four/Champion exhibitions, generated opposing lineups, instant **Quick Sim**, legacy TacticMesh Watch, pause/speed and Watch → Sim to End | Uses locally saved XI. **Current Watch screen is the old viewer**, not Soccer-JS 2.5D |
| **Challenges** (`/challenge/`) | Classic Gen I–IV or National Gen I–IX, six-boss Gauntlet, four local leaderboard categories, animated scouting reels, type/generation rerolls, S–D positional tiers, 11-player XI, ₽1,000 item shop, Mega/Primal handling, item assignment and AI Auto-Equip, boss scouting, match/event reports, victory/result and Pokémon detail dialogs, responsive draft and movable desktop panels, downloadable result card | Local saves/leaderboards only; seeded tie resolver until extra-time/PK logic is finished. Challenges v2 UI and recent unified match timeline are in `main` |
| **Franchise** (`/franchise/`) | 32 Gym clubs across Kanto/Johto/Hoenn/Sinnoh, 22 league matches per club (352 fixtures), 16-club playoffs, 25 senior roster slots and up to 10 Practice Squad spots (five initial prospects), drafting, scouting, training/progression, season rollover, Quick Sim and legacy Tactical Viewer, save export/import | **493 Gen I–IV species** intentionally remain pinned to existing career saves |

**Current match engine:** `quick-sim.js` produces immediate statistical results. Legacy TacticMesh Watch and the existing Watch → Sim continuation still run in current `main`. Match commentary and final events share one timeline; event provenance remains stored even when source chips are hidden.

**Known limits:** browser-local records (no verified online accounts or cross-user rankings); incomplete 90-minute calibration parity; no production-grade extra time/penalty shootout controller; alternate regional/cosmetic forms aren't all separate player choices. Art rights must be reviewed before commercial distribution.

## In development — **not** part of the public alpha yet

- **Soccer-JS 2.5D primary Watch** in the **draft** [PR #21](https://github.com/cliffslunchclub/PokeFC/pull/21) on `feature/soccerjs-watch-rebuild`. The private code includes isometric rendering, Pokémon sprite/badge components, a Quick Sim-authoritative Watch bridge, and an **opt-in** inline Quick Play test route `/play/?watch=soccerjs`. Native browser visuals, packaging and complete game-mode regressions remain **unverified for this rebuild**. The normal SiteGround build does **not** publish this branch or its test route.
- **Match Director** in that same draft: read-only deterministic shot/goal timeline; non-goal movements and timestamps are illustrative, not recorded official play.
- Target architecture: **Quick Sim owns official scores/results/stats; Soccer-JS renders the 2.5D Watch** for Quick Play, Challenges and Franchise. TacticMesh is to be **removed after** a fully tested replacement, not before.
- **One-way Watch → Sim to End** is the currently locked Soccer-JS UX. Mid-match **Sim → Watch** is not implemented. Tactical changes during a simulated match require a future resumable Quick Sim state API (start with halftime).

The old experimental [PR #11](https://github.com/cliffslunchclub/PokeFC/pull/11) is closed and unmerged. The public `pokefc-simulation` repo remains a test bed, not another product or public match page. Arcade/FIFA-like direct control remains a separate idea, not a shipped mode.

## Repository and deployment boundaries

Only the homepage, ratings explainer, `/play/`, `/challenge/`, and `/franchise/` are copied into the normal SiteGround build. There is **no separate Soccer-JS product page**. Standalone demos and research fixtures are not production routes. Historical `legacy-*`, calibration and TacticMesh audit files remain in private source for provenance but are excluded from live public output.

```sh
# From a checked-out private repository
bash scripts/build-siteground.sh
python3 -m http.server 8765 --directory dist

# Selected local validation (requires Node)
node tests/test-play.cjs
node tests/test-v08-league.cjs
node tests/test-challenge-gauntlet.cjs
```

Production deploy workflow: [`.github/workflows/deploy-siteground.yml`](.github/workflows/deploy-siteground.yml) on changes to specified runtime paths on `main`, with validation before FTPS publishing to the PokeFC **subdomain only**. See [SITEGROUND_DEPLOY.md](SITEGROUND_DEPLOY.md) for safeguards. The ordinary build does not include experimental Soccer-JS assets. A **development-only opt-in packaging flag** on the draft branch is not production authorization.

More detail: [development TODO](DEVELOPMENT_TODO.md) · [repository cleanup notes](docs/REPOSITORY_CLEANUP.md) · [older source/calibration history](CHANGES_v0.8b1.md).

Pokémon characters and artwork belong to their respective owners. PokéFC is an unofficial project, not affiliated with Pokémon or FIFA/EA.
