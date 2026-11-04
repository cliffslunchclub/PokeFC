#!/usr/bin/env python3
"""Run PokeFC's full 90-minute local TacticMesh test (no cloud required at runtime)."""
import pathlib, shutil, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parent
if not (ROOT/'tacticmesh/vendor/installed.json').exists():
    print('TacticMesh source not installed. First run: python3 tacticmesh/install_engine.py',flush=True)
    sys.exit(2)
node=shutil.which('node')
if not node:
    sys.exit('Node.js 20+ is required for local full-match testing: https://nodejs.org/')
print('Starting the real TacticMesh 90-minute benchmark. This can be CPU-intensive.',flush=True)
raise SystemExit(subprocess.call([node,str(ROOT/'tests/benchmark-90min.cjs'),*sys.argv[1:]],cwd=ROOT))
