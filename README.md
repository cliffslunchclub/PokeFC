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
| **Quick Play** (`/play/`) | Gym/Elite Four/Champion exhibitions, generated opposing lineups, instant **Quick Sim**, legacy TacticMesh Watch, pause/speed and Watch → Sim to End | Uses locally saved XI. **Default Watch remains TacticMesh**, while the tested Soccer-JS 2.5D match screen is available behind the opt-in route `/play/?watch=soccerjs` |
| **Challenges** (`/challenge/`) | Classic Gen I–IV or National Gen I–IX, six-boss Gauntlet, four local leaderboard categories, animated scouting reels, type/generation rerolls, S–D positional tiers, 11-player XI, ₽1,000 item shop, Mega/Primal handling, item assignment and AI Auto-Equip, boss scouting, match/event reports, victory/result and Pokémon detail dialogs, responsive draft and movable desktop panels, downloadable result card | Local saves/leaderboards only; seeded tie resolver until extra-time/PK logic is finished. Challenges v2 UI and recent unified match timeline are in `main` |
| **Franchise** (`/franchise/`) | 32 Gym clubs across Kanto/Johto/Hoenn/Sinnoh, 22 league matches per club (352 fixtures), 16-club playoffs, 25 senior roster slots and up to 10 Practice Squad spots (five initial prospects), drafting, scouting, training/progression, season rollover, Quick Sim and legacy Tactical Viewer, save export/import | **493 Gen I–IV species** intentionally remain pinned to existing career saves |

**Current match engine:** `quick-sim.js` produces immediate statistical results. Legacy TacticMesh Watch and the existing Watch → Sim continuation still run in current `main`. Match commentary and final events share one timeline; event provenance remains stored even when source chips are hidden.

**Known limits:** browser-local records (no verified online accounts or cross-user rankings); incomplete 90-minute calibration parity; no production-grade extra time/penalty shootout controller; alternate regional/cosmetic forms aren't all separate player choices. Art rights must be reviewed before commercial distribution.

## 2.5D Watch rollout and remaining development

- **Soccer-JS 2.5D Quick Play opt-in shipped** via merged [PR #21](https://github.com/cliffslunchclub/PokeFC/pull/21). The live deployment pipeline compiled the pinned MIT Soccer-JS renderer and published the iframe runtime. A public Chromium fixture test [passed](https://github.com/cliffslunchclub/pokefc-simulation/actions/runs/42082614996) with 22 original Pokémon sprites, red/white badges and rings, isometric camera, Watch → Sim to End, single recording and cancellation. **The direct hosted-site browser check is separate; don't confuse fixture proof with the live site's end-to-end verification.** The new view is not the default yet.
- **Match Director** is included in `main` as a read-only deterministic shot/goal ledger for the opt-in replay. Non-goal movements and timestamps are illustrative, not recorded official play. Natural, faithful full-match motion is still unfinished.
- Target architecture: **Quick Sim owns official scores/results/stats; Soccer-JS renders the 2.5D Watch** for Quick Play, Challenges and Franchise. TacticMesh is to be **removed after** a fully tested replacement, not before.
- **One-way Watch → Sim to End** is the currently locked Soccer-JS UX. Mid-match **Sim → Watch** is not implemented. Tactical changes during a simulated match require a future resumable Quick Sim state API (start with halftime).

The old experimental [PR #11](https://github.com/cliffslunchclub/PokeFC/pull/11) is closed and unmerged. The public `pokefc-simulation` repo remains a test bed, not another product or public match page. Arcade/FIFA-like direct control remains a separate idea, not a shipped mode.

## Repository and deployment boundaries

The SiteGround build publishes the homepage, ratings explainer and the three playable modes; it additionally includes **only the embedded Soccer-JS iframe runtime assets** under `/watch/soccerjs/` for the opt-in test. There is **no separate Soccer-JS product page**. Standalone demos and research fixtures are not production routes. Historical `legacy-*`, calibration and TacticMesh audit files remain in private source for provenance but are excluded from live public output.

```sh
# From a checked-out private repository
bash scripts/build-siteground.sh
python3 -m http.server 8765 --directory dist

# Selected local validation (requires Node)
node tests/test-play.cjs
node tests/test-phase10-quickplay-lifecycle.cjs
node watch/soccerjs/test-inline-bridge.cjs
node tests/test-v08-league.cjs
node tests/test-challenge-gauntlet.cjs
```

Production deploy workflow: [`.github/workflows/deploy-siteground.yml`](.github/workflows/deploy-siteground.yml) on changes to specified runtime paths on `main`, with validation before FTPS publishing to the PokeFC **subdomain only**. See [SITEGROUND_DEPLOY.md](SITEGROUND_DEPLOY.md) for safeguards. The CI workflow now compiles the pinned native Soccer-JS assets and includes the allowlisted runtime during a validated deployment. The `?watch=soccerjs` flag enables the opt-in UI; normal Watch, Challenges and Franchise are unchanged. Research fixtures, stand-alone demos and private Quick Sim source are **not** copied to the webroot.

More detail: [development TODO](DEVELOPMENT_TODO.md) · [repository cleanup notes](docs/REPOSITORY_CLEANUP.md) · [older source/calibration history](CHANGES_v0.8b1.md).

Pokémon characters and artwork belong to their respective owners. PokéFC is an unofficial project, not affiliated with Pokémon or FIFA/EA.
