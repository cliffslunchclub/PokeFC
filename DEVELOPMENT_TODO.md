# PokéFC — active development source of truth
Updated November 5, 2026 (ET), after PRs #60 and #62.

## Locked architecture
- PokéFC Sim Engine (PSE / Quick Sim) owns official outcomes, goals, event ledger, shots, saves, and saved results.
- Soccer-JS 2.5D is the sole Watch renderer across Quick Play, Challenges and Franchise; illustrative movement never fabricates official events.
- Watch → Sim to End records the prelocked outcome once; no Sim → Watch. Fullscreen, pause/speed and goal replay are preserved.
- Official 120-minute knockout/shootouts operate in Challenges and Franchise. PR #62 replaces official in-match set-piece generation with enclosed-pitch continuous play (no corners, free kicks or match penalties); shootouts still resolve knockout draws.
- Home and eligible Challenges: 1,025 Gen I–IX species. Franchise: 493 Gen I–IV species to protect saved careers.
- Franchise: 32 gyms, 22 league matchweeks, 16-team playoffs, 25 senior plus up to 10 Practice Squad.

## Completed on main
- Newtro UI; Gen I default XI; compact scouting picker; Challenge Gauntlet, result UI, rankings and run cards.
- Soccer-JS default Watch, FIFA-style broadcast/fullscreen, official highlights, dribbling/forward runs and goal-pause replay.
- PSE official extra time/shootouts; PR #62 enclosed pitch/no-whistle rules; automatic record on Watch → Sim to End.

## Retirement cleanup (completed and deployed)
- TacticMesh engine/worker/bridge/vendor/hybrid routes retired in merged PR #60; old v0.5/v0.7 trees removed from active source.
- All five PR workflows passed. SiteGround [deployment #184](https://github.com/cliffslunchclub/PokeFC/actions/runs/42155722741) succeeded, including explicit deletion of old TM files and both TM runtime directories.
- Existing Challenge and Franchise save schemas, official PSE computation and Soccer-JS remained intact.

## Next
- Open PR #56: Challenges match-result goal/shootout replays (rebase onto cleanup later).
- Hosted mobile and sustained 90–120-minute playback QA, reduced motion, performance and rights review.
- Validate enclosed-pitch/no-whistle rules from PR #62 across all modes and historic saves.
- Resumable PSE tactical adjustments, halftime first and then arbitrary minute.
- Calibration and behavior improvements, alternate Pokémon forms, online verified leaderboard.
- Arcade manual-control experiment remains separate, not a fourth shipped game mode.

## Repo hygiene
Superseded PRs #31, #33, #35, #39, #43 and #51 closed. Open #56 preserved. Guarded merged-PR branch-ref cleanup is documented in [repository cleanup notes](docs/REPOSITORY_CLEANUP.md).
