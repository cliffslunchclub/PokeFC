#!/usr/bin/env bash
# Build the public, browser-playable portions of PokéFC from the private repo.
# Deployment is scoped to the pfc subdomain; do not publish repo internals.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist/challenge dist/legacy-v07c dist/tacticmesh/vendor dist/legacy-v07c/tacticmesh/vendor

# Current 32-gym Franchise: browser UI, Quick Sim, watched-match bridge.
cp index.html career.css career.js species.js calibration-profile.js \
   quick-sim.js hybrid-sim.js tm-engine-bridge.js tactical-viewer.js tm-worker.js dist/

# Challenge uses the same core species and Quick Sim runtime.
cp challenge/index.html challenge/special-items-data.js dist/challenge/

# Archived 16-gym Franchise for comparison/testing (not the retired Arcade).
for file in index.html career.css career.js species.js calibration-profile.js \
            quick-sim.js hybrid-sim.js tm-engine-bridge.js tactical-viewer.js tm-worker.js; do
  cp "legacy-v07c/$file" "dist/legacy-v07c/$file"
done

# Watched games import the upstream, pinned TacticMesh JS from worker scripts.
# Keep the upstream MIT license and notices with every redistributed copy.
cp tacticmesh/vendor/*.js tacticmesh/vendor/installed.json \
   tacticmesh/vendor/LICENSE tacticmesh/vendor/THIRD_PARTY_NOTICES.md \
   dist/tacticmesh/vendor/
cp dist/tacticmesh/vendor/* dist/legacy-v07c/tacticmesh/vendor/

# Make the archived interface point back to supported experiences; the old
# classic builder/Arcade is intentionally not deployed.
python3 - <<'PY'
from pathlib import Path
root = Path("dist")
main = root / "index.html"
s = main.read_text()
s = s.replace('<a href="./legacy-v05/index.html">Classic Builder ↗</a>', '')
s = s.replace('<a href="./README.md">Release notes</a>', 'Playtest build')
main.write_text(s)
archived = root / "legacy-v07c" / "index.html"
s = archived.read_text()
s = s.replace('<a href="./legacy-v05/index.html">Classic Builder ↗</a>',
              '<a href="../index.html">32-Gym Franchise ↗</a>')
s = s.replace('<button data-view="challenge">Challenge Mode <span class="soon">LATER</span></button>',
              '<a href="../challenge/index.html">Challenge Mode ↗</a>')
s = s.replace('<a href="./README.md">Release notes</a>', 'Archived playtest')
archived.write_text(s)
career = root / "legacy-v07c" / "career.js"
s = career.read_text().replace('href="./legacy-v05/index.html"', 'href="../index.html"')
career.write_text(s)
PY

# Confirm linked local resources are present in the deploy artifact.
python3 - <<'PY'
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs=[]
    def handle_starttag(self, tag, attrs):
        values=dict(attrs)
        if tag == "script" and values.get("src"):
            self.refs.append(values["src"])
        elif tag == "link" and values.get("href") and values.get("rel") in ("stylesheet", "manifest"):
            self.refs.append(values["href"])
root=Path("dist")
for page in [root/"index.html", root/"challenge/index.html", root/"legacy-v07c/index.html"]:
    parser=Resources()
    parser.feed(page.read_text())
    for ref in parser.refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc or url.path.startswith("/"):
            continue
        target=(page.parent/unquote(url.path)).resolve()
        if not target.is_file() or not target.is_relative_to(root.resolve()):
            raise SystemExit(f"Missing or unsafe resource from {page}: {ref}")
for area in [root,root/"legacy-v07c"]:
    manifest=area/"tacticmesh/vendor/installed.json"
    if not manifest.is_file():
        raise SystemExit(f"Missing TacticMesh manifest: {manifest}")
    for name in ["core.js", "engine-facade.js", "LICENSE"]:
        if not (manifest.parent/name).is_file():
            raise SystemExit(f"Missing TacticMesh resource: {manifest.parent/name}")
for forbidden in ["tests",".github","legacy-v05","calibration","tacticmesh/optimized","MVP.md"]:
    if (root/forbidden).exists():
        raise SystemExit(f"Internal source unexpectedly published: {forbidden}")
print("PASS SiteGround dist validation: Franchise, Challenge, archived Franchise, and TacticMesh dependencies")
PY

echo "Built SiteGround PokéFC playtest in dist/: 32-gym Franchise, Challenge, 16-gym archive."
