# PokéFC watched-match decisions — LOCKED (November 5, 2026)

## Default visual engine in all modes

- **Quick Play / Exhibition:** WATCH MATCH starts Soccer-JS 2.5D.
- **Challenges / Gauntlet:** WATCH MATCH opens Soccer-JS from the locked Challenge XI; recorded results use existing Challenge progression.
- **Franchise:** The Tactical Viewer defaults to Soccer-JS 2.5D.
- **Fallback:** Retain manual TacticMesh selection. It remains the legacy independent engine until its outcome authority is migrated; never silently replace a locked Quick Sim result with a new TacticMesh result.
- **Quick Sim:** Remains the official result/statistics/goal authority for Soccer-JS watched matches and for instant simulation.

## User controls

- **Watch -> Sim to End only.** No Sim -> Watch mid-game entry in this phase.
- The complete Quick Sim result is locked before Watch begins.
- Sim to End reveals the same result without running a competing match simulation.
- Record once to advance the Challenge or Franchise save; cancel leaves saves unchanged.

## Pokémon artwork and markers

- Use existing/original Pokémon game sprites; no uniforms, no artwork recoloring.
- **Normalized sprite sizes:** consistent in-game billboards (currently 72 px base), so even large and small species remain readable.
- **Home red #E53935; away white #FFFFFF** inspired by a Poké Ball.
- Home: white number on red badge, red ground ring.
- Away: red number on white badge, white ground ring with dark outline.
- Goalkeepers use shield-shaped jersey-number badges.
- **Labels:** numbered badges for all players, and the Pokémon name only for the current ball carrier; optionally hide jersey numbers.
- Isometric 2.5D is the default camera; allow broadcast/top-down comparisons.

## Development and deployment rules

- Test rendering, integration, regressions and performance on the PUBLIC `cliffslunchclub/pokefc-simulation` repo, using standard hosted runners.
- Keep private `PokeFC` staging PR #11 as a draft until public tests pass. Do not run heavy GitHub Actions on the private repository.
- Existing live PFC pages, production TacticMesh and Quick Sim must remain functional until the new assets and complete mode workflows pass.
- A green test for replaying one scripted match does **not** prove real 90-minute gameplay, knockout overtime/PK, arbitrary species sprite availability, or existing save integration.
- Pokémon artwork rights require review before any commercial distribution.

No further user design decisions are needed before implementing these defaults.
