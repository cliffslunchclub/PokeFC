# PokeFC — Genuine TacticMesh first-half calibration audit

**Fixture:** Oreburgh City FC vs Sunyshore City FC
**Result at halftime:** 0–1
**Engine:** original TacticMesh, SHA-verified pinned source 603312dcf037bed0b0c817f8ba8a194eaebce8da
**Simulation:** 46 in-game minutes · 165,600 real 60Hz ticks · 600.967 seconds of processing
**Quick Sim:** 5,000 complete simulated games, first-half expectations shown

| Team | Metric | Real TacticMesh half | Quick Sim expected half | Difference |
|---|---|---:|---:|---:|
| Oreburgh City FC | goals | 0 | 0.452 | -0.452 |
| Oreburgh City FC | shots | 2 | 5.194 | -3.194 |
| Oreburgh City FC | passes | 271 | 194.174 | 76.826 |
| Oreburgh City FC | completedPasses | 139 | 132.126 | 6.874 |
| Oreburgh City FC | tackles | 30 | 5.627 | 24.373 |
| Oreburgh City FC | assists | 0 | 0.325 | -0.325 |
| Sunyshore City FC | goals | 1 | 0.654 | 0.346 |
| Sunyshore City FC | shots | 3 | 5.376 | -2.376 |
| Sunyshore City FC | passes | 362 | 221.037 | 140.963 |
| Sunyshore City FC | completedPasses | 224 | 150.306 | 73.694 |
| Sunyshore City FC | tackles | 36 | 5.778 | 30.222 |
| Sunyshore City FC | assists | 0 | 0.467 | -0.467 |

### Goals observed
- 15 — Electivire (31)

### Interpretation
- The original match ran for an actual first half. This was not an abbreviated-duration match and no event data was fabricated.
- The halftime event ledger agrees with the authoritative engine score; franchise state was unchanged.
- Quick Sim means for shots, passes and tackles are calculated as 50% of 90-minute Monte Carlo totals; goals and assists use first-half timestamps. The genuine first half included one minute of stoppage time (46 vs 45 minutes), so these are approximate rate comparisons.
- One 45-minute TacticMesh segment provides an initial diagnostic **only**. Do not treat it as a statistically calibrated 90-minute model.
- No Pokémon rating formulas, Quick Sim parameters, or original TacticMesh source files were modified.

### Files
- `calibration/sinnoh-genuine-tm-first-half.json`: original event ledger, player/team stats, compare output, integrity checks
- `calibration/sinnoh-first-half-engine-checkpoint.json`: genuine halfway engine snapshot, usable for future continuation
- `tests/benchmark-45min.cjs`: reproducible benchmark and Quick Sim comparison

To repeat: `python3 run_45min_test.py` (or add `--resume` after an interruption).
