import dataclasses
import unittest

from automation.source import SITES, SourceError, parse_page, public_url, source_url


def document(body='<h1>Consulta inicial</h1><p>Texto publicado.</p>', *, head='', marker='panamalegallab', nonce='one'):
    return (
        '<!doctype html><html><head><title>Panama Legal Lab - Consulta</title>'
        + head + f'<script nonce="{nonce}">window.token="{nonce}";</script></head>'
        + f'<body><div data-domain="panamalegallab.com" data-sitename="{marker}">'
        + '<nav><a href="/panamalegallab.com/panamalegallab/inicio">Inicio</a></nav>'
        + body + '</div><footer>Pie de página</footer>'
        + '<div data-cookie-path="/site">Google cookie notice</div></body></html>'
    )


class PublicUrlTests(unittest.TestCase):
    def setUp(self):
        self.site = SITES[0]
        self.base = self.site.source_prefix + '/guia-de-recursos'

    def test_four_fixed_sites_and_frozen_configuration(self):
        self.assertEqual([s.language for s in SITES], ['es', 'en', 'fr', 'it'])
        self.assertEqual(SITES[1].source_prefix, 'https://sites.google.com/panamalegallab.com/panamlegallab-en')
        with self.assertRaises(dataclasses.FrozenInstanceError):
            self.site.host = 'evil.test'

    def test_native_root_and_alias_become_public_root(self):
        for value in [self.site.source_prefix, self.site.source_prefix + '/',
                      '/panamalegallab.com/panamalegallab/inicio',
                      'https://www.panamalegallab.com/inicio', '/panamalegallab.com/panamalegallab/inicio/']:
            with self.subTest(value=value):
                self.assertEqual(public_url(value, self.site, self.base), 'https://www.panamalegallab.com/')

    def test_unicode_percent_normalization_preserves_case(self):
        values = ['/panamalegallab.com/panamalegallab/Guía-España',
                  '/panamalegallab.com/panamalegallab/Gu%c3%ada-Espa%c3%b1a']
        for value in values:
            self.assertEqual(public_url(value, self.site, self.base),
                             'https://www.panamalegallab.com/Gu%C3%ADa-Espa%C3%B1a')

    def test_relative_links_and_fragments(self):
        self.assertEqual(public_url('guia-hija#requisitos', self.site, self.base + '/'),
                         'https://www.panamalegallab.com/guia-de-recursos/guia-hija')
        self.assertEqual(public_url('#requisitos', self.site, self.base),
                         'https://www.panamalegallab.com/guia-de-recursos')

    def test_public_absolute_is_allowed_only_for_same_language(self):
        self.assertEqual(public_url('https://www.panamalegallab.com/contacto', self.site, self.base),
                         'https://www.panamalegallab.com/contacto')
        self.assertIsNone(public_url('https://en.panamalegallab.com/contact-us', self.site, self.base))

    def test_unsafe_or_noncontent_urls_are_ignored(self):
        values = [
            'http://www.panamalegallab.com/contacto', 'https://evil.test/contacto',
            'https://www.panamalegallab.com.evil.test/contacto',
            'https://user:pass@www.panamalegallab.com/contacto',
            'https://www.panamalegallab.com:443/contacto',
            'https://sites.google.com/panamalegallab.com/panamalegallab-evil/contacto',
            'https://sites.google.com/panamalegallab.com/panamlegallab-en/contacto',
            '/panamalegallab.com/panamalegallab/contacto?x=1',
            '/panamalegallab.com/panamalegallab/search',
            '/panamalegallab.com/panamalegallab/_/internal',
            '/panamalegallab.com/panamalegallab/system/app/pages/recentChanges',
            '/panamalegallab.com/panamalegallab/a/../b',
            '/panamalegallab.com/panamalegallab/a/%2e%2e/b',
            '/panamalegallab.com/panamalegallab/a%2fb',
            '/panamalegallab.com/panamalegallab/a%5cb',
            '/panamalegallab.com/panamalegallab/a%252fb',
            '/panamalegallab.com/panamalegallab/a%00b',
            '/panamalegallab.com/panamalegallab/a%FFb',
            '/panamalegallab.com/panamalegallab/a%2',
            '/panamalegallab.com/panamalegallab/a\\b',
            ' javascript:alert(1)', 'mailto:info@panamalegallab.com', '//evil.test/a',
            '\nhttps://www.panamalegallab.com/contacto',
            '/panamalegallab.com/panamalegallab/' + 'x' * 4097,
        ]
        for value in values:
            with self.subTest(value=value[:120]):
                self.assertIsNone(public_url(value, self.site, self.base))

    def test_source_url_is_fixed_and_requires_same_public_host(self):
        self.assertEqual(source_url('https://www.panamalegallab.com/contacto', self.site),
                         self.site.source_prefix + '/contacto')
        self.assertEqual(source_url('https://www.panamalegallab.com/', self.site), self.site.source_prefix + '/')
        for value in ['https://evil.test/', 'https://www.panamalegallab.com/a?b=1',
                      'https://www.panamalegallab.com/a%252fb', 'http://www.panamalegallab.com/a']:
            with self.subTest(value=value), self.assertRaises(SourceError):
                source_url(value, self.site)


