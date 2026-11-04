# PokéFC — Development TODO

This backlog tracks deferred gameplay/UI work in the main PokéFC repository. Keep the Challenge game's existing simulation rules and saved-run integrity intact while implementing new interaction features.

## Completed

- [x] Challenge draft: **reorder eligible Pokémon by S → A → B → C → D tier when a new empty position is clicked**; alphabetize within tiers rather than expose the hidden OVR ranking.
- [x] Challenge draft: hovering previews positional fit without reordering or committing the selected slot.
- [x] Challenge draft: **fast tier re-sort with cached per-position-family grades, a single batched DOM move, and a 235 ms top-card shuffle animation**. Hover updates tier badges without list movement; reduced-motion settings disable animation.
- [x] Challenge match reports: display authentic goal scorers, assists, minutes, game statistics, and previous matches when event logs exist.

## Up next

- [ ] **Item-shop drag-and-drop equipment**: allow dragging an item from the catalog onto an eligible Pokémon's XI tile, including clear drop-target highlighting and an obvious remove/return action. Keep the current item-first picker plus Pokémon dropdown as a **keyboard, touch/mobile, and accessibility fallback**, not a separate set of gameplay rules. Reuse the same equipment validation (₽1,000 budget, item compatibility, unique items, one Mega, refunds). Provide success/failure messages and undo; test mouse, touch, keyboard, and locked-lineup restrictions.
- [ ] **Live match commentary/event feed**: show meaningful events during TacticMesh Watch and on completed match reports, including goals, saves, major chances, fouls, cards, and substitutions **only when the underlying engine actually records them**. Track minute, team, Pokémon, and event type; never fabricate events from final stats. Ensure Watch → Sim to End preserves event chronology and sources, and build regression tests.
- [ ] Validate updated draft tier sorting and item-shop usability in actual desktop Chrome and mobile touch browsers.

## Longer-term

- [ ] Server-verified online leaderboards and shareable run links/player accounts.
- [ ] Full extra time and penalty kick engine, replacing the provisional seeded tiebreaker.
- [ ] Continue TacticMesh/Quick Sim calibration and consistent positional ratings.
