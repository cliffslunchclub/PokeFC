#!/usr/bin/env bash
# The deployed site has a home/builder landing page and THREE game modes:
#   /           Home / National Free XI Builder (all 1025 Pokémon)
#   /play/      Exhibition: generated 32 gyms + Elite Four / Champions
#   /challenge/ Classic/National six-boss gauntlet
#   /franchise/ 32-gym management mode
# The older 16-gym build, Arcade, calibration and private tools are not public.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist/ratings dist/challenge dist/play/tacticmesh/vendor dist/franchise/tacticmesh/vendor

# Apache cache policy scoped to this dedicated subdomain (not other sites).
cp .htaccess dist/.htaccess

# National free builder and shared Quick Sim library.
cp index.html builder.css builder.js site.css favicon.svg national-species.js \
   quick-sim.js calibration-profile.js dist/

# Ratings explainer is linked from the Free Builder, not a fourth game mode.
cp ratings/index.html dist/ratings/

# Challenge uses National species, special-item data, and Play opponent table.
cp challenge/index.html challenge/challenge.css challenge/special-items-data.js \
   challenge/leaderboard.js challenge/run-card.js challenge/slot-reels.js challenge/tiers.js challenge/match-report.js challenge/drag-drop.js dist/challenge/

# Exhibition: its own watched-match worker and TacticMesh bridge; all resources
# are relative to /play/ so Franchise and Play can independently start workers.
cp play/index.html play/play.css play/play.js play/opponents.js dist/play/
cp tm-engine-bridge.js tm-worker.js hybrid-sim.js dist/play/

# Current 32-gym Franchise stays pinned to its Gen I–IV 493-species database.
cp franchise/index.html dist/franchise/
for file in career.css career.js species.js calibration-profile.js quick-sim.js \
            hybrid-sim.js tm-engine-bridge.js tactical-viewer.js tm-worker.js; do
  cp "$file" "dist/franchise/$file"
done

# Genuine pinned MIT-licensed TacticMesh runtime, required by both Watch modes.
for mode in play franchise; do
  cp tacticmesh/vendor/*.js tacticmesh/vendor/installed.json \
     tacticmesh/vendor/LICENSE tacticmesh/vendor/THIRD_PARTY_NOTICES.md \
     "dist/$mode/tacticmesh/vendor/"
done

# Validate every local CSS/script ref, worker dependency and deployment scope.
python3 - <<'PY'
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
class Resources(HTMLParser):
    def __init__(self):
        super().__init__();self.refs=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=="script" and d.get("src"):self.refs.append(d["src"])
        if tag=="link" and d.get("href") and d.get("rel") in ("stylesheet","manifest","icon"):self.refs.append(d["href"])
root=Path("dist").resolve()
pages=[root/"index.html",root/"ratings/index.html",root/"play/index.html",root/"challenge/index.html",root/"franchise/index.html"]
for page in pages:
    if not page.is_file():raise SystemExit(f"Missing page: {page}")
    parser=Resources();parser.feed(page.read_text())
    for ref in parser.refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc or url.path.startswith("/"):continue
        f=(page.parent/unquote(url.path)).resolve()
        if not f.is_relative_to(root) or not f.is_file():
            raise SystemExit(f"Missing or unsafe local resource: {page}: {ref}")
    h=page.read_text()
    if h.count('class="pfc-nav"')!=1:raise SystemExit(f"Invalid global nav count: {page}")
    for word in ["QUICK PLAY","CHALLENGES","FRANCHISE"]:
        if word not in h:raise SystemExit(f"Missing global nav entry {word}: {page}")
    expected='../' if page.parent!=root else './'
    if f'href="{expected}favicon.svg?v=1"' not in h:
        raise SystemExit(f"Missing shared favicon link: {page}")
    if f'src="{expected}favicon.svg?v=1"' not in h:
        raise SystemExit(f"Missing shared soccer-ball brand icon: {page}")
    for mode in ["play","challenge","franchise"]:
        if f'href="{expected}{mode}/"' not in h:raise SystemExit(f"Missing game mode link: {page}: {mode}")
for mode in ["franchise","play"]:
    for f in ["tm-worker.js","tm-engine-bridge.js","tacticmesh/vendor/installed.json","tacticmesh/vendor/core.js","tacticmesh/vendor/engine-facade.js","tacticmesh/vendor/LICENSE"]:
        if not (root/mode/f).is_file():raise SystemExit("Missing real watched-match dependency: "+mode+"/"+f)
policy=(root/".htaccess")
if not policy.is_file():raise SystemExit("Missing PokéFC cache policy: .htaccess")
rules=policy.read_text()
if "private, no-cache, max-age=0, must-revalidate" not in rules or "FilesMatch" not in rules:
    raise SystemExit("PokéFC cache policy missing revalidation directives")
for f in ["favicon.svg","ratings/index.html","national-species.js","challenge/drag-drop.js","challenge/leaderboard.js","challenge/run-card.js","challenge/slot-reels.js","challenge/tiers.js","challenge/match-report.js","challenge/special-items-data.js","play/opponents.js","play/play.js","builder.js","site.css"]:
    if not (root/f).is_file():raise SystemExit("Missing public resource: "+f)
for forbidden in ["legacy-v07c","legacy-v05","tests",".github","calibration","MVP.md","tacticmesh/optimized","career.js","tm-worker.js","tacticmesh/vendor"]:
    if (root/forbidden).exists():raise SystemExit("Private/legacy content in public root: "+forbidden)
assert '1,025' in (root/"index.html").read_text()
assert 'XI GRADE' in (root/"index.html").read_text()
assert 'How are the grades calculated by position?' in (root/"index.html").read_text()
assert 'NATIONAL' in (root/"challenge/index.html").read_text()
assert 'class="challenge-hero"' in (root/"challenge/index.html").read_text()
assert 'id="challengeTabRankings"' in (root/"challenge/index.html").read_text()
assert 'id="challengeSlotMachine"' in (root/"challenge/index.html").read_text()
assert (root/"challenge/slot-reels.js").is_file()
assert (root/"challenge/drag-drop.js").is_file()
assert 'id="downloadRunCard"' in (root/"challenge/index.html").read_text()
assert (root/"challenge/challenge.css").is_file()
assert 'WATCH MATCH' in (root/"play/index.html").read_text()
print("PASS SiteGround build: Home, Ratings guide, Play, Challenges, Franchise; exactly three mode links, shared favicon")
PY
echo "Built PokéFC National Free Builder + Play + Challenges + 32-gym Franchise."
