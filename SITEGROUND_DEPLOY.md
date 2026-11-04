# PokéFC public alpha — SiteGround

**Public URL:** https://pfc.cliffslunchclub.com/  
**Source:** private GitHub repository `cliffslunchclub/PokeFC`  
**Host:** existing SiteGround subdomain `pfc.cliffslunchclub.com`, document root `public_html`

## Navigation and routes

The site logo links Home. **Only three links appear in the global mode navigation:** PLAY, CHALLENGES, FRANCHISE.

| Route | Function | Data |
| --- | --- | --- |
| `/` | Home + Free XI Builder, five formations, search by name/dex, type/generation filtering, sprite/artwork selection, autosave and Copy XI | **National 1–1025** default species |
| `/play/` | Exhibition Play, 32 generated gym teams, Lorelei/Bruno/Agatha/Lance/Blue/Red, 90-minute Quick Sim and genuine TacticMesh Watch with pause, speed and one-way Sim to End | User's locally saved Free Builder XI (all nine generations); gyms draw from Gen I–IV |
| `/challenge/` | Classic (Gen I–IV) or National (Gen I–IX), Legends On/Off (max two), 11 unique Pokémon, one type reroll, gen reroll, draft move and formation change, ₽1,000 held-item shop, Mega/Eviolite, fixed six-boss gauntlet and local personal results for four categories | National 1–1025; the six opponent XIs are fixed and nonlegendary |
| `/franchise/` | 32-Gym Franchise management, scouting, season/draft, 90-minute Quick Sim and genuine TacticMesh viewer | Existing, **separately pinned Gen I–IV** data |

Challenge Watch sends the locked Final XI to `/play/?challenge=1`, including formation/tactics/items/boss, and the match result is saved back to the Challenge gauntlet. The watched prefix comes from TacticMesh; Sim to End preserves the genuine clock/goal ledger and uses the provisional Quick Sim continuation for remaining play.

## Pokédex audit and limits

- `national-species.js` contains **all 1,025 National Dex base species** (IDs 1–1025) from Gen I–IX, cross-checked against `PokeAPI/pokeapi` CSV sources. Every record includes canonical English name, identifier, generation, ordered types, six base stats, height, weight, evolutionary parent, default sprite ID and Legendary/Mythical/Ultra Beast classification.
- Sprites load on demand from the **PokéAPI sprites** asset CDN; the browser offers pixel sprites and official artwork. Artwork isn't bundled in this private GitHub repo.
- **Alternate regional, cosmetic and transformed forms** are not yet a separate builder selection; Mega forms are implemented by equipping their matching Mega Stone in Challenges.
- The 32-team Franchise intentionally retains its original Gen I–IV `species.js` to avoid changing existing career balance or saves.
- Four leaderboard **categories** have local browser records; there is no online or verified leaderboard yet.
- Challenge playoff ties use a **provisional seeded penalty resolution**; full extra-time/penalty engine integration is pending. Match calibration, especially TacticMesh-to-Quick Sim statistical alignment, remains ongoing.
- All mode saves are local to the browser/site; no account login or server database. Published HTML/JS is readable by anyone, even though the GitHub repository itself is private.

## Publishing

The isolated build script `scripts/build-siteground.sh` constructs `dist/` and refuses to include legacy Arcade / 16-gym builds, private tests, Git internals and calibration reports. Its built output is the only content deployed to SiteGround.

Workflow: `.github/workflows/deploy-siteground.yml` automatically runs when relevant source or tests change on `main`. Its gates cover the National 1,025 ID audit, Free Builder, Play Gym generation/Quick Sim, Challenge locked carryover and six-boss gauntlet, Franchise matchweeks and hybrid simulation. Only after passing does it upload changed files via certificate-validated FTPS.

FTPS account's home is the **subdomain folder**, one level above its `public_html`; the workflow uploads to `./public_html/` relative to that home. Never use the primary school's or main domain's webroot.

Private GitHub Actions repository secrets (do not paste into chat or commit to code):
`SG_FTP_HOST`, `SG_FTP_USER`, `SG_FTP_PASSWORD`.

Archived `legacy-v05/` and `legacy-v07c/` remain in private GitHub but are not published. The sync removes their stale public copies.

## Preventing stale updates (SiteGround + browsers)

The build ships a **subdomain-only** `public_html/.htaccess` on every deployment. Apache cache headers require `private, no-cache, max-age=0, must-revalidate` for HTML, CSS, JS and JSON, including match-worker scripts. Pokémon image URLs load from an external sprite host and are unaffected.

**Important:** SiteGround's **NGINX Direct Delivery** serves static HTML/JS/CSS directly, bypassing Apache and therefore potentially bypassing these `.htaccess` headers. If you want Apache's rules reliably applied, in **Site Tools → Speed → Caching → NGINX Direct Delivery**, switch it **off for `pfc.cliffslunchclub.com` only**. Do not change it for lunch program sites.

After the first `.htaccess` deploy, clear any existing cached copies **once**:
1. **Site Tools → Speed → Caching → Dynamic Cache → Flush Cache** (pfc only, if selectable).
2. **Site Tools → Speed → CDN → Purge Cache** if SiteGround CDN is enabled.
3. On the browser, hard refresh once (**Cmd + Shift + R** in Chrome on Mac).
4. In Chrome Developer Tools → Network, inspect an `index.html` response for the expected `Cache-Control` header. Requests should not stay at `x-proxy-cache: HIT` after revalidation.

Future GitHub Actions deployments automatically publish the same `.htaccess` rules. Avoid adding sitewide cache purges to GitHub or writing these rules in the primary domain's `public_html`; the deployment remains scoped to `pfc`.

## Quick verification

1. Open all four paths above. The **global navigation** must show exactly PLAY, CHALLENGES, FRANCHISE; the site logo returns Home.
2. On Home, search for `#1025 Pecharunt` or `#1000 Gholdengo`; test generation 9 and sprite/artwork style. Test Porygon2 and Eviolite in Challenges.
3. Build an XI, open Play, choose any gym or Elite Four, then try Quick Sim. Test TacticMesh Watch and Sim to End on a modern browser; browser support/performance needs practical testing.
4. In Challenges, check Classic/National and Legendary variants. Lock an XI, use Watch against Lorelei, return to Challenges and continue.
5. If JS/CSS appears stale, hard refresh (Mac Chrome: Cmd+Shift+R). Use GitHub Actions logs for any deploy or runtime errors.
