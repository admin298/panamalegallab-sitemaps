import unittest
from unittest.mock import call, patch
from io import BytesIO
from datetime import datetime, timezone
from email.utils import format_datetime
from urllib.error import HTTPError, URLError

from automation.crawl import FetchResponse, crawl_all, fetch_native, fetch_public, validate_public_pages
from automation.source import SITES, SourceError, source_url
from automation import crawl


def html(site, *, links=(), canonical=None, noindex=False):
    marker = site.source_prefix.rsplit('/', 1)[-1]
    meta = '<meta name="robots" content="noindex">' if noindex else ''
    link = f'<link rel="canonical" href="{canonical}">' if canonical else ''
    anchors = ''.join(f'<a href="{url}">Página</a>' for url in links)
    return (f'<html><head><title>Test {site.language}</title>{link}{meta}</head><body>'
            f'<div data-domain="panamalegallab.com" data-sitename="{marker}">'
            f'<h1>Publicado</h1>{anchors}</div></body></html>').encode()


def response(site, public, *, links=(), status=200, canonical=None, noindex=False):
    return FetchResponse(status, source_url(public, site), {'Content-Type': 'text/html; charset=utf-8'},
                         html(site, links=links, canonical=canonical, noindex=noindex))


class CrawlTests(unittest.TestCase):
    def test_all_four_roots_and_recursive_links_plus_previous_orphan_are_checked(self):
        visited = []
        old = 'https://www.panamalegallab.com/old-unlinked'
        def fetch(public, site):
            visited.append(public)
            links = [f'https://{site.host}/category'] if public.endswith('/') else []
            if public.endswith('/category'):
                links = [f'https://{site.host}/new-article']
            return response(site, public, links=links)
        pages, missing = crawl_all({'es': {old}}, fetch)
        self.assertEqual({key: len(value) for key, value in pages.items()}, {'es': 4, 'en': 3, 'fr': 3, 'it': 3})
        self.assertEqual(missing, {site.language: set() for site in SITES})
        self.assertIn(old, visited)
        self.assertEqual(len(visited), len(set(visited)))

    def test_missing_previous_page_is_returned_without_assuming_replacement(self):
        old = 'https://www.panamalegallab.com/removed'
        def fetch(public, site):
            return response(site, public, status=410 if public == old else 200)
        pages, missing = crawl_all({'es': {old}}, fetch)
        self.assertEqual(missing['es'], {old})
        self.assertNotIn(old, pages['es'])

    def test_root_missing_and_transient_errors_abort_whole_crawl(self):
        for status in [404, 403, 429, 500]:
            with self.subTest(status=status), self.assertRaises(SourceError):
                crawl_all({}, lambda public, site: response(site, public, status=status))

    def test_noindex_login_wrong_site_and_bad_encoding_abort(self):
        for body in [b'<html><title>Login</title></html>', b'\xff']:
            with self.subTest(body=body), self.assertRaises(SourceError):
                crawl_all({}, lambda public, site: FetchResponse(200, source_url(public, site),
                    {'Content-Type': 'text/html'}, body))
        with self.assertRaises(SourceError):
            crawl_all({}, lambda public, site: response(site, public, noindex=True))

    def test_unexpected_source_redirect_does_not_invent_a_move(self):
        def fetch(public, site):
            return FetchResponse(200, site.source_prefix + '/different-page',
                                 {'Content-Type': 'text/html'}, html(site))
        with self.assertRaises(SourceError):
            crawl_all({}, fetch)

    def test_unknown_language_or_external_seed_is_rejected(self):
        with self.assertRaises(SourceError):
            crawl_all({'de': set()}, lambda public, site: response(site, public))
        with self.assertRaises(SourceError):
            crawl_all({'es': {'https://evil.test/'}}, lambda public, site: response(site, public))

    def test_site_cap_prevents_unbounded_published_link_graph(self):
        def fetch(public, site):
            return response(site, public, links=[f'https://{site.host}/p-{i}' for i in range(250)])
        with self.assertRaises(SourceError):
            crawl_all({}, fetch)


