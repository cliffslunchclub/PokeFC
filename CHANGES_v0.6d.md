# PokeFC v0.6d - Engine stabilization

- Pinned TacticMesh original code; no modifications to upstream physics or AI
- Live worker reports **measured** ticks/second and simulation speed ratio
- Tactical viewer shows measured speed distinct from requested 1×/4×/16×
- 90-minute official engine benchmark now profiles AI, tactics and world/runtime
- Supports short genuine-physics profile mode; correctly marked not a full pass
- Optional resumable checkpoints every 15 minutes of in-game time
- Final result only commits after engine has completed, as in v0.6c
- Existing franchise and instant Quick Sim calculations unchanged
- Local-only; nothing deployed or pushed to GitHub

Testing: Node franchise / bridge / worker suite passed. Official full-length
match remains unverified here due to lack of locally installed pinned source.
