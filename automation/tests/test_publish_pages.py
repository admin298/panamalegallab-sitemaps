"""Publisher contract tests; all remote writes use fakes."""
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout, redirect_stderr
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from automation import publish_pages as pub


SHA = 'a' * 40
TOKEN = 'secret-test-token'


def context(repo):
    return {'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': pub.REPOSITORY,
            'GITHUB_REF': 'refs/heads/main', 'GITHUB_EVENT_NAME': 'schedule',
            'GITHUB_WORKSPACE': str(repo), 'GITHUB_TOKEN': TOKEN}


def xml_files():
    return {name: (b'<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>'
                   if name == 'sitemap-index.xml' else
                   b'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>')
            for name in pub.XML_FILES}


class Response:
    def __init__(self, body=b'', status=200):
        self.body, self.status, self.headers = body, status, {}

    def read(self, size):
        return self.body[:size]

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class Opener:
    def __init__(self, response=None, error=None):
        self.response, self.error, self.calls = response or Response(), error, []

    def open(self, request, timeout):
        self.calls.append(request)
        if self.error:
            raise self.error
        return self.response


class FakeClient:
    def __init__(self, matches=None, builds=None):
        self.matches = iter(matches or [True])
        self.builds = iter(builds or [{'status': 'built', 'commit': SHA}])
        self.requests, self.public_checks = [], 0

    def public_matches(self, expected, sha):
        self.public_checks += 1
        return next(self.matches)

    def json_request(self, method, path, expected_status):
        self.requests.append((method, path, expected_status))
        return next(self.builds)


class Clock:
    def __init__(self):
        self.value = 0

    def __call__(self):
        return self.value

    def sleep(self, duration):
        self.value += duration