class PublicValidationTests(unittest.TestCase):
    def test_public_validation_checks_exact_canonical_site_and_indexability(self):
        urls = [f'https://{site.host}/' for site in SITES]
        def fetch(public, site):
            return FetchResponse(200, public, {'Content-Type': 'text/html'}, html(site, canonical=public))
        self.assertEqual(validate_public_pages(urls, fetch), 4)

    def test_public_missing_redirect_fallback_canonical_and_noindex_are_rejected(self):
        site = SITES[0]
        public = f'https://{site.host}/'
        variants = [
            FetchResponse(302, public, {'Content-Type': 'text/html'}, html(site, canonical=public)),
            FetchResponse(200, public + 'different', {'Content-Type': 'text/html'}, html(site, canonical=public)),
            FetchResponse(200, public, {'Content-Type': 'text/html', 'X-PLL-Delivery': 'google-source-fallback'}, html(site, canonical=public)),
            FetchResponse(200, public, {'Content-Type': 'text/html'}, html(site)),
            FetchResponse(200, public, {'Content-Type': 'text/html'}, html(site, canonical=public, noindex=True)),
        ]
        for result in variants:
            with self.subTest(result=result), self.assertRaises(SourceError):
                validate_public_pages([public], lambda public, site: result)

    def test_external_public_target_is_rejected_before_fetch(self):
        with self.assertRaises(SourceError):
            validate_public_pages(['https://evil.test/'], lambda public, site: self.fail('Must not fetch'))


