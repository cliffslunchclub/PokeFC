#!/usr/bin/env python3
"""Install/check exact pinned upstream TacticMesh sources locally.

Only the installer fetches network files, once. --source supports an offline
upstream checkout. No GitHub write or PokeFC repository creation.
"""
import argparse
import hashlib
import json
import pathlib
import sys
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'vendor'
LOCK = json.loads((ROOT / 'source-lock.json').read_text(encoding='utf8'))
COMMIT = LOCK['commit']
FILES = LOCK['files']


def sha1blob(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode('ascii') + b'\0' + data).hexdigest()


def checked_bytes(data: bytes, source_path: str):
    if not 40 <= len(data) <= 500000:
        raise RuntimeError(f'Source size unexpected for {source_path}: {len(data)}')
    actual = sha1blob(data)
    if actual != FILES[source_path]:
        raise RuntimeError(f'Official source hash mismatch: {source_path}: {actual}')
    return data


def verify_installed():
    manifest_path = OUT / 'installed.json'
    if not manifest_path.is_file():
        raise RuntimeError('Official TacticMesh engine is not installed locally')
    manifest = json.loads(manifest_path.read_text(encoding='utf8'))
    if manifest.get('commit') != COMMIT:
        raise RuntimeError('Installed engine commit differs from pinned source lock')
    for original in FILES:
        target = OUT / pathlib.Path(original).name
        if not target.is_file():
            raise RuntimeError(f'Installed engine file missing: {target.name}')
        data = checked_bytes(target.read_bytes(), original)
        if manifest.get('files', {}).get(target.name) != hashlib.sha256(data).hexdigest():
            raise RuntimeError(f'Installed manifest checksum mismatch: {target.name}')
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--source', type=pathlib.Path, help='Offline TacticMesh repo checkout root')
    ap.add_argument('--check', action='store_true', help='Only verify existing local sources; no network access')
    args = ap.parse_args()
    if args.check:
        verify_installed()
        print(f'PASS: {len(FILES)} original TacticMesh files verified against pinned Git blob SHAs ({COMMIT[:12]}).')
        return
    source = args.source.resolve() if args.source else None
    if source and not (source / 'src' / 'core.js').is_file():
        ap.error('--source must be the root of the original TacticMesh repository')
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'source': f'https://github.com/{LOCK["repository"]}', 'commit': COMMIT,
                'files': {}, 'sourceHashes': dict(FILES)}
    with tempfile.TemporaryDirectory(prefix='.install-', dir=ROOT) as tmp:
        stage = pathlib.Path(tmp)
        for idx, original in enumerate(FILES, 1):
            print(f'[{idx}/{len(FILES)}] Verify pinned source {original}', flush=True)
            if source:
                data = (source / original).read_bytes()
            else:
                url = f'https://raw.githubusercontent.com/{LOCK["repository"]}/{COMMIT}/{original}'
                request = urllib.request.Request(url, headers={'User-Agent': 'PokeFC-local-engine-installer'})
                with urllib.request.urlopen(request, timeout=30) as response:
                    data = response.read()
            checked_bytes(data, original)
            target = pathlib.Path(original).name
            (stage / target).write_bytes(data)
            manifest['files'][target] = hashlib.sha256(data).hexdigest()
        # All downloaded files must pass pinned Git blob SHA checks before any
        # installed file is replaced. The manifest is written last.
        for original in FILES:
            target = pathlib.Path(original).name
            (stage / target).replace(OUT / target)
        (stage / 'installed.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
        (stage / 'installed.json').replace(OUT / 'installed.json')
    verify_installed()
    print('PASS: genuine pinned TacticMesh sources installed locally.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        sys.exit(f'TacticMesh installation/check failed: {exc}')
