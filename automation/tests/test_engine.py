import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from automation.engine import SyncError, read_baseline, reconcile, write_outputs
from automation.source import SITES, ParsedPage

NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
XHTML = 'http://www.w3.org/1999/xhtml'
NOW = '2026-11-02T19:00:00Z'


def page(title='Page', text='Published text', fingerprint='a' * 64):
    return ParsedPage(title, (title,), text, (), (), fingerprint, True)


def seed(repo, alternatives=True):
    variants = {site.language: 'https://' + site.host + '/' for site in SITES}
    for site in SITES:
        root = ET.Element('urlset', xmlns=NS)
        node = ET.SubElement(root, 'url')
        ET.SubElement(node, 'loc').text = variants[site.language]
        if alternatives:
            for lang, href in {**variants, 'x-default': variants['es']}.items():
                ET.SubElement(node, '{' + XHTML + '}link', rel='alternate', hreflang=lang, href=href)
        ET.ElementTree(root).write(repo / ('sitemap-' + site.language + '.xml'), encoding='utf-8', xml_declaration=True)
    index = ET.Element('sitemapindex', xmlns=NS)
    for site in SITES:
        node = ET.SubElement(index, 'sitemap')
        ET.SubElement(node, 'loc').text = 'https://sitemaps.panamalegallab.com/sitemap-' + site.language + '.xml'
    ET.ElementTree(index).write(repo / 'sitemap-index.xml', encoding='utf-8', xml_declaration=True)
    return variants


class EngineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.urls = seed(self.repo)
        self.scan = {site.language: {self.urls[site.language]: page()} for site in SITES}
        self.missing = {site.language: set() for site in SITES}

    def outputs(self, now=NOW):
        return reconcile(read_baseline(self.repo), self.scan, self.missing, now)

    def test_initial_scan_creates_semantic_snapshots_and_reciprocal_sitemaps(self):
        outputs, summary = self.outputs()
        self.assertEqual(11, len(outputs))
        self.assertEqual({'es': 1, 'en': 1, 'fr': 1, 'it': 1}, summary['counts'])
        root = ET.fromstring(outputs['sitemap-es.xml'])
        self.assertEqual(self.urls['es'], root.find('{' + NS + '}url/{' + NS + '}loc').text)
        self.assertEqual(5, len(root.findall('.//{' + XHTML + '}link')))
        snapshot = json.loads(outputs['automation/data/published-es.json'])
        self.assertEqual('Published text', snapshot['pages'][0]['text'])
        self.assertIsNone(snapshot['pages'][0]['lastmod'])
        self.assertEqual(NOW, snapshot['pages'][0]['first_observed'])
        self.assertEqual([], root.findall('.//{' + NS + '}lastmod'))

    def test_unchanged_run_preserves_bytes_and_daily_health(self):
        first, _ = self.outputs()
        write_outputs(self.repo, first)
        second, _ = self.outputs('2026-11-02T20:00:00Z')
        self.assertEqual(first, second)
        third, _ = self.outputs('2026-11-03T00:00:00Z')
        changed = {key for key in third if third[key] != second[key]}
        self.assertEqual({'automation/data/health.json'}, changed)

    def test_body_change_updates_only_its_snapshot_lastmod_and_sitemap(self):
        first, _ = self.outputs()
        write_outputs(self.repo, first)
        self.scan['es'][self.urls['es']] = page(text='Changed', fingerprint='b' * 64)
        second, _ = self.outputs('2026-11-02T20:00:00Z')
        self.assertEqual(first['sitemap-en.xml'], second['sitemap-en.xml'])
        snapshot = json.loads(second['automation/data/published-es.json'])
        self.assertEqual('Changed', snapshot['pages'][0]['text'])
        self.assertEqual('2026-11-02T20:00:00Z', snapshot['pages'][0]['lastmod'])

    def test_new_page_has_no_invented_translation_links(self):
        new = 'https://www.panamalegallab.com/new-guide'
        self.scan['es'][new] = page('New guide')
        outputs, summary = self.outputs()
        root = ET.fromstring(outputs['sitemap-es.xml'])
        entries = root.findall('{' + NS + '}url')
        entry = next(node for node in entries if node.find('{' + NS + '}loc').text == new)
        self.assertEqual([], entry.findall('{' + XHTML + '}link'))
        self.assertEqual(1, summary['new_unpaired'])

    def test_missing_known_page_requires_two_complete_confirmations(self):
        first, _ = self.outputs()
        write_outputs(self.repo, first)
        # Keep the language root healthy and delete an additional page.
        extra = 'https://www.panamalegallab.com/old'
        self.scan['es'][extra] = page('Old')
        first, _ = self.outputs()
        write_outputs(self.repo, first)
        del self.scan['es'][extra]
        self.missing['es'].add(extra)
        pending, report = self.outputs('2026-11-02T20:00:00Z')
        self.assertIn(extra.encode(), pending['sitemap-es.xml'])
        self.assertEqual([extra], report['pending_removals'])
        write_outputs(self.repo, pending)
        removed, report = self.outputs('2026-11-02T21:00:00Z')
        self.assertNotIn(extra.encode(), removed['sitemap-es.xml'])
        self.assertEqual([extra], report['removed'])

    def test_missing_root_or_missing_scan_language_cannot_publish(self):
        self.scan['es'] = {}
        self.missing['es'].add(self.urls['es'])
        with self.assertRaises(SyncError):
            self.outputs()
        del self.scan['es']
        with self.assertRaises(SyncError):
            self.outputs()

    def test_incomplete_known_page_or_noindex_cannot_publish(self):
        write_outputs(self.repo, self.outputs()[0])
        del self.scan['it'][self.urls['it']]
        with self.assertRaises(SyncError):
            self.outputs()
        self.scan['it'][self.urls['it']] = ParsedPage('P', (), 'T', (), (), 'd' * 64, False)
        with self.assertRaises(SyncError):
            self.outputs()

    def test_invalid_or_nonreciprocal_sitemap_is_rejected(self):
        path = self.repo / 'sitemap-en.xml'
        text = path.read_text('utf-8').replace(self.urls['es'], 'https://www.panamalegallab.com/wrong')
        path.write_text(text, encoding='utf-8')
        with self.assertRaises(SyncError):
            read_baseline(self.repo)

    def test_write_output_allowlist_and_symlink_parents(self):
        with self.assertRaises(SyncError):
            write_outputs(self.repo, {'../outside.txt': b'bad'})
        with self.assertRaises(SyncError):
            write_outputs(self.repo, {'cloudflare/frontend/src/worker.js': b'bad'})

    def test_existing_home_alias_is_rejected_in_preferred_sitemap(self):
        path = self.repo / 'sitemap-es.xml'
        path.write_text(path.read_text('utf-8').replace(self.urls['es'], self.urls['es'] + 'inicio'), encoding='utf-8')
        with self.assertRaises(SyncError):
            read_baseline(self.repo)

    def test_unsafe_state_schema_and_invalid_now_fail_without_outputs(self):
        data = self.repo / 'automation/data'
        data.mkdir(parents=True)
        (data / 'state.json').write_text('{"schema_version": 999}', encoding='utf-8')
        with self.assertRaises(SyncError):
            read_baseline(self.repo)
        (data / 'state.json').unlink()
        with self.assertRaises(SyncError):
            self.outputs('not-a-date')

    def test_confirmed_new_page_lastmod_is_not_the_bootstrap_time(self):
        write_outputs(self.repo, self.outputs()[0])
        new = 'https://www.panamalegallab.com/new'
        self.scan['es'][new] = page('New')
        outputs, _ = self.outputs('2026-11-02T21:00:00Z')
        rows = json.loads(outputs['automation/data/published-es.json'])['pages']
        self.assertEqual('2026-11-02T21:00:00Z', next(row for row in rows if row['url'] == new)['lastmod'])
        self.assertIsNone(next(row for row in rows if row['url'] == self.urls['es'])['lastmod'])

    def test_mass_deletion_guard_and_reappearing_page(self):
        for number in range(20):
            self.scan['es']['https://www.panamalegallab.com/guide-' + str(number)] = page()
        write_outputs(self.repo, self.outputs()[0])
        removed = set(list(self.scan['es'])[1:6])
        for url in removed:
            del self.scan['es'][url]
        self.missing['es'] = removed
        with self.assertRaises(SyncError):
            self.outputs()
        for url in removed:
            self.scan['es'][url] = page()
        self.missing['es'] = set()
        url = next(iter(removed))
        del self.scan['es'][url]
        self.missing['es'] = {url}
        write_outputs(self.repo, self.outputs()[0])
        self.scan['es'][url] = page()
        self.missing['es'] = set()
        outputs, _ = self.outputs()
        self.assertEqual({}, json.loads(outputs['automation/data/state.json'])['missing'])

    def test_malformed_state_values_are_validation_failures(self):
        outputs, _ = self.outputs()
        write_outputs(self.repo, outputs)
        path = self.repo / 'automation/data/state.json'
        original = json.loads(path.read_text('utf-8'))
        for replacement in ([None], [[]], ['https://attacker.example/'], ['https://www.panamalegallab.com/'] * 2):
            with self.subTest(replacement=replacement):
                path.write_text(json.dumps({**original, 'tracked_urls': replacement}), encoding='utf-8')
                with self.assertRaises(SyncError):
                    read_baseline(self.repo)

    def test_xml_and_snapshot_corruption_do_not_reset_history(self):
        write_outputs(self.repo, self.outputs()[0])
        snapshot = self.repo / 'automation/data/published-it.json'
        snapshot.write_text('{"schema_version":1,"language":"it","pages":[]}', encoding='utf-8')
        with self.assertRaises(SyncError):
            read_baseline(self.repo)

    def test_immediate_repeat_cannot_confirm_a_page_deletion(self):
        extra = 'https://www.panamalegallab.com/delete-me'
        self.scan['es'][extra] = page('Old')
        write_outputs(self.repo, self.outputs()[0])
        del self.scan['es'][extra]
        self.missing['es'] = {extra}
        first, _ = self.outputs('2026-11-02T20:00:00Z')
        write_outputs(self.repo, first)
        repeated, report = self.outputs('2026-11-02T20:01:00Z')
        self.assertIn(extra.encode(), repeated['sitemap-es.xml'])
        self.assertEqual([extra], report['pending_removals'])
        self.assertEqual(first, repeated)
        final, report = self.outputs('2026-11-02T20:30:00Z')
        self.assertNotIn(extra.encode(), final['sitemap-es.xml'])
        self.assertEqual([extra], report['removed'])

    def test_conflicting_stored_translation_groups_are_rejected(self):
        write_outputs(self.repo, self.outputs()[0])
        path = self.repo / 'automation/data/state.json'
        state = json.loads(path.read_text('utf-8'))
        shared = 'https://www.panamalegallab.com/article'
        state['approved_groups'] = [
            {'es': shared, 'en': 'https://en.panamalegallab.com/article'},
            {'es': shared, 'fr': 'https://fr.panamalegallab.com/article'}]
        path.write_text(json.dumps(state), encoding='utf-8')
        with self.assertRaises(SyncError):
            read_baseline(self.repo)


if __name__ == '__main__':
    unittest.main()
