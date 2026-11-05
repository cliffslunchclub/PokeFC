# PokéFC app MVP

The product repository contains Franchise, Challenges, and their shared builder and match flows. The private cliffslunchclub/pokefc-simulation repository is for engine testing and calibration.

## Agreed scope

- Franchise uses Gen I–IV and 32 gyms across Kanto, Johto, Hoenn, and Sinnoh. Two 16-club conferences, 22 regular-season fixtures per club, and 16 playoff teams. Clubs have 25 first-team spots and up to 10 separate Practice Squad spots. Starts include randomized, classic Gym Leader clubs, and a 25-round snake draft with optional auto-drafting. Scouting and signings support ongoing recruitment.
- Challenges uses Classic (Gen I–IV) and National (Gen I–IX). Pick a formation first and draft 11 unique fully evolved Pokémon from the full eligible pool, with visible ratings and no IVs. Allow one type reroll, generation reroll, formation change, and position move each. Legendaries Off/On, with a proposed cap of two when On.
- Challenge items have a ₽1,000 budget, free rearrangement before lock, and no Team Score effect from unused budget. Display Team Score to two decimals. Lock XI, formation, tactics, and equipment for Lorelei, Bruno, Agatha, Lance, Blue, and Red. One attempt per draft, with a new XI after a loss.
- Engine direction updated November 5: Quick Sim determines official outcomes and Soccer-JS presents watched matches across Quick Play, Challenges, and Franchise. Retire TacticMesh from active product use, including fallback and deployment dependencies. Sim to End completes Quick Sim playback. The current replay prototype precomputes results. Mid-match tactical changes are proposed as checkpoint-based Quick Sim continuation, preserving played events and replacing only the unplayed future. Exact controls and allowed modes require confirmation. Challenge locked-run rules apply until explicitly revised. Seeded checkpoint autosaves are planned. An isolated arcade experiment has been separately authorized.
- Use one Gen I–IX master species database, with mode-specific eligibility. Six soccer attributes use four Pokémon base stats each, totaling 100% per attribute, with no extra BST bonus. Goalkeepers use the same attributes. Classic pixel sprites and animated Showdown sprites where available for match viewing.
- Develop locally. SiteGround GrowBig is the hosting target.

## Import status

This baseline comes from the supplied v0.8b1 playable archive. It has Franchise, Quick Sim, and TacticMesh handoff code. The Challenge screen is a placeholder. The shared Gen I–IX database is in draft PR #1 of the simulation repository and still needs to be imported and connected. Practice Squad development rules and ratings normalization/type bonus reconciliation remain open. Existing engine and calibration files are retained here as baseline dependencies and provenance.

## Engine migration status — November 5

This document records the new direction. TacticMesh removal from application code and deployment is pending. Soccer-JS integration remains experimental in draft PR #11. Quick Sim currently simulates 90 minutes in one call. Resumable tactical simulation requires an explicit state API retaining clock, score, stats, lineups, tactics, and RNG state; the existing TacticMesh-specific hybrid code is not a drop-in replacement. Initial proposed tactical windows are halftime or paused minute boundaries. Same inputs and decisions must resume deterministically and match results must commit once.
