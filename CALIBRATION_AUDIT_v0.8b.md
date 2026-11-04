# PokeFC v0.8b — Quick Sim / Original TacticMesh Calibration Audit

This is **phase 1: instrument and measure**. All four physics samples use unmodified SHA-verified original TacticMesh, 60 Hz, and actual franchise Pokémon lineups. Quick Sim runs its usual 90-minute statistical engine, and averages are scaled down *only for visual comparison* to the physical segment.

- 18,000 genuine TacticMesh AI/physics ticks across **four fixtures** and **five aggregate simulated minutes**.
- 5,000 completed Quick Sim simulations, same fixture lineups in each region.
- **No full-time reference reports were present. Zero calibration parameters were changed.** The model remains `provisional`.

| Region | TM minutes | TM passes | Quick expected passes | TM tackles | Quick expected tackles | TM shots | Quick expected shots |
|---|---:|---:|---:|---:|---:|---:|---:|
| Kanto | 1 | 11 | 9.2 | 0 | 0.26 | 0 | 0.23 |
| Johto | 1 | 17 | 9.2 | 0 | 0.26 | 0 | 0.24 |
| Hoenn | 1 | 15 | 9.2 | 0 | 0.25 | 0 | 0.23 |
| Sinnoh | 2 | 34 | 18.4 | 4 | 0.51 | 0 | 0.47 |

**Aggregate across the observed short segments:** TM recorded **77 passes** vs **46.1** expected from Quick Sim (around 1.67×). This is a **potential difference to investigate**, NOT a factor that can responsibly be applied to 90-minute passes from five early-match minutes.

## What these tests can establish

- Original TacticMesh starts 22 Pokémon, advances genuine physics/AI ticks, and yields a consistent goal ledger.
- Quick Sim can repeatedly generate complete reports with no invalid scores, shots, or pass counts.
- We now have a reproducible diagnostic tool to compare the same fixture across all four regions.

## What they cannot establish

- A passing, tackling, scoring or possession *full-time* calibration. Early-match rates and one seed do not reliably represent entire games.
- Real saves or shots-on-target, which do not have comparable verified fields in official TacticMesh reports.
- A valid holdout test or estimated statistical confidence in how TacticMesh behaves across full seasons.

## How to repeat the diagnostic

```sh
node tests/diagnose-quick-vs-tm.cjs --club=24 --minutes=2 --replicates=2000 --out=calibration/v08b-audit-sinnoh.json
node tests/test-calibration-diagnostics.cjs
```

## What would let us safely change Quick Sim

Collect at least **8 genuine completed full-time original TacticMesh reports** through `run_calibration_local.py --matches 8 --no-install`; preferably 32+, across multiple regions and strategies. The existing fitter verifies original full-time reports, uses a held-out test set, and rejects models that generalize worse. It should not be bypassed based on these short windows.

## Source and preservation

All existing Pokémon attribute weights, franchise mechanics, original pinned TacticMesh vendor files, and the Quick Sim parameter profile remain unchanged. Local only; no GitHub, SiteGround, or API calls.
