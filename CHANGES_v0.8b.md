# v0.8b — Short-window calibration diagnostics

- Compared genuine original TacticMesh physics against reproducible Quick Sim Monte Carlo for four regional fixtures.
- 18,000 real 60 Hz physics ticks, five total early-game simulated minutes; 5,000 completed Quick Sim matches.
- Original source commit and all original module SHA-256 + Git blob SHA-1 hashes verified before every new diagnostic.
- Added `tests/diagnose-quick-vs-tm.cjs`, `tests/test-calibration-diagnostics.cjs`, JSON reports and CSV comparison.
- Identified preliminary event-frequency discrepancy for passes (TM 77 in observed windows vs Quick expected 46.1).
- No fitted profile or gameplay balance change: the sample is too short to support full-time calibration.
- Existing full-time verified reference collector and held-out fitter remain unchanged for a later step.
- Previous v0.8a experimental optimization files preserved; original pinned engine remains default.