class NativeHttpTests(unittest.TestCase):
    def test_http_transport_has_no_session_headers_and_checks_size(self):
        class Result(BytesIO):
            status = 200
            headers = {'Content-Type': 'text/html'}
            def geturl(self):
                return SITES[0].source_prefix + '/'
        class Opener:
            def open(self, request, timeout):
                self.request = request
                self.timeout = timeout
                return Result(b'<html>published</html>')
        opener = Opener()
        with patch('automation.crawl.build_opener', return_value=opener):
            result = crawl._request(SITES[0].source_prefix + '/', SITES[0])
        self.assertEqual(result.status, 200)
        self.assertEqual(opener.timeout, 20)
        self.assertEqual(set(dict(opener.request.header_items())),
                         {'Accept', 'Accept-language', 'Accept-encoding', 'User-agent'})
        self.assertEqual(opener.request.get_header('Accept-encoding'), 'identity')
        self.assertIsNone(opener.request.get_header('Cookie'))
        with patch('automation.crawl.MAX_HTML_BYTES', 4), patch('automation.crawl.build_opener', return_value=opener), self.assertRaises(SourceError):
            crawl._request(SITES[0].source_prefix + '/', SITES[0])

    def test_http_errors_are_preserved_and_transport_failures_abort(self):
        url = SITES[0].source_prefix + '/missing'
        missing = HTTPError(url, 404, 'Not found', {'Content-Type': 'text/html'}, BytesIO(b'Not found'))
        with patch('automation.crawl.build_opener') as build:
            build.return_value.open.side_effect = missing
            result = crawl._request(url, SITES[0])
            self.assertEqual((result.status, result.body), (404, b'Not found'))
        with patch('automation.crawl.build_opener') as build:
            build.return_value.open.side_effect = URLError('timeout')
            with patch('automation.crawl.time.sleep'), self.assertRaises(SourceError):
                crawl._request(url, SITES[0])

    def test_redirect_handler_never_automatically_follows(self):
        self.assertIsNone(crawl._NoRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.test/'))

    def test_native_client_constructs_fixed_source_and_follows_only_same_site(self):
        site, public = SITES[0], 'https://www.panamalegallab.com/contacto'
        first = FetchResponse(302, source_url(public, site), {'Location': '/panamalegallab.com/panamalegallab/contacto/'}, b'')
        final = FetchResponse(200, source_url(public, site) + '/', {'Content-Type': 'text/html'}, html(site))
        with patch('automation.crawl._request', side_effect=[first, final]) as request:
            self.assertEqual(fetch_native(public, site), final)
            self.assertEqual(request.call_args_list[0].args[0], site.source_prefix + '/contacto')
        for destination in ['https://evil.test/', 'https://sites.google.com/other-site/',
                            'https://user:secret@sites.google.com/panamalegallab.com/panamalegallab/',
                            site.source_prefix + '/login?token=private']:
            with self.subTest(destination=destination), patch('automation.crawl._request', return_value=FetchResponse(
                    302, source_url(public, site), {'Location': destination}, b'')), self.assertRaises(SourceError):
                fetch_native(public, site)

    def test_redirect_cap_and_public_client_does_not_follow(self):
        site, public = SITES[0], 'https://www.panamalegallab.com/contacto'
        redirected = FetchResponse(302, public, {'Location': public}, b'')
        with patch('automation.crawl._request', return_value=redirected) as request:
            self.assertEqual(fetch_public(public, site), redirected)
            self.assertEqual(request.call_count, 1)
        native_redirect = FetchResponse(302, source_url(public, site), {'Location': source_url(public, site)}, b'')
        with patch('automation.crawl._request', return_value=native_redirect), self.assertRaises(SourceError):
            fetch_native(public, site)

    def test_redirect_location_is_validated_before_urljoin_can_normalize_it(self):
        site, public = SITES[0], 'https://www.panamalegallab.com/contacto'
        for location in ['\n' + site.source_prefix + '/contacto', 'nested/../contacto', 'https://[bad']:
            first = FetchResponse(302, source_url(public, site), {'Location': location}, b'')
            final = FetchResponse(200, source_url(public, site), {'Content-Type': 'text/html'}, html(site))
            with self.subTest(location=location), patch('automation.crawl._request', side_effect=[first, final]) as request:
                with self.assertRaises(SourceError):
                    fetch_native(public, site)
                self.assertEqual(request.call_count, 1)


class RetryTests(unittest.TestCase):
    def setUp(self):
        self.site = SITES[0]
        self.url = self.site.source_prefix + '/contacto'
        self.success = FetchResponse(200, self.url, {'Content-Type': 'text/html'}, html(self.site))

    def transient(self, status=503, retry_after=None):
        headers = {'Retry-After': retry_after} if retry_after is not None else {}
        return FetchResponse(status, self.url, headers, b'Temporarily unavailable')

    def test_transport_retries_same_url_three_times_with_one_and_three_second_waits(self):
        with patch('automation.crawl._request_once', side_effect=[URLError('offline'), TimeoutError('slow'), self.success]) as request:
            with patch('automation.crawl.time.sleep') as sleep:
                self.assertEqual(crawl._request(self.url, self.site), self.success)
        self.assertEqual(request.call_args_list, [call(self.url, self.site)] * 3)
        self.assertEqual(sleep.call_args_list, [call(1), call(3)])

    def test_only_selected_transient_status_codes_retry_and_recover(self):
        for status in [429, 502, 503, 504]:
            with self.subTest(status=status), patch('automation.crawl._request_once', side_effect=[self.transient(status), self.success]) as request:
                with patch('automation.crawl.time.sleep') as sleep:
                    self.assertEqual(crawl._request(self.url, self.site), self.success)
                    self.assertEqual(request.call_args_list, [call(self.url, self.site)] * 2)
                    sleep.assert_called_once_with(1)

    def test_third_failure_aborts_without_fourth_request(self):
        for result in [self.transient(), URLError('offline'), OSError('reset')]:
            with self.subTest(result=result), patch('automation.crawl._request_once', side_effect=[result] * 3) as request:
                with patch('automation.crawl.time.sleep') as sleep, self.assertRaises(SourceError):
                    crawl._request(self.url, self.site)
            self.assertEqual(request.call_args_list, [call(self.url, self.site)] * 3)
            self.assertEqual(sleep.call_args_list, [call(1), call(3)])

    def test_definitive_status_redirect_and_schema_like_200_are_not_retried(self):
        for status in [200, 301, 302, 303, 307, 308, 401, 403, 404, 410, 500]:
            result = FetchResponse(status, self.url, {}, b'Not necessarily valid site HTML')
            with self.subTest(status=status), patch('automation.crawl._request_once', return_value=result) as request:
                with patch('automation.crawl.time.sleep') as sleep:
                    self.assertEqual(crawl._request(self.url, self.site), result)
                    request.assert_called_once_with(self.url, self.site)
                    sleep.assert_not_called()

    def test_retry_after_seconds_and_http_date_are_honored(self):
        future = format_datetime(datetime.fromtimestamp(1010, timezone.utc), usegmt=True)
        for header, expected in [('7', 7), ('0', 0), ('20', 20), (future, 10)]:
            with self.subTest(header=header), patch('automation.crawl._request_once', side_effect=[self.transient(retry_after=header), self.success]):
                with patch('automation.crawl.time.time', return_value=1000), patch('automation.crawl.time.sleep') as sleep:
                    self.assertEqual(crawl._request(self.url, self.site), self.success)
                    sleep.assert_called_once_with(expected)

    def test_retry_after_over_twenty_seconds_defers_without_an_early_retry(self):
        future = format_datetime(datetime.fromtimestamp(1021, timezone.utc), usegmt=True)
        for header in ['21', '600', future]:
            with self.subTest(header=header), patch('automation.crawl._request_once', return_value=self.transient(retry_after=header)) as request:
                with patch('automation.crawl.time.time', return_value=1000), patch('automation.crawl.time.sleep') as sleep:
                    with self.assertRaises(SourceError):
                        crawl._request(self.url, self.site)
                    request.assert_called_once_with(self.url, self.site)
                    sleep.assert_not_called()

    def test_invalid_retry_after_uses_bounded_default_backoff(self):
        for header in ['invalid', '-1', '1.5', 'NaN', 'Sun, 06 Nov 1994 08:49:37']:
            with self.subTest(header=header), patch('automation.crawl._request_once', side_effect=[self.transient(retry_after=header), self.success]):
                with patch('automation.crawl.time.sleep') as sleep:
                    self.assertEqual(crawl._request(self.url, self.site), self.success)
                    sleep.assert_called_once_with(1)


if __name__ == '__main__':
    unittest.main()
