#!/usr/bin/env python3
"""Local TacticMesh physics/AI multi-region stress runner for PokeFC v0.8.

Requires official pinned TacticMesh files installed. This is not Quick Sim;
results labeled PARTIAL unless a full regulation match completed.
"""
import argparse
import datetime as dt
import json
import pathlib
import shutil
import subprocess
import sys

ROOT=pathlib.Path(__file__).resolve().parent
REGIONS=[('Kanto',0),('Johto',8),('Hoenn',16),('Sinnoh',24)]

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--minutes',type=float,default=2,help='Simulated minutes per region (default 2; may be expensive)')
    p.add_argument('--regions',choices=['all','Kanto','Johto','Hoenn','Sinnoh'],default='all')
    p.add_argument('--no-install',action='store_true',help='Require already installed source; no network')
    args=p.parse_args()
    if not (0<args.minutes<90):p.error('For a full 90-minute match instead use run_90min_test.py --checkpoint')
    engine=ROOT/'tacticmesh/vendor/installed.json'
    if not engine.exists() and args.no_install:
        sys.exit('Genuine engine not installed. No mock results will be produced.')
    installer=[sys.executable,'tacticmesh/install_engine.py','--check'] if engine.exists() else [sys.executable,'tacticmesh/install_engine.py']
    if subprocess.run(installer,cwd=ROOT).returncode:
        sys.exit('TacticMesh source verification failed. No reference fabricated.')
    node=shutil.which('node')
    if not node:sys.exit('Node.js 20+ required')
    out=ROOT/'tm-stress';out.mkdir(exist_ok=True)
    results=[]
    choices=REGIONS if args.regions=='all' else [x for x in REGIONS if x[0]==args.regions]
    for region,club in choices:
        print(f'\n[REAL TACTICMESH] {region} | gym #{club} | {args.minutes:g} simulated minutes',flush=True)
        proc=subprocess.run([node,'tests/benchmark-90min.cjs',f'--club={club}',f'--profile-seconds={int(args.minutes*60)}'],cwd=ROOT)
        if proc.returncode:sys.exit(f'{region}: genuine engine stress run failed; no result accepted')
        result=json.loads((ROOT/'benchmark-profile-results.json').read_text())
        if result.get('complete90Minutes') is not False or result.get('verifiedFullMatch') is not False or result.get('ticks',0)<60:
            sys.exit('Invalid partial stress result')
        result['region']=region
        result['clubId']=club
        (out/(region.lower()+'-partial.json')).write_text(json.dumps(result,indent=2)+'\n')
        results.append(result)
    aggregate={'test':'Genuine pinned TacticMesh multi-region limited-duration stress',
       'notFullMatch':True,'officialCalibrationReference':False,
       'runAtUtc':dt.datetime.now(dt.timezone.utc).isoformat(),
       'gameMinutesPerMatch':args.minutes,'matches':len(results),
       'totalPhysicsTicks':sum(x['ticks'] for x in results),
       'totalWallSeconds':round(sum(x['wallSeconds'] for x in results),3),
       'regions':[{'region':x['region'],'ticks':x['ticks'],'wallSeconds':x['wallSeconds'],'score':x['score'],'events':x['events']} for x in results]}
    (out/'summary.json').write_text(json.dumps(aggregate,indent=2)+'\n')
    print('\nPARTIAL REAL-ENGINE STRESS PASSED:',json.dumps(aggregate,indent=2))
    print('This is not a full 90-minute match and MUST NOT be used for Quick Sim calibration.')

if __name__=='__main__':main()