class PageParserTests(unittest.TestCase):
    def setUp(self):
        self.site = SITES[0]
        self.url = self.site.source_prefix + '/contacto'

    def parse(self, html=None, headers=None):
        return parse_page(html or document(), self.site, self.url, headers or {})

    def test_semantic_text_title_headings_and_nav_link_discovery(self):
        page = self.parse(document('<main><h1>Con<span>sulta</span></h1></main><p>Texto <b>publicado</b>.</p>'))
        self.assertEqual(page.title, 'Panama Legal Lab - Consulta')
        self.assertEqual(page.h1, ('Consulta',))
        self.assertEqual(page.text, 'Consulta Texto publicado.')
        self.assertEqual(page.links, ('https://www.panamalegallab.com/',))
        self.assertTrue(page.indexable)
        self.assertRegex(page.fingerprint, r'^[a-f0-9]{64}$')

    def test_scripts_styles_cookies_footer_and_chrome_do_not_leak(self):
        html = document('<h1>Consulta</h1><script>privateGoogleApiKey</script><style>.SECRET{}</style>'
                        '<noscript>hidden</noscript><svg><text>hidden SVG</text></svg>'
                        '<iframe src="https://example.com">hidden frame</iframe>'
                        '<button>Denunciar abuso</button><div hidden>Hidden</div>'
                        '<div aria-hidden="true">Hidden aria</div>'
                        '<div style="display:none">Hidden CSS</div><p>Contenido</p>')
        page = self.parse(html)
        self.assertEqual(page.text, 'Consulta Contenido')
        self.assertNotIn('privateGoogleApiKey', str(page))
        self.assertNotIn('Google cookie notice', str(page))

    def test_volatile_scripts_nonces_and_whitespace_do_not_change_digest(self):
        first = self.parse(document('<h1>Consulta</h1><p>Texto publicado.</p>', nonce='one'))
        second = self.parse(document('<h1>Consulta</h1>\n<p>Texto   publicado.</p>', nonce='two'))
        self.assertEqual(first.fingerprint, second.fingerprint)

    def test_navigation_and_footer_link_changes_do_not_falsify_article_modification(self):
        original = document()
        changed = original.replace('panamalegallab/inicio', 'panamalegallab/nueva-navegacion')
        first, second = self.parse(original), self.parse(changed)
        self.assertNotEqual(first.links, second.links)
        self.assertEqual(first.fingerprint, second.fingerprint)

    def test_same_text_but_changed_content_link_target_changes_fingerprint(self):
        first = document('<h1>Consulta</h1><a href="https://www.panamalegallab.com/uno">Más</a>')
        second = first.replace('/uno', '/dos')
        self.assertNotEqual(self.parse(first).fingerprint, self.parse(second).fingerprint)

    def test_external_body_links_affect_digest_without_entering_discovery(self):
        original = document('<h1>Consulta</h1><a href="https://example.com/one">Más</a>')
        changed = original.replace('example.com/one', 'example.com/two')
        first, second = self.parse(original), self.parse(changed)
        self.assertEqual(first.links, second.links)
        self.assertNotEqual(first.fingerprint, second.fingerprint)
        for first_target, second_target in [('mailto:info@example.com', 'mailto:contact@example.com'),
                                            ('tel:+5071234', 'tel:+5075678')]:
            self.assertNotEqual(self.parse(document(f'<h1>Consulta</h1><a href="{first_target}">Contacto</a>')).fingerprint,
                                self.parse(document(f'<h1>Consulta</h1><a href="{second_target}">Contacto</a>')).fingerprint)

    def test_google_redirect_tracking_does_not_change_semantic_digest(self):
        original = document('<h1>Consulta</h1><a href="https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fone&amp;usg=one&amp;sntz=1">Más</a>')
        changed = original.replace('usg=one', 'usg=two').replace('sntz=1', 'sntz=2')
        direct = document('<h1>Consulta</h1><a href="https://example.com/one">Más</a>')
        self.assertEqual(self.parse(original).fingerprint, self.parse(changed).fingerprint)
        self.assertEqual(self.parse(original).fingerprint, self.parse(direct).fingerprint)

    def test_empty_branded_shell_and_empty_headings_are_rejected(self):
        for body in ['', '<h1> </h1>', '<p>Content without its expected heading</p>']:
            with self.subTest(body=body), self.assertRaises(SourceError):
                self.parse(document(body))

    def test_unrelated_partial_marker_attributes_do_not_override_site_identity(self):
        self.assertTrue(self.parse(document('<h1>Consulta</h1><div data-domain="external.example">Texto</div>')).indexable)

    def test_real_text_title_link_and_image_edits_change_digest(self):
        first = self.parse(document('<h1>Consulta</h1><p>Texto publicado.</p>'))
        variations = [document('<h1>Consulta nueva</h1><p>Texto publicado.</p>'),
                      document('<h1>Consulta</h1><p>Texto actualizado.</p>'),
                      document('<h1>Consulta</h1><p>Texto publicado.</p><a href="https://www.panamalegallab.com/nueva">Más</a>'),
                      document('<h1>Consulta</h1><p>Texto publicado.</p><img src="https://lh7.googleusercontent.com/new">'),
                      document().replace('<title>Panama Legal Lab - Consulta</title>', '<title>Otro título</title>')]
        for html in variations:
            with self.subTest(html=html[-80:]):
                self.assertNotEqual(first.fingerprint, self.parse(html).fingerprint)

    def test_links_are_deduplicated_sorted_and_include_footer_discovery(self):
        html = document('<h1>Consulta</h1><a href="https://www.panamalegallab.com/z">Z</a>'
                        '<a href="/panamalegallab.com/panamalegallab/a">A</a>'
                        '<a href="https://www.panamalegallab.com/z#x">Z</a>')
        html = html.replace('<footer>', '<footer><a href="https://www.panamalegallab.com/aviso">Legal</a>')
        self.assertEqual(self.parse(html).links, (
            'https://www.panamalegallab.com/', 'https://www.panamalegallab.com/a',
            'https://www.panamalegallab.com/aviso', 'https://www.panamalegallab.com/z'))

    def test_image_and_inline_background_changes_are_captured(self):
        page = self.parse(document('<h1>Consulta</h1><img src="https://lh7.googleusercontent.com/a" alt="Foto">'
                                   '<div style="background-image:url(\'https://sites.google.com/sitesv-images-rt/b\')">Texto</div>'
                                   '<img src="data:image/png;base64,SECRET">'))
        self.assertEqual(page.images, ('https://lh7.googleusercontent.com/a',
                                      'https://sites.google.com/sitesv-images-rt/b'))

    def test_robot_noindex_and_none_are_reported_without_guessing_deletion(self):
        for head in ['<meta name="robots" content="noindex,nofollow">',
                     '<meta name="googlebot" content="none">']:
            self.assertFalse(self.parse(document(head=head)).indexable)
        self.assertFalse(self.parse(headers={'X-Robots-Tag': 'googlebot: noindex'}).indexable)

    def test_wrong_site_missing_marker_bad_shape_or_external_canonical_fail(self):
        bad = [document(marker='wrong-site'), document().replace('panamalegallab.com" data-sitename', 'evil.test" data-sitename'),
               '<html><head><title>Login</title></head><body>Sign in</body></html>',
               document().replace('<body>', '').replace('</body>', ''),
               document().replace('<title>Panama Legal Lab - Consulta</title>', ''),
               document(head='<link rel="canonical" href="https://evil.test/a">')]
        for html in bad:
            with self.subTest(html=html[:140]), self.assertRaises(SourceError):
                self.parse(html)

    def test_same_native_or_public_canonical_is_allowed(self):
        for canonical in [self.url, 'https://www.panamalegallab.com/contacto']:
            page = self.parse(document(head=f'<link rel="canonical" href="{canonical}">'))
            self.assertTrue(page.indexable)

    def test_other_language_identity_and_home_aliases(self):
        for site in SITES[1:]:
            with self.subTest(language=site.language):
                html = document(marker=site.source_prefix.rsplit('/', 1)[-1])
                page = parse_page(html, site, site.source_prefix + '/', {})
                self.assertTrue(page.indexable)
                self.assertEqual(public_url('https://' + site.host + site.home_alias, site, site.source_prefix),
                                 'https://' + site.host + '/')


if __name__ == '__main__':
    unittest.main()
