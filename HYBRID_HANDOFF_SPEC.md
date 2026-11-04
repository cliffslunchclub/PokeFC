# Hybrid handoff contract (v0.7a prototype)

**Before switch:** TacticMesh is authoritative. The `tm-worker.js` pump owns
match state and advances its genuine 60 Hz physics. The UI never guesses a
score or substitutes a simulated event for a watched event.

**Freeze:** `handoff` runs in the worker message loop after the current batch.
It stops subsequent pumps and uses `TF.productReports.reduce(handle)` to
produce an official **partial** aggregate from the full event archive.
A snapshot includes `tick`, `elapsedSeconds`, `period`, official `score`,
team statistics, original scorer/assister IDs, cards, substitutions,
per-player minutes/stamina/active status, and the event ledger. Its scoring
ledger must agree with the official scoreboard, or handoff is rejected.

**Continue:** `FXI_HYBRID.finish(preview, partial)` rejects missing/mismatched
participants and scores. Its seed includes the franchise fixture identity,
current engine tick and current score, so the exact same handoff produces the
same final result. It simulates one-minute event segments for the remaining
regulation time, using individual ratings, tactics, stamina, current score,
red-card manpower and the opposing goalkeeper. Nothing before the switch is
regenerated. New events are marked `origin:'quick-continuation'` and prior
ones are marked `origin:'tacticmesh'`.

**Merge:** Score and event counts reconcile, active player minutes accrue
only for remaining simulated time, and team statistics/possession combine.
Officially unsupported metrics remain `null` rather than fabricating them.
The final `result` has the existing franchise `score`, `stats`, `events` and
`box` fields, plus `origin:'hybrid'` and handoff metadata.

**Commit:** No franchise save is changed by replay, pause, preview, or switch.
The viewer records a finished result only after an explicit button click.
Seven other league fixtures continue through the original Quick Sim.

**Next:** calibrate both statistical models, implement proper benches and
substitutions, extend discipline/injury bookkeeping across matchweeks, and
verify the original source in a complete 90-minute test. This version is a
functional integration alpha, not a calibrated or production-complete game.
