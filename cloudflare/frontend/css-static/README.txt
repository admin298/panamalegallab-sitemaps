Panama Legal Lab: prepared exact-version same-origin CSS experiment

PREPARED LOCALLY, NOT PUBLISHED. No speed gain or appearance acceptance is claimed.
The parent task controls real browser checks, timing, rollout and rollback. No new
resources, paid features, credentials, storage, caches, background jobs or installs
were used in preparing this candidate.

Purpose and unchanged sources
The same native Google Sites stylesheet can be loaded from an existing Pages
origin, avoiding its separate gstatic connection when beneficial. This does not
reduce CSS parsing cost or decoded CSS bytes. The asset is an exact copy of the
public version captured on 2026-11-04T14:13:06Z:
https://www.gstatic.com/_/atari/_/ss/k=atari.vw.VWOdPCMSEos.L.X.O/am=AAAAGAAE/d=1/rs=AGEqA5kDZG7hRoGssZU386DkZtLorCpeeA
SHA256 7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61
Decoded bytes 1954605. No minification, URL rewrite or font changes were made.
The 116 native url() dependencies remain native. No @import or @font-face exists
in this captured bundle, and its external URLs are HTTPS or protocol-relative.
Original copyright and any applicable Google terms remain with their respective
holders. No copyright ownership or separate open-source license is asserted.

Static asset
/_pll-assets/sites-7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61.css
The exact URL, and only that URL, is excluded by _routes.json. This serves the
asset without the thin frontend or singleton DO. _headers sets CSS MIME and
public, max-age=31536000, immutable only on that exact path. deployment.txt and
the frontend JavaScript are unchanged. The frontend SHA256 remains
3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9.
All 26 frozen renderer files and all three image-policy modules remain exact
from the sealed image-format-commercial base archive, SHA256
2dd0ca6e02f3922ba278e96496f2c4b7493def842a30d16c37dbee8918f65a5e.

Response adapter
The unchanged renderer fetches fresh Google Sites CMS HTML first. The optional
CSS adapter runs after the unchanged eight-image adapter and before the existing
eight-slot response hold. CSS-only mode requires one bounded inspection; combined
mode includes a second inspection whose CPU cost must be included in timings.
No rendered HTML, widgets or CMS responses are cached. Existing no-store headers
and source-fetch behavior are preserved.

Only 200 UTF-8 HTML page GET responses planned for one of the four existing sites
can qualify. Native HTMLRewriter validation requires one HTML/head/body, reviewed
site marker, UTF-8 charset and one real head _cl stylesheet link with the pinned
href, stylesheet rel and a valid existing link nonce. Integrity-tagged links,
base tags, meta CSP, missing/ambiguous script nonces, newly introduced style-src
or default-src restrictions, errors, search, unknown CSS versions and malformed
or oversized input fail soft to the original Response.

A clone inspection has a 1310720-byte cap and one 1000-ms asynchronous deadline.
Fatal UTF-8 decode with BOM retained must roundtrip exactly. Native parser output
is discarded; only the selected href span and one early fallback script are
spliced into the original bytes. All link attributes, order and nonce are retained.
A linear raw-text/comment classifier rejects unmatched opens without pathological
rescanning. Synchronous work is bounded by the byte cap; the timer is not a CPU
preemption mechanism. All actual enforced CSP policies must authorize the unique
existing script nonce. No CSP is changed or weakened. The script nonce can differ
from the preserved stylesheet nonce.

The early capture-phase LINK error listener only recovers an exact mapped _cl
stylesheet, restoring the original pinned gstatic href once per node via WeakSet.
This handles a missing/failed local asset; successful but wrong CSS bytes are not
detected by the listener, so asset digest verification before enabling is required.
It does not stop event propagation, add inline event attributes, change fonts or
handle unrelated failures. A CSS proof header is added only on successful mapping:
X-PLL-CSS-Policy: static-exact-v1-<language>.

