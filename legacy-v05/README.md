# PokeFC v0.5 — Ratings & Draft Overhaul

An unofficial, offline-first Pokémon soccer manager fan project. The **Builder**, **Draft**, and **Franchise** are the main modes; the independent **Arcade** prototype is only a side quest.

## Install or upgrade on SiteGround

1. Back up your career in **Franchise → Backup** before changing files or clearing browser data.
2. Open SiteGround → Site Tools → Site → File Manager and navigate to the existing site folder (e.g. `public_html/futbol-xi/`).
3. Extract the ZIP **directly into that folder**, overwriting older game files. `index.html` should be at the folder root, not inside an extra directory.
4. Visit `https://YOUR-DOMAIN/futbol-xi/` and refresh. CSS and JavaScript URLs have `?v=5` version tags for easier cache refresh.

This release needs **no PocketBase, PocketHost, Node.js process, remote API, or database**. All matches and management logic run in the browser, with saves held in browser localStorage. Use the same URL and browser profile to keep them. Deleting site data or switching devices loses the saves unless you exported a franchise backup.

## What's new in v0.5

### Authentic Pokémon base stats and six soccer attributes

- Snapshot of **all 151 original Pokémon**, using the contemporary base-stat values published in the PokéAPI source data `data/v2/csv/pokemon_stats.csv` (default species #001–#151).
- Every Pokémon has authentic base **HP / Attack / Defense / Sp. Attack / Sp. Defense / Speed** stored in `pokemon.js`. The scouting panel now shows the base stats, six fantasy-soccer attributes, and the Pokémon's three highest-rated soccer roles.
- The soccer attributes **PAC, SHO, PAS, DRI, DEF, PHY** are custom *fan-developed* blends of those real base stats, with small type-specific bonuses. No randomized base ratings: the same Pokémon always has the same initial six attributes.
- Every position, including goalkeeper, uses exactly those six numbers. GK OVR remains `0.10 PAC + 0.05 SHO + 0.10 PAS + 0.10 DRI + 0.40 DEF + 0.25 PHY`.
- Details and sample values in `RATINGS.md`.

### Competitive four-club fantasy draft

- **Four managers**, 11 rounds, **44 globally exclusive Pokémon selections**.
- A true alternating **snake order**: rounds 1, 3, 5… go YOU → Pewter → Saffron → Indigo; rounds 2, 4, 6… reverse.
- Three CPU managers actively pick from the remaining shared Pokédex; each evaluates open positions and has a defensive, technical, or attacking preference.
- You still receive type-focused scouting offers, three rerolls, and control over which formation slot you fill. The game suggests a strong position for each new scouting assignment, but you can override it.
- Draft status, team boards, pick activity, and offers **auto-save** so a new visit can resume an unfinished draft. **New draft** resets that draft save after confirmation.
- At the end, view your ranking by squad rating, run a six-match **Draft Cup** against the three CPU clubs, and load your drafted XI into Builder. Draft Cup results are for fun and do not affect Franchise.

## Features preserved from v0.4

- **Builder:** Five formations, position-specific ratings, 151 Pokémon, filters, local club slots, shareable XI links, poster PNG export.
- **Franchise:** Eight-club league with 14 double round-robin matchweeks (56 total matches), standings, transfers, training, fitness, budgets, club history, career backup and restore. Franchise is a **separate save** from Builder and Draft.
- **Simulate:** Quick fantasy soccer fixtures.
- **Arcade:** Standalone HTML5 soccer prototype. **Not** the third-party Open Soccer codebase; that engine is a separate optional future project.

## Compatibility / saved progress

- Existing Builder and Franchise storage keys are **unchanged**, so v0.4 browser saves should remain readable in the same site and browser. Pokémon ratings will change immediately, including the evaluated strength of a previously saved franchise roster, because v0.5 uses canonical base stats rather than older estimates.
- The new draft uses a separate `futbol-xi-draft-v2` storage key. The earlier draft was not persistent and cannot be resumed after a reload.
- Make a **Franchise → Backup** JSON before upgrading for safety.
- The 151 base-stat records are embedded locally in `pokemon.js`; `gen1-base-stats.txt` is the source snapshot in Pokédex order. The included data is sufficient offline.

## Technical structure

- `index.html` — UI and script loading.
- `styles.css` — Builder/Draft UI and responsive styles.
- `pokemon.js` — 151 Pokémon species, actual base stats, custom soccer attribute formulas.
- `draft.js` — four-club draft AI, snake logic, browser save, Draft Cup.
- `app.js` — Builder, draft UI handoff, saved teams and standalone quick simulator.
- `franchise.js`, `franchise.css` — original franchise system.
- `arcade.js`, `arcade.css` — original optional HTML5 arcade mode.
- `RATINGS.md` — explanations and formulas.

## Credit and limitations

Base-stat source: **PokéAPI** public dataset at <https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_stats.csv>. The soccer formulas, draft CPU strategies, simulation rules and interface are original hobby-project code. OpenFútbol's architecture was consulted previously, but its source was **not** included. No source code from Open Soccer is bundled either.

This is an unofficial fan project, unaffiliated with Nintendo, Game Freak, Creatures, or The Pokémon Company. Character names and other Pokémon intellectual property are owned by their respective holders. No copyrighted artwork files are included.

**Limitations:** Gen I only, provisional match balance, no online draft with human opponents, CPU draft teams do not persist into Franchise as separate career clubs, no cloud saves, and no server-side account system. The **Open Soccer** arcade engine remains a separate future integration requiring appropriate permission.
