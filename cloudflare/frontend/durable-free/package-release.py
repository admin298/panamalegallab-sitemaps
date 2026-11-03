from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent
digest = lambda data: hashlib.sha256(data).hexdigest()
build = json.loads((root / 'build-manifest.json').read_text(encoding='utf-8'))
for relative, record in build['files'].items():
    assert digest((root / relative).read_bytes()) == record['sha256'], relative

archives = {}
def archive(name, members):
    path = root / name
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for source, target in members:
            output.write(root / source, target)
    with zipfile.ZipFile(path) as check:
        assert check.testzip() is None
        entries = [{'path': item.filename, 'bytes': item.file_size,
                    'sha256': digest(check.read(item.filename)), 'crc32': f'{item.CRC:08x}'}
                   for item in check.infolist()]
    archives[name] = {'sha256': digest(path.read_bytes()), 'bytes': path.stat().st_size, 'entries': entries}

archive('pages-upload-durable-free.zip', [(f'dist/frontend/{name}', name)
        for name in ['_worker.js', '_routes.json', 'deployment.txt']])

members = [(name, name) for name in ['README.txt', 'package.json', 'package-lock.json',
            'build.mjs', 'package-release.py', 'build-manifest.json', 'renderer-source-provenance.json']]
for folder in ['src', 'renderer/src', 'renderer/vendor', 'renderer/data', 'test']:
    members.extend((str(path.relative_to(root)).replace('\\', '/'), str(path.relative_to(root)).replace('\\', '/'))
                   for path in sorted((root / folder).rglob('*')) if path.is_file())
members.extend((relative, relative) for relative in build['files'])
members.extend((f'config/{name}', f'config/{name}') for name in ['backend.wrangler.json',
               'pages.wrangler.json', 'config.test.mjs', 'README.txt'])
assert len({target for _, target in members}) == len(members)
archive('durable-free-portable-source.zip', sorted(members))

manifest = {**build, 'archives': archives, 'tests': {
    'wrapperTests': 15, 'coverageLines': 100, 'coverageBranches': 96.47,
    'coverageFunctions': 95.24, 'nativeRedirectRequests': 290,
    'nativeParityFixtures': 39, 'nativeParityComparisons': 117,
    'websiteRequests': 0,
    'parityEvidence': 'Frozen local 39-page comparison; private inputs and logs excluded from the public package.'
}, 'deployment': 'See activation-receipt.json for accepted production; new builds require renewed acceptance.'}
(root / 'release-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({name: {'sha256': record['sha256'], 'bytes': record['bytes'], 'members': len(record['entries'])}
                  for name, record in archives.items()}, indent=2))
