# Integration checkpoint — PokeFC v0.6c

**Implemented**: Browser-to-worker engine adapter, upstream module load list,
46-attribute mapping, stable player IDs, source-preserving pinned local
installation utility, real snapshot support on tactical renderer, live engine
score/event feed, official match report-to-franchise result adapter, delayed
commit until full-time, same-seed replay, error prevention and Quick Sim fallback.

**Not verified here**: a complete 90-minute match with the actual upstream
modules. The current environment could not download those source files. The
local installation script retrieves a specific GitHub commit or uses your
already downloaded TacticMesh checkout. Run that step before engine testing.

**Next verification priority**: confirm official modules initialize, simulate
90 minutes, produce match statistics, and finish on real desktop/mobile
browsers. Profile simulation speed, worker checkpoint/recovery, interruptions,
substitution/formation controls, and parity calibration against Quick Sim.

**No deployment or repository modification** was performed; local files only.
