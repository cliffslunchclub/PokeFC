#!/usr/bin/env python3
"""Run the genuine 45-minute original TacticMesh first half locally.

Creates a real halftime match ledger and compares Quick Sim distributions without
activating a full-match calibration profile. Use --resume for a saved checkpoint.
"""
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
node = shutil.which('node')
if not node:
    sys.exit('Node.js is required (20+).')
if not (ROOT / 'tacticmesh/vendor/installed.json').exists():
    sys.exit('Original TacticMesh files missing; install them before running.')
raise SystemExit(subprocess.call([node, 'tests/benchmark-45min.cjs', *sys.argv[1:]], cwd=ROOT))
