#!/usr/bin/env bash
# Build a minimal static Challenge test site for SiteGround (or another static host).
# Only the Challenge UI and its required browser libraries are published.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist/challenge
cp challenge/index.html challenge/special-items-data.js dist/challenge/
cp species.js quick-sim.js calibration-profile.js dist/
cat > dist/index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>PokéFC | Challenge Playtest</title>
  <style>body{font:16px system-ui;background:#071a1c;color:#e8f7f2;min-height:90vh;display:grid;place-items:center;text-align:center}a{color:#8fe7b2;font-size:1.2rem}</style>
</head>
<body><main>
  <h1>PokéFC Challenge Playtest</h1>
  <p>This is a work-in-progress, unranked test build.</p>
  <a href="./challenge/">Launch Challenge Mode</a>
</main></body>
</html>
HTML
echo "Built Challenge playtest in dist/ (no full repository or franchise sources published)."