Modes (backend configs only; public query parameters cannot select a policy)
backend.wrangler.json         images off      CSS off
backend.off.wrangler.json     images off      CSS off
backend.preview.wrangler.json images preview  CSS preview
backend.preview-css.wrangler.json images off  CSS preview
backend.all.wrangler.json     images all      CSS all
backend.all-css.wrangler.json images off      CSS all
backend.css-preview-image-all.wrangler.json images all CSS preview
Use css-preview-image-all to preserve the already approved production image
policy while testing CSS on the exact canary. Combined preview turns images off
on public hosts and is only an isolated test mode, not the current safe rollout.
Preview means exactly https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev
with the existing language-prefixed routes. On that canary, ?_pll_speed=control
disables both adapters. Production queries cannot enable or disable either.
The inherited image policy remains restricted to its eight reviewed image widgets;
this CSS adapter can qualify other rich pages only under the same native link and
site checks. Google Sites changing the CSS version automatically keeps that new
native stylesheet, preserving CMS freshness. A new snapshot requires new review.

Local verification
Read verification.json. Tests were written before implementation; missing module
and asset/config tests failed first. Adversarial malformed input and Unicode offset
regressions also failed before their fixes. Final 61 unit/config/native adapter
tests pass with >=80% coverage; the existing full frozen integration test passes
in a separate process, plus the additional safe-rollout config test (63 total).
Windows workerd loopback resets affected
some complete-suite attempts; no assertions or runtime behavior were weakened.
Eight saved actual home/bank responses with actual CSP passed 248 native adapter
comparisons, including CSS-only and combined policies, off/control, HEAD and public
query isolation. Only approved href/fallback and inherited eight-image changes
normalize back to every original byte. These are local functional checks, not
browser appearance, actual network fallback, compression or performance proof.

Portable source contains synthetic tests only. Raw captured Google HTML, signed
image URLs, CSP nonces, local paths, tools, dependencies and private receipts are
excluded. The native CSS itself is the public captured source described above.
Build with the locked existing esbuild dependency and run package tests. No
dependency update is required. build-manifest.json seals deployable files.

Asset-first parent rollout
1. Keep both adapters off or preserve the currently approved image policy while
   CSS remains off. Upload the prepared Pages asset package to the existing Pages
   project, retaining its existing binding to the existing Worker/class/object.
2. Verify CSS GET and HEAD on preview AND all four public hosts: successful status,
   expected MIME/cache headers, exact decoded SHA/bytes, negotiated compression,
   and exact-path bypass. Verify nearby unrelated paths retain existing behavior.
   Never enable mapped HTML before this asset availability proof.
3. Upload this backend only to the existing pll-renderer-free-20261103 Worker,
   exported PllRenderer class, existing namespace and pll-renderer-v1 singleton.
   Use css-preview-image-all to retain approved public images; preview-css and
   preview-combined are for isolated tests only. Do not create a DO namespace,
   object, migration or scheduled/background task. Eight slots/30-second delivered
   body deadline and every existing account/binding/metadata setting remain.
4. Check all four home and four bank pages on desktop/mobile: computed appearance,
   dimensions/fonts, screenshots, navigation/language menus/search, native scripts,
   CSSOM/runtime behavior and deliberate one-shot CSS asset failure. Verify CMS
   freshness and no-store. Then perform counterbalanced cold canary on/control
   timings, including CSS and hero request timing, TTFB/FCP/LCP/CLS and adapter CPU.
5. Choose all-css or all-combined only if functional acceptance and measured speed
   improvement support it. Otherwise keep CSS off. No speed outcome is promised.

Rollback: disable PLL_CSS_STATIC while preserving the independently approved image
policy, or restore the prior reviewed backend artifact (base backend SHA256
489ac5a4b463e92ec28d9ba328082e0d95fbc6a8cf0fad2d1decda2addcf26e5) with its
appropriate existing image-mode config. Verify native href and no CSS proof header.
Leave the inert immutable CSS asset available; remove it only after mapping is off
and old mapped documents have expired. Never create or replace the active DO.
