#!/usr/bin/env python3
"""Download and verify original TacticMesh modules, then run the genuine 90-minute PokeFC benchmark.

The original source must be fetched from GitHub; this does not use Quick Sim.
Writes match results into benchmark-90min-results.json and resumable checkpoints.
"""
import argparse
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
INSTALLER = ROOT / 'tacticmesh' / 'install_engine.py'
CHECKPOINT = ROOT / 'benchmark-90min-checkpoint.json'
BENCHMARK = ROOT / 'tests' / 'benchmark-90min.cjs'


def run(command):
    print('\n$ ' + ' '.join(str(x) for x in command), flush=True)
    return subprocess.call([str(x) for x in command], cwd=ROOT)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--club', type=int, default=24, help='Club index 0–31; default 24 is an actual Sinnoh fixture')
    parser.add_argument('--source', type=pathlib.Path, help='Offline original TacticMesh repo checkout (optional)')
    parser.add_argument('--fresh', action='store_true', help='Ignore an existing benchmark checkpoint; never delete it')
    args = parser.parse_args()
    if args.club < 0 or args.club > 31:
        parser.error('--club must be 0–31')
    node = shutil.which('node')
    if not node:
        print('Node.js 20+ is needed for the genuine full-match engine test.', file=sys.stderr)
        return 2
    if run([sys.executable, INSTALLER, '--check']) != 0:
        print('\nOriginal verified TacticMesh modules are not installed in this copy.', flush=True)
        cmd = [sys.executable, INSTALLER]
        if args.source:
            cmd += ['--source', args.source]
        if run(cmd) != 0:
            print('\nSource download failed. The match has NOT been run.', file=sys.stderr)
            print('This requires internet access to raw.githubusercontent.com, OR a local original', file=sys.stderr)
            print('TacticMesh repository checkout passed with --source /path/to/tacticmesh.', file=sys.stderr)
            return 2
    if run([sys.executable, INSTALLER, '--check']) != 0:
        print('Source verification failed. Not executing unverified code.', file=sys.stderr)
        return 2
    options = [node, BENCHMARK, f'--club={args.club}']
    if CHECKPOINT.exists() and not args.fresh:
        options += ['--resume']
        print('Using existing checkpoint. If it belongs to a different fixture, rerun with --fresh.', flush=True)
    else:
        options += ['--checkpoint']
    print('\nSTARTING FULL 90-MINUTE TM MATCH. The engine processes every 1/60-second tick.', flush=True)
    print('If interrupted, rerun this script to resume the most recent 15-minute checkpoint.\n', flush=True)
    result = run(options)
    if result == 0 and (ROOT / 'benchmark-90min-results.json').exists():
        print('\nGenuine full-match result: benchmark-90min-results.json', flush=True)
    return result


if __name__ == '__main__':
    raise SystemExit(main())
