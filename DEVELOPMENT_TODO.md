# PokéFC — Development TODO

This backlog tracks deferred gameplay/UI work in the main PokéFC repository. Keep the Challenge game's existing simulation rules and saved-run integrity intact while implementing new interaction features.

## Completed

- [x] Challenge draft: **reorder eligible Pokémon by S → A → B → C → D tier when a new empty position is clicked**; alphabetize within tiers rather than expose the hidden OVR ranking.
- [x] Challenge draft: hovering previews positional fit without reordering or committing the selected slot.
- [x] Challenge draft: **fast tier re-sort with cached per-position-family grades, a single batched DOM move, and a 235 ms top-card shuffle animation**. Hover updates tier badges without list movement; reduced-motion settings disable animation.
- [x] Challenge match reports: display authentic goal scorers, assists, minutes, game statistics, and previous matches when event logs exist.
- [x] **Challenges v2 layout — first milestone**: replace the two-column run dashboard with a full-width XI pitch and persistent scouting reels; open the Pokémon draft list in a searchable non-modal popup, keep the Item Shop in a collapsible floating drawer with direct click-to-equip on the pitch, and put opponent scouting in a modal and one-time lineup adjustments under Team Options. Preserve existing game rules and local saves.

- [x] **Challenges v2 result and Pokémon popups**: after a boss victory, show a dismissible match-results modal with score, authentic event report, and an Advance button. Allow reopening from the Gauntlet strip. Occupied pitch cards show a Pokémon profile with tier, six effective stats, and equipped item, including through a dedicated details button during shopping. Terminal matches continue to use the existing comprehensive run-results modal.

## Up next

- [ ] Check the floating shop and non-modal candidate popup in actual desktop Chrome and mobile touch browsers (overlap, focus, pointer drag and scrolling), and apply any device-specific fixes.

- [ ] **Item-shop drag-and-drop equipment**: allow dragging an item from the catalog onto an eligible Pokémon's XI tile, including clear drop-target highlighting and an obvious remove/return action. Keep the current item-first picker plus Pokémon dropdown as a **keyboard, touch/mobile, and accessibility fallback**, not a separate set of gameplay rules. Reuse the same equipment validation (₽1,000 budget, item compatibility, unique items, one Mega, refunds). Provide success/failure messages and undo; test mouse, touch, keyboard, and locked-lineup restrictions.
- [x] **Live match commentary/event feed (v1)**: Watch Match streams the actual TacticMesh goal, foul, card, substitution, and period ledger to the Match Center, with deduplication. Quick Sim records its actual generated goalkeeper saves without changing seeded outcomes. Watch → Quick Sim preserves chronological provenance in saved Challenge match reports, and old match summaries do not invent missing events. A **major chance** is deliberately not displayed because no corresponding engine event has been validated. Regression tests cover this behavior.
- [ ] **Additional live-event support**: add major chances and watched-match keeper saves only if the underlying TacticMesh source offers authoritative per-event records; don't derive them from the final report counters.
- [ ] Validate updated draft tier sorting and item-shop usability in actual desktop Chrome and mobile touch browsers.

## Longer-term

- [ ] Server-verified online leaderboards and shareable run links/player accounts.
- [ ] Full extra time and penalty kick engine, replacing the provisional seeded tiebreaker.
- [ ] Continue TacticMesh/Quick Sim calibration and consistent positional ratings.
