# PokeFC v0.8b.1 — Shared match-stat semantics

**Scope:** One small release. The original 13 TacticMesh source files and all six Pokémon-to-football attribute formulas are untouched. The 32-gym Gen I–IV Franchise system is unchanged.

## Stats now mean the same event types

| Field | TacticMesh definition | Quick Sim implementation |
|---|---|---|
| `passes` | All `pass` launch events | Estimated pass attempts |
| `completedPasses` | Pass subsequently controlled by a different teammate | Successful subset of pass attempts |
| `shots` | All `shot` events | Estimated attempted shots |
| `tackleAttempts` | **Every** `tackle` event, including unsuccessful challenges | Estimated tackles tried; includes FWD, MID, DEF |
| `tackles` | Tackle events with `success=true` | Successful subset of those attempts |
| `goals` | Confirmed `goal` events | Generated goal events, matched to score |
| `assists` | Credited goal assist | Credited goal assist |
| `possession` | Team ball-control seconds / both teams' total | Estimated percentage; comparable format, different mechanism |

`shotsOnTarget` is unavailable in original TacticMesh; do **not** compare it with Quick Sim's generated estimate. TacticMesh `shotStops` represent resolved keeper contacts, NOT conventional saves; remain separate. The existing UI displays approximate saves for franchise compatibility, but they are not an accepted calibration metric.

## Tackle mechanics

Original TacticMesh half: **239 challenge attempts, 66 successful (27.6%)**. Forwards accounted for 93 attempts and 19 wins; previous Quick Sim omitted their tackles completely.

Quick Sim now counts an attempted tackle and won tackle separately for all outfield players. Failed attempts are sampled using a **provisional 28% success split**; this is NOT a statistically validated fitted win-rate. The existing `tacklesPerPlayer` still controls successful-tackle intensity for defenders and midfielders. No AI, ball physics, or Pokémon attribute rules were modified.

Critically, new tackle ledger draws use a **separate seeded RNG**, preserving the original seeded goals, event timelines, assists, shots, passes and minutes. A four-seed historical regression test confirms this behavior.

## New comparisons from the saved real first half

The archived Oreburgh vs Sunyshore 46-minute original TacticMesh dataset remains unchanged and auditable. `node tests/compare-aligned-half.cjs` recalculates 5,000 Quick Sim first-half expectations (45 minutes), writing `calibration/aligned-first-half-comparison.json`.

| Both teams, 1st half | Original TM (46 min) | Quick Sim expectation (45 min) |
|---|---:|---:|
| Goals | 1 | 1.10 |
| Shot attempts | 5 | 10.57 |
| Pass attempts | 633 | 415.21 |
| Completed passes | 363 | 282.44 |
| Tackle attempts | 239 | 57.21 |
| **Tackles won** | **66** | **16.00** |
| Assists | 0 | 0.79 |

The discrepancy remains large and genuine. **Definitions are aligned; statistical rates are NOT calibrated.** It would be misleading to multiply Quick Sim tackles by 4 based on just one match half. Full-match references and independent holdout games are still needed to tune rates responsibly.

## Tested

- 10 Node automated suites, plus separate four-seed backward-compatibility test.
- Two browser scenarios (32 gym Franchise, 63-minute Watch → Quick Sim handoff) passed.
- Existing original 45-minute TacticMesh ledger recounted: 633 pass attempts, 5 shot attempts, 239 tackle attempts, 66 wins, 1 goal.
- 1,000 Quick Sim matches verified attempts ≥ wins and player/team summation.
- Exact original engine vendor source SHA hashes unchanged.

## Running locally

`python3 run_local.py` and open http://127.0.0.1:8765/. No additional original-engine installation required; files are included. To reproduce the audit: `node tests/test-stat-definitions.cjs && node tests/compare-aligned-half.cjs`.
