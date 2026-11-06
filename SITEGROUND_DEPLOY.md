# PokéFC SiteGround release guide

Site: https://pfc.cliffslunchclub.com/
Private repo: `cliffslunchclub/PokeFC`
Workflow: `.github/workflows/deploy-siteground.yml` on relevant `main` changes.

## Product
Five pages: Home, Ratings, Quick Play, Challenges, Franchise. PSE controls official results; Soccer-JS 2.5D renders Watch in all modes; optional Quick Sim schematic in Franchise. Build with `PFC_INCLUDE_SOCCERJS=1 bash scripts/build-siteground.sh` to generate strict `dist/` allowlist. No live TacticMesh, hybrid, legacy copies, tests or calibration studies in public build.

## Confirm deployment
1. Open the [deployment workflow](https://github.com/cliffslunchclub/PokeFC/actions/workflows/deploy-siteground.yml) and inspect newest completed `main` run.
2. Both testing and **Deploy to pfc.cliffslunchclub.com** steps must have green checkmarks. The FTPS upload can be skipped if `SG_FTP_HOST`, `SG_FTP_USER` or `SG_FTP_PASSWORD` secrets are missing.
3. Smoke-test `/play/`, `/challenge/`, `/franchise/` on desktop/mobile, including Watch, Quick Sim, Sim to End, cancel/Record, fullscreen and stats.
4. Inspect PFC subdomain `public_html` for stale `play/tm-worker.js`, `franchise/tm-worker.js`, `play/tacticmesh/vendor/` and `franchise/tacticmesh/vendor/`. The non-destructive FTPS strategy is not proof of remote deletion; clean only PFC's isolated folder after confirming no active references.
5. For stale HTML/JS, hard refresh and review NGINX Direct Delivery/cache only for PFC.

FTPS uses strict certificate validation and `./public_html/` within the PFC subdomain. Do not touch the parent site or any school lunch domain. For rollback, revert to a tested commit and verify compatibility with existing local saves.
