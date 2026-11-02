from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit

from automation.crawl import FetchResponse
from automation.engine import run, write_outputs, SyncError
from automation.source import SITES, SourceError, source_url
from automation.sync_sites import main
from automation.tests.test_engine import seed, NOW


def document(site, public, text='Content', extra=''):
    return ('<!doctype html><html><head><title>Page</title>'
            '<link rel="canonical" href="' + public + '"></head><body '
            'data-domain="panamalegallab.com" data-sitename="' + site.source_prefix.rsplit('/', 1)[-1] + '">'
            '<main><h1>Page</h1></main><section><p>' + text + '</p>' + extra + '</section></body></html>').encode()


class RunTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.roots = seed(self.repo)
        self.native_calls = []
        self.public_calls = []

    def native(self, public, site):
        self.native_calls.append(public)
        return FetchResponse(200, source_url(public, site), {'Content-Type': 'text/html; charset=utf-8'}, document(site, public))

    def public(self, public, site):
        self.public_calls.append(public)
        return FetchResponse(200, public, {'Content-Type': 'text/html; charset=utf-8'}, document(site, public))

    def test_full_readonly_and_write_journeys_then_unchanged_no_churn(self):
        before = {p.name: p.read_bytes() for p in self.repo.iterdir()}
        result = run(self.repo, NOW, check=True, fetcher=self.native, public_fetcher=self.public)
        self.assertEqual('check', result['mode'])
        self.assertEqual(4, result['public_pages_verified'])
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.repo.iterdir()})
        result = run(self.repo, NOW, fetcher=self.native, public_fetcher=self.public)
        self.assertEqual(4, result['total'])
        self.assertTrue((self.repo / 'automation/data/state.json').exists())
        result = run(self.repo, '2026-11-02T21:00:00Z', fetcher=self.native, public_fetcher=self.public)
        self.assertEqual([], result['changed'])
        self.assertFalse(result['sitemap_changed'])
        self.assertEqual(4, result['public_pages_verified'])

    def test_new_linked_page_is_discovered_and_publicly_validated(self):
        new = 'https://www.panamalegallab.com/guide'
        def linked(public, site):
            extra = '<a href="' + new + '">Guide</a>' if site.language == 'es' and public == self.roots['es'] else ''
            return FetchResponse(200, source_url(public, site), {'Content-Type': 'text/html'}, document(site, public, extra=extra))
        result = run(self.repo, NOW, fetcher=linked, public_fetcher=self.public)
        self.assertIn(new, result['discovered'])
        self.assertEqual(5, result['total'])
        self.assertEqual(5, result['public_pages_verified'])
        self.assertIn(new, self.public_calls)
        state = json.loads((self.repo / 'automation/data/published-es.json').read_text('utf-8'))
        self.assertTrue(all(item['lastmod'] is None for item in state['pages']))

    def test_invalid_public_delivery_preserves_all_previous_files(self):
        before = {p.name: p.read_bytes() for p in self.repo.iterdir()}
        def fallback(public, site):
            return FetchResponse(302, public, {'Location': site.source_prefix}, b'')
        with self.assertRaises(SourceError):
            run(self.repo, NOW, fetcher=self.native, public_fetcher=fallback)
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.repo.iterdir()})

    def test_bad_source_aborts_without_partial_writes(self):
        def outage(public, site):
            if site.language == 'fr':
                return FetchResponse(503, source_url(public, site), {}, b'')
            return self.native(public, site)
        with self.assertRaises(SourceError):
            run(self.repo, NOW, fetcher=outage, public_fetcher=self.public)
        self.assertFalse((self.repo / 'automation').exists())

    def test_file_replacement_failure_restores_previous_bytes(self):
        old = {name: (self.repo / name).read_bytes() for name in ('sitemap-en.xml', 'sitemap-es.xml')}
        import os
        original_replace = os.replace
        calls = []
        def failing(source, target):
            calls.append(target)
            if len(calls) == 2:
                raise OSError('disk failure')
            return original_replace(source, target)
        with patch('automation.engine.os.replace', side_effect=failing):
            with self.assertRaises(SyncError):
                write_outputs(self.repo, {name: b'changed' for name in old})
        self.assertEqual(old, {name: (self.repo / name).read_bytes() for name in old})
        self.assertFalse(any(p.name.startswith('.sites-sync-') for p in self.repo.iterdir()))

    def test_cli_success_and_failure_messages(self):
        output = StringIO()
        with patch('automation.sync_sites.run', return_value={'mode': 'check', 'changed': []}) as operation:
            with redirect_stdout(output):
                self.assertEqual(0, main(['--repo', str(self.repo), '--check', '--now', NOW]))
        self.assertEqual('verified', json.loads(output.getvalue())['result'])
        operation.assert_called_once_with(self.repo, NOW, True)
        errors = StringIO()
        with patch('automation.sync_sites.run', side_effect=SourceError('Invalid site')):
            with redirect_stderr(errors):
                self.assertEqual(1, main(['--repo', str(self.repo)]))
        self.assertEqual('failed', json.loads(errors.getvalue())['result'])


if __name__ == '__main__':
    unittest.main()
