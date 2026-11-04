#!/usr/bin/env python3
"""Run genuine pinned TacticMesh 90-minute matches + audit + fit locally.

Each full game is computationally expensive and may take many CPU minutes.
Completed reports are reused; incomplete matches resume at checkpoints.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
PYTHON = sys.executable
NODE = 'node'


def run(argv, stdout=None, stderr=None):
    return subprocess.run(argv, cwd=ROOT, stdout=stdout, stderr=stderr, check=False).returncode


def collect_one(index, logs=False):
    argv = [NODE, 'tests/collect-tm-reference.cjs', f'--start={index}', '--count=1']
    if not logs:
        return run(argv)
    log_path = ROOT / 'calibration' / f'tm-{index:05d}-runner.log'
    with log_path.open('w', encoding='utf8') as file:
        code = run(argv, stdout=file, stderr=subprocess.STDOUT)
    print(f'Fixture tm-{index:05d}: {"verified" if code == 0 else "FAILED"}; log: {log_path.relative_to(ROOT)}', flush=True)
    return code


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--matches', type=int, default=8, help='Number of authentic 90-minute matches (default: 8)')
    ap.add_argument('--start', type=int, default=0, help='Starting reference index')
    ap.add_argument('--jobs', type=int, default=1, help='Concurrent match processes (1 to 4; default 1)')
    ap.add_argument('--source', type=pathlib.Path, help='Use exact pinned original TacticMesh checkout offline')
    ap.add_argument('--no-install', action='store_true', help='Require an already-verified local engine installation')
    ap.add_argument('--dry-run', action='store_true', help='Only display actions; do not install, simulate or fit')
    args = ap.parse_args()
    if not 1 <= args.matches <= 1000 or not 0 <= args.start <= 100000 or not 1 <= args.jobs <= 4:
        ap.error('Require 1–1000 matches, nonnegative start <=100000 and 1–4 concurrent jobs')
    if args.source is not None and args.no_install:
        ap.error('Use either --source or --no-install, not both')
    indices = list(range(args.start, args.start + args.matches))
    print(f'PokeFC local calibration: indices {indices[0]}–{indices[-1]}, '
          f'{args.jobs} job(s), full 90-minute TacticMesh physics only.', flush=True)
    if args.dry_run:
        print('1. Verify existing engine, or install the exact upstream locked source.')
        print('2. Simulate/resume each requested match; save official reports and source-checked references.')
        print('3. Audit original match reports and report the provisional Quick Sim discrepancy.')
        print('4. Fit parameters only if at least eight full authentic references pass verification.')
        print('No work performed (dry run).')
        return 0
    install = [PYTHON, 'tacticmesh/install_engine.py']
    if args.source:
        install += ['--source', str(args.source)]
    if args.no_install:
        install += ['--check']
    elif not args.source and run(install + ['--check'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
        install += ['--check']
    if run(install):
        print('Engine installation/verification failed. No TacticMesh match reference was fabricated.', file=sys.stderr)
        return 1
    failures = []
    if args.jobs == 1:
        for i in indices:
            if collect_one(i):
                failures.append(i)
                break
    else:
        (ROOT / 'calibration').mkdir(exist_ok=True)
        with ThreadPoolExecutor(max_workers=args.jobs) as pool:
            futures = {pool.submit(collect_one, i, True): i for i in indices}
            for future in as_completed(futures):
                if future.result():
                    failures.append(futures[future])
    print('\nAuditing completed reference set:', flush=True)
    if run([NODE, 'tests/report-calibration.cjs']):
        print('Reference audit failed. Refusing to fit calibration.', file=sys.stderr)
        return 1
    if failures:
        print(f'Reference collection failed for: {failures}. Rerun the same command to resume checkpoints.', file=sys.stderr)
        return 1
    completed = len(list((ROOT / 'calibration' / 'references').glob('tm-*.json')))
    if completed < 8:
        print(f'Only {completed} authentic completed references. Fit requires at least 8; remaining provisional.')
        return 0
    print('\nFitting and testing held-out references:', flush=True)
    if run([NODE, 'tests/fit-profile.cjs']):
        print('Profile was not accepted; provisional model remains in effect.', file=sys.stderr)
        return 1
    print('Calibration profile accepted after held-out evaluation.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
