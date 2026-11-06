# PokéFC — active development source of truth
Updated November 5, 2026 (ET); retirement cleanup branch after PR #55.

## Locked architecture
- PokéFC Sim Engine (PSE / Quick Sim) owns official outcomes, goals, event ledger, shots, saves, and saved results.
- Soccer-JS 2.5D is the sole Watch renderer across Quick Play, Challenges and Franchise; illustrative movement never fabricates official events.
- Watch → Sim to End records the prelocked outcome once; no Sim → Watch. Fullscreen, pause/speed and goal replay are preserved.
- Official 120-minute knockout/shootouts operate in Challenges and Franchise. PSE v1 corners/fouls/free kicks/penalties currently enabled only in new unranked Quick Play exhibitions.
- Home and eligible Challenges: 1,025 Gen I–IX species. Franchise: 493 Gen I–IV species to protect saved careers.
- Franchise: 32 gyms, 22 league matchweeks, 16-team playoffs, 25 senior plus up to 10 Practice Squad.

## Completed on main
- Newtro UI; Gen I default XI; compact scouting picker; Challenge Gauntlet, result UI, rankings and run cards.
- Soccer-JS default Watch, FIFA-style broadcast/fullscreen, official highlights, dribbling/forward runs and goal-pause replay.
- PSE official extra time/shootouts and Quick Play set-piece beta; automatic record on Watch → Sim to End.

## Retirement cleanup (not yet live)
- Retire TacticMesh engine switches, worker, bridge, vendor code and hybrid continuation.
- Keep Franchise's read-only Quick Sim schematic and existing Challenge/Franchise save schemas.
- Remove obsolete v0.5/v0.7 copies from current tree while preserving Git history.
- Require PR regression checks, SiteGround FTPS successful publish and live desktop/mobile QA before calling retirement deployed.
- Confirm remote TM artifacts are removed separately; the FTPS action is intentionally non-destructive.

## Next
- Open PR #56: Challenges match-result goal/shootout replays (rebase onto cleanup later).
- Hosted mobile and sustained 90–120-minute playback QA, reduced motion, performance and rights review.
- Extend official PSE set-piece rules to Challenges/Franchise with historical save compatibility.
- Resumable PSE tactical adjustments, halftime first and then arbitrary minute.
- Calibration and behavior improvements, alternate Pokémon forms, online verified leaderboard.
- Arcade manual-control experiment remains separate, not a fourth shipped game mode.

## Repo hygiene
Superseded PRs #31, #33, #35, #39, #43 and #51 closed. Open #56 preserved. Old branch deletion pending separate ref audit.
