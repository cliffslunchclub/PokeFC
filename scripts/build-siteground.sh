#!/usr/bin/env bash
# Build ONLY the three public PokéFC pages from the private repository:
#   /           Home + Free XI Builder
#   /challenge/  Challenge Mode
#   /franchise/  32-gym Franchise (including TacticMesh watched games)
# Legacy Franchise, Arcade, CI, calibration, and internal docs are excluded.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist/challenge dist/franchise/tacticmesh/vendor

# Public home / free builder and Challenge's shared runtime.
cp index.html builder.css builder.js species.js quick-sim.js calibration-profile.js dist/
cp challenge/index.html challenge/special-items-data.js dist/challenge/

# Current 32-gym Franchise: all script paths remain relative to /franchise/,
# including the worker, the TacticMesh installed manifest, and source imports.
cp franchise/index.html dist/franchise/index.html
for file in career.css career.js species.js calibration-profile.js quick-sim.js \
            hybrid-sim.js tm-engine-bridge.js tactical-viewer.js tm-worker.js; do
  cp "$file" "dist/franchise/$file"
done

# Official TacticMesh browser runtime and required MIT license and notices.
cp tacticmesh/vendor/*.js tacticmesh/vendor/installed.json \
   tacticmesh/vendor/LICENSE tacticmesh/vendor/THIRD_PARTY_NOTICES.md \
   dist/franchise/tacticmesh/vendor/

# Validate HTML-linked resources, worker dependencies and strict deployment scope.
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
        if tag=="link" and d.get("href") and d.get("rel") in ("stylesheet","manifest"):self.refs.append(d["href"])
root=Path("dist").resolve()
pages=[root/"index.html",root/"challenge/index.html",root/"franchise/index.html"]
for page in pages:
    if not page.is_file():raise SystemExit(f"Missing page: {page}")
    parser=Resources();parser.feed(page.read_text())
    for ref in parser.refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc or url.path.startswith("/"):continue
        f=(page.parent/unquote(url.path)).resolve()
        if not f.is_relative_to(root) or not f.is_file():raise SystemExit(f"Missing or unsafe resource: {page}: {ref}")
for f in ["tm-worker.js","tacticmesh/vendor/installed.json","tacticmesh/vendor/core.js","tacticmesh/vendor/engine-facade.js","tacticmesh/vendor/LICENSE"]:
    if not (root/"franchise"/f).is_file():raise SystemExit("Missing TacticMesh runtime: "+f)
for forbidden in ["legacy-v07c","legacy-v05","tests",".github","calibration","MVP.md","tacticmesh/optimized","career.js","tm-worker.js","tacticmesh/vendor"]:
    if (root/forbidden).exists():raise SystemExit("Unwanted root content in public deployment: "+forbidden)
assert 'Home / Free Builder' in (root/"index.html").read_text()
assert 'Franchise · 32 Gyms' in (root/"franchise/index.html").read_text()
assert 'Challenges' in (root/"challenge/index.html").read_text()
print("PASS: only home/builder, challenges, and 32-gym franchise deployed")
PY

echo "Built clean three-section PokéFC playtest in dist/."
