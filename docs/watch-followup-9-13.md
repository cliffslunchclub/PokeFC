# Watch follow-up 9–13

Development and CI: public `cliffslunchclub/PokeFC`. No production promotion is authorized by this branch. Based on the unmerged official-save/restart work in PR #95; review this follow-up separately.

- **9:** Shared 0.9 m player ground-footprint inset, applied to raw scenes and final Watch output. Ball collisions and official open-goal shots retain their separate rules. Camera-independent world positions do not clip airborne sprite artwork.
- **10:** Existing second-last-opponent logic includes rushing goalkeepers and exempts the own half. Apply it to official-save buildup and again after render smoothing, using the same release/runner timing as source frames. Released through-ball runners retain their run; no whistle, possession reset or PSE change.
- **11:** Prefer an actual received attacking possession for goal approach. Distance-time carry/pass/shot phases at 3.6/14/24 m/s; move the supporting player to the ball before a legacy snapshot handoff. Preserve old snapshots with local connected fallback choreography when their recorded scorer/possession cannot form the preferred approach. Official saves retain their separate catch, hold and punt sequence. Never sample a late restart beyond full time.
- **12:** Illustrative one-on-one block contacts the actual keeper, spills loose, and uses the nearest defender within 8 m of the loose ball; otherwise keeper recovers and clears with feet. Clear about 42 m upfield with an airborne flight. No PSE save/stat/alert. Retain wide misses when there is insufficient safe time before an official scene or period restart.
- **13:** Schedule all PSE goals/saves globally at least three match minutes apart, retaining outcomes, event order, stats and RNG. Prefer original halves; allow adjacent-half spill when needed. Extra time respects the last regulation incident; shootouts are excluded. Reserve the first 30 seconds of each period for a reachable kickoff/approach. Timestamps intentionally change for new simulations; old stored results are not rewritten.

## Capacity limitation

Three minutes between events permits at most ten incidents inside the 30-minute extra-time interval. In a 1,000-seed test, three ledgers contained eleven extra-time incidents. These raise `PSE_EVENT_SPACING_CAPACITY` with incident count and periods, atomically, rather than dropping outcomes or weakening the rule. This unresolved product case blocks production readiness: a separate decision is needed before choosing fewer generated incidents, longer extra time, or a spacing exception. Existing match callers do not yet turn that error into a user-facing recovery flow.

## Verification

Focused coverage checks both directions, second-last opponents including a rushing keeper, own-half rules, released runners, replay/4x frame samples, bounded player positions, actual block contact, both clearance paths and phase seams. PSE coverage compares 1,000 seeded results against the same engine before scheduling to protect outcomes, stats, event identity/order and RNG. Capacity conflicts must not partially mutate input. Public CI also builds the real Soccer-JS viewer and runs desktop/mobile save lifecycle tests.
