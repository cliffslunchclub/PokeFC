# PokeFC — TacticMesh 45-minute authentic halftime benchmark

- Ran original pinned TacticMesh `603312dcf037bed0b0c817f8ba8a194eaebce8da` with authentic Gen IV 32-gym franchise lineups. The fixture is Oreburgh City FC vs Sunyshore City FC, same benchmark seed as v0.8.
- Real halftime occurred at **46 game minutes**, counting one minute of stoppage time. Simulated **165,600** 60Hz physics/AI ticks in **600.967 seconds (10m 0.967s)** on this test host.
- Genuine score at halftime: **Oreburgh 0–1 Sunyshore**, goal by Electivire at **15:54**. Goal/event ledger consistency passed; standings were not updated.
- Original TacticMesh stats: **5 shots, 633 passes, 363 completed passes, 66 successful tackles** across the two teams.
- **5,000 genuine 90-minute Quick Sim Monte Carlo samples** for identical Pokémon lineups and tactics completed in **12.729 seconds**; first-45 expectations: **10.57 shots, 415.211 passes, 282.432 completed passes, 11.405 tackles**, and **1.106 goals** combined.
- Early discrepancy: TM observed **1.52×** as many passes and **5.79×** as many tackles, but only **0.47×** as many shots, compared with a 45-minute Quick Sim expectation. This is a single first-half sample, not valid full-time calibration or proof that the names of every recorded action use identical definitions.
- Recorded the original full event ledger, first-half team/player stats and a genuine saveable halftime engine checkpoint. No original TacticMesh source files, production Quick Sim settings, Pokémon formulas, or franchise saves were altered.
- Recommended next step: verify comparable event semantics (especially tackles) and repeat one or more additional independent halves before modifying production calibration coefficients. Existing 8-full-match gating for the validated full calibration fitter remains unchanged.

Reproduce with `python3 run_45min_test.py` and (if interrupted) `python3 run_45min_test.py --resume`.