class ContextTests(unittest.TestCase):
    def test_accepts_only_named_trusted_main_events(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            for event in ['schedule', 'workflow_dispatch', 'push']:
                env = {**context(root), 'GITHUB_EVENT_NAME': event}
                self.assertEqual(pub.trusted_context(env, root), TOKEN)

    def test_rejects_untrusted_context_without_exposing_token(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            for key, value in [('GITHUB_ACTIONS', 'false'), ('GITHUB_REPOSITORY', 'other/fork'),
                               ('GITHUB_REF', 'refs/pull/2/merge'), ('GITHUB_EVENT_NAME', 'pull_request'),
                               ('GITHUB_WORKSPACE', name + '/different'), ('GITHUB_TOKEN', ''),
                               ('GITHUB_SERVER_URL', 'https://evil.example'),
                               ('GITHUB_API_URL', 'https://evil.example')]:
                with self.subTest(key=key), self.assertRaises(pub.PublishError) as error:
                    pub.trusted_context({**context(root), key: value}, root)
                self.assertNotIn(TOKEN, str(error.exception))


class HttpTests(unittest.TestCase):
    def test_api_auth_is_confined_to_exact_repository_api(self):
        opener = Opener(Response(b'{"status":"queued"}', 201))
        client = pub.Client(TOKEN, opener)
        result = client.json_request('POST', '/pages/builds', 201)
        self.assertEqual(result['status'], 'queued')
        request = opener.calls[0]
        self.assertEqual(request.full_url, pub.API_BASE + '/pages/builds')
        self.assertEqual(request.get_header('Authorization'), 'Bearer ' + TOKEN)

    def test_public_requests_never_receive_token(self):
        opener = Opener()
        client = pub.Client(TOKEN, opener)
        self.assertTrue(client.public_matches({pub.XML_FILES[0]: b''}, SHA))
        self.assertNotIn('Authorization', opener.calls[0].headers)
        self.assertTrue(opener.calls[0].full_url.startswith(pub.PUBLIC_BASE + '/'))

    def test_api_paths_cannot_escape_repository(self):
        for path in ['https://evil.example', '/../secrets', '/pages/builds?token=x', '/contents/a']:
            with self.subTest(path=path), self.assertRaises(pub.PublishError):
                pub.Client(TOKEN, Opener()).json_request('GET', path, 200)

    def test_redirect_handler_never_follows(self):
        self.assertIsNone(pub.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.example'))

    def test_request_status_size_json_and_network_errors_are_redacted(self):
        cases = [Opener(Response(b'{}', 403)), Opener(Response(b'x' * (pub.MAX_BODY + 1))),
                 Opener(Response(b'not-json')), Opener(Response(b'[]')),
                 Opener(error=URLError(TOKEN)),
                 Opener(error=HTTPError(pub.API_BASE, 302, TOKEN, {}, io.BytesIO()))]
        for opener in cases:
            with self.subTest(opener=opener), self.assertRaises(pub.PublishError) as error:
                pub.Client(TOKEN, opener).json_request('GET', '/pages/builds/latest', 200)
            self.assertNotIn(TOKEN, str(error.exception))

    def test_public_mismatch_or_failure_returns_false(self):
        for opener in [Opener(Response(b'bad')), Opener(Response(b'', 404)), Opener(error=URLError('offline'))]:
            self.assertFalse(pub.Client(TOKEN, opener).public_matches({'sitemap-es.xml': b'expected'}, SHA))

    def test_public_input_is_fixed_whitelist_and_commit(self):
        for expected, sha in [({'../../x': b''}, SHA), ({'sitemap-es.xml': b''}, 'not-a-sha')]:
            with self.assertRaises(pub.PublishError):
                pub.Client(TOKEN, Opener()).public_matches(expected, sha)


class PublishTests(unittest.TestCase):
    def run_publish(self, client, **kwargs):
        clock = Clock()
        return pub.ensure_pages(xml_files(), SHA, client, clock=clock, sleep=clock.sleep,
                                build_timeout=20, public_timeout=20, interval=5, **kwargs)

    def test_current_public_xml_skips_rebuild(self):
        client = FakeClient()
        self.assertEqual(self.run_publish(client), 'current')
        self.assertEqual(client.requests, [])

    def test_requests_explicit_build_then_verifies_public_bytes(self):
        client = FakeClient([False, False, True], [
            {'status': 'queued', 'commit': SHA}, {'status': 'building', 'commit': SHA},
            {'status': 'built', 'commit': SHA}])
        self.assertEqual(self.run_publish(client), 'rebuilt')
        self.assertEqual(client.requests[0], ('POST', '/pages/builds', 201))
        self.assertEqual(client.requests[1], ('GET', '/pages/builds/latest', 200))
        self.assertEqual(client.public_checks, 3)

    def test_build_must_match_pushed_commit(self):
        for build in [{'status': 'built', 'commit': 'b' * 40}, {'status': 'errored', 'commit': SHA},
                      {'status': 'unknown', 'commit': SHA}, {'status': 'built'}]:
            with self.subTest(build=build), self.assertRaises(pub.PublishError):
                self.run_publish(FakeClient([False], [build]))

    def test_build_and_cdn_waits_are_bounded(self):
        for client in [FakeClient([False], [{'status': 'building', 'commit': SHA}] * 8),
                       FakeClient([False] * 8)]:
            with self.subTest(client=client), self.assertRaises(pub.PublishError):
                self.run_publish(client)

    def test_read_xml_rejects_missing_html_doctype_and_symlink(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            for filename, body in xml_files().items():
                (root / filename).write_bytes(body)
            self.assertEqual(pub.read_xml(root), xml_files())
            target = root / 'sitemap-es.xml'
            for body in [b'<html/>', b'<!DOCTYPE urlset><urlset/>', b'not xml']:
                target.write_bytes(body)
                with self.assertRaises(pub.PublishError):
                    pub.read_xml(root)
            target.unlink()
            with self.assertRaises(pub.PublishError):
                pub.read_xml(root)


class GitTests(unittest.TestCase):
    def git(self, root, *args, check=True):
        return subprocess.run(['git', '-C', str(root), *args], check=check, capture_output=True).stdout

    def init_repo(self, root):
        self.git(root, 'init', '-b', 'main')
        self.git(root, 'config', 'user.email', 'test@example.invalid')
        self.git(root, 'config', 'user.name', 'Publisher test')
        self.git(root, 'config', 'core.hooksPath', '.git/no-test-hooks')
        self.git(root, 'config', 'commit.gpgsign', 'false')
        for filename, body in xml_files().items():
            (root / filename).write_bytes(body)
        self.git(root, 'add', '.')
        self.git(root, 'commit', '-m', 'test: baseline')
        self.git(root, 'remote', 'add', 'origin', pub.REMOTE)

    def test_git_command_errors_are_redacted(self):
        with tempfile.TemporaryDirectory() as name:
            with self.assertRaises(pub.PublishError) as error:
                pub.Git(Path(name), dict(os.environ)).run('not-a-command')
            self.assertNotIn(TOKEN, str(error.exception))

    def test_exact_origin_and_repository_validation(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            self.init_repo(root)
            git = pub.Git(root, dict(os.environ))
            pub.validate_git(git, root)
            self.git(root, 'remote', 'set-url', 'origin', 'https://evil.example/repo')
            with self.assertRaises(pub.PublishError):
                pub.validate_git(git, root)

    def test_push_url_cannot_differ_or_fan_out(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            self.init_repo(root)
            git = pub.Git(root, dict(os.environ))
            self.git(root, 'remote', 'set-url', '--push', 'origin', 'https://evil.example/receive')
            with self.assertRaises(pub.PublishError):
                pub.validate_git(git, root)
            self.git(root, 'remote', 'set-url', '--push', 'origin', pub.REMOTE)
            self.git(root, 'remote', 'set-url', '--add', '--push', 'origin', pub.REMOTE)
            with self.assertRaises(pub.PublishError):
                pub.validate_git(git, root)

    def test_rejects_outside_allowlist_pre_staged_and_deletion(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            self.init_repo(root)
            git = pub.Git(root, dict(os.environ))
            (root / 'not-allowed.txt').write_text('test')
            with self.assertRaises(pub.PublishError):
                pub.changed_paths(git, root)
            (root / 'not-allowed.txt').unlink()
            (root / 'sitemap-es.xml').unlink()
            with self.assertRaises(pub.PublishError):
                pub.changed_paths(git, root)
            (root / 'sitemap-es.xml').write_bytes(xml_files()['sitemap-es.xml'] + b'\n')
            self.git(root, 'add', 'sitemap-es.xml')
            with self.assertRaises(pub.PublishError):
                pub.changed_paths(git, root)

    def test_changed_path_parser_and_empty_case(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            self.init_repo(root)
            git = pub.Git(root, dict(os.environ))
            self.assertEqual(pub.changed_paths(git, root), [])
            (root / 'sitemap-es.xml').write_bytes(xml_files()['sitemap-es.xml'] + b'\n')
            data = root / 'automation/data'
            data.mkdir(parents=True)
            (data / 'health.json').write_text('{}')
            self.assertEqual(pub.changed_paths(git, root), ['automation/data/health.json', 'sitemap-es.xml'])

    def test_authenticated_push_env_keeps_secret_out_of_arguments(self):
        env = pub.git_environment({'PATH': os.environ['PATH'], 'GIT_CONFIG_COUNT': '9'}, TOKEN)
        self.assertEqual(env['GIT_CONFIG_COUNT'], '3')
        self.assertEqual(env['GIT_CONFIG_KEY_0'], 'http.https://github.com/.extraheader')
        self.assertIn('AUTHORIZATION: basic ', env['GIT_CONFIG_VALUE_0'])
        self.assertEqual(env['GIT_TERMINAL_PROMPT'], '0')
        self.assertEqual(env['GIT_CONFIG_VALUE_1'], 'false')
        self.assertEqual(env['GIT_CONFIG_VALUE_2'], '')
        self.assertNotIn('GIT_ASKPASS', pub.git_environment({'GIT_ASKPASS': 'unsafe'}, TOKEN))
        self.assertNotIn('GIT_TRACE', pub.git_environment({'GIT_TRACE': '1'}, TOKEN))
        self.assertNotIn('GIT_INDEX_FILE', pub.git_environment({'GIT_INDEX_FILE': 'elsewhere'}, TOKEN))

    def test_commit_and_fast_forward_local_remote(self):
        with tempfile.TemporaryDirectory() as name:
            base = Path(name)
            root, remote = base / 'work', base / 'remote.git'
            root.mkdir()
            self.init_repo(root)
            subprocess.run(['git', 'init', '--bare', str(remote)], check=True, capture_output=True)
            self.git(root, 'remote', 'set-url', 'origin', str(remote))
            self.git(root, 'push', 'origin', 'main')
            (root / 'sitemap-es.xml').write_bytes(xml_files()['sitemap-es.xml'] + b'\n')
            with patch.object(pub, 'validate_git'):
                sha, changed = pub.commit_changes(root, context(root), TOKEN)
            self.assertTrue(changed)
            self.assertEqual(sha, self.git(remote, 'rev-parse', 'main').decode().strip())
            with patch.object(pub, 'validate_git'):
                self.assertEqual(pub.commit_changes(root, context(root), TOKEN), (sha, False))

    def test_remote_concurrent_change_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as name:
            base = Path(name)
            root, remote, other = base / 'work', base / 'remote.git', base / 'other'
            root.mkdir()
            self.init_repo(root)
            subprocess.run(['git', 'init', '--bare', str(remote)], check=True, capture_output=True)
            self.git(root, 'remote', 'set-url', 'origin', str(remote))
            self.git(root, 'push', 'origin', 'main')
            subprocess.run(['git', 'clone', '--branch', 'main', str(remote), str(other)], check=True, capture_output=True)
            self.git(other, 'config', 'user.email', 'test@example.invalid')
            self.git(other, 'config', 'user.name', 'Concurrent test')
            self.git(other, 'config', 'core.hooksPath', '.git/no-test-hooks')
            self.git(other, 'config', 'commit.gpgsign', 'false')
            (other / 'sitemap-fr.xml').write_bytes(xml_files()['sitemap-fr.xml'] + b'\n')
            self.git(other, 'add', '.')
            self.git(other, 'commit', '-m', 'test: concurrent')
            self.git(other, 'push')
            expected = self.git(remote, 'rev-parse', 'main')
            (root / 'sitemap-es.xml').write_bytes(xml_files()['sitemap-es.xml'] + b'\n')
            with patch.object(pub, 'validate_git'), self.assertRaises(pub.PublishError):
                pub.commit_changes(root, context(root), TOKEN)
            self.assertEqual(self.git(remote, 'rev-parse', 'main'), expected)


class EntryTests(unittest.TestCase):
    def test_main_success_returns_only_safe_summary(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            for filename, body in xml_files().items():
                (root / filename).write_bytes(body)
            output = io.StringIO()
            with patch.dict(os.environ, context(root), clear=True), \
                    patch.object(pub, 'commit_changes', return_value=(SHA, True)), \
                    patch.object(pub, 'Client', return_value=FakeClient()), redirect_stdout(output):
                self.assertEqual(pub.main(['--repo', name]), 0)
            self.assertEqual(json.loads(output.getvalue()),
                             {'committed': True, 'commit': SHA, 'pages': 'current', 'xml_verified': 5})
            self.assertNotIn(TOKEN, output.getvalue())

    def test_main_failure_never_exposes_library_error(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            for error in [pub.PublishError('safe error'), OSError(TOKEN)]:
                output = io.StringIO()
                with patch.dict(os.environ, context(root), clear=True), \
                        patch.object(pub, 'read_xml', side_effect=error), redirect_stderr(output):
                    self.assertEqual(pub.main(['--repo', name]), 1)
                self.assertNotIn(TOKEN, output.getvalue())

    def test_git_os_and_timeout_failures_do_not_expose_details(self):
        for error in [OSError(TOKEN), subprocess.TimeoutExpired(TOKEN, 90)]:
            with patch.object(pub.subprocess, 'run', side_effect=error), self.assertRaises(pub.PublishError) as caught:
                pub.Git(Path('.'), dict(os.environ)).run('status')
            self.assertNotIn(TOKEN, str(caught.exception))


if __name__ == '__main__':
    unittest.main()
