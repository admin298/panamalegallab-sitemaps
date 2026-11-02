PANAMA LEGAL LAB — PRODUCTION DELIVERY CANDIDATE

This directory is a self-contained local candidate. It does not change DNS, Google
Sites, Cloudflare, GitHub, images or credentials. Deployment and browser checks are
owned by the parent agent and require the exact reviewed artifact/hash.

Build and validation
--------------------
Install the locked development toolchain with npm ci, then npm run build and
npm run coverage. Tests include Node routing/security contracts and actual
Miniflare/workerd HTMLRewriter integration. No npm runtime dependencies or secrets.
The current final metrics and exact hashes are recorded in release-manifest.json.
The tests use project-local public fixtures; they do not require authenticated APIs.

frozen-core-manifest.json pins the independently reviewed Google Sites Search,
pagination, escaped image preloader and private configuration validator. The vendor
files stay byte-exact. src/search-protocol.js is derived with exactly five recorded
substitutions in search-derivation.json: import location and an optional URL mapper.
Build fails if the frozen files or recorded derivation differ. All validators,
message schemas, byte caps, XSSI framing and result-slot rewrites remain intact.

Public behavior
---------------
The four exact production hosts choose ES/EN/FR/IT and keep their native paths.
The current Pages project and one valid deployment subdomain are isolated previews.
Production content preserves explicit author exclusions; previews and all Search
responses have noindex,nofollow. Transient production503/429 and the rescue302 do
not acquire the preview noindex directive. All responses are no-store during rollout.

145 reviewed legacy paths return exact301 targets with query intact. HTTP GET/HEAD
on approved production hosts goes directly to HTTPS, including known legacy moves.
The four homepage aliases remain200 with canonical roots, matching252 preferred
sitemap URLs. /robots.txt permits crawling and names the existing sitemap index;
/sitemap.xml is a separate301 utility alias to that same index.

A new safe public path may load from only its host's fixed public Google Site;
the256-page inventory is a regression manifest, not a permanent publication block.
Actual source404 becomes a minimal404 with the correct home link, no Google viewer
and no false canonical. Source failures, login/non-Site pages, oversized bodies and
unknown protocols become temporary503. Unknown hosts/RPCs cannot become proxies.

Only the exact public Search POST for the host's language is relayed. Same-origin
checks and bounded observed schemas are preserved, including page_token GET reloads.
Search results use native production URLs. Apps Script/Maps/Calendar/WhatsApp retain
their external URLs; this frontend never submits or stores contact leads.

Availability escape and its limit
--------------------------------
Google's _at_config format is private, not a supported public API. The adapter keeps
the strict518/212/316 guard and changes only316 to null. Before rewriting it confirms
the exact public Site by structural data-domain/data-sitename markers on one element.
Only a typed configuration compatibility failure after a bounded200 HTML response
from that proven Site permits a temporary302 to the fixed original Google URL.
Generic errors, wrong Site, source404, login, transport errors and Search never use
that escape. The response header X-PLL-Delivery: google-source-fallback identifies
the event without logging visitor queries, credentials or request bodies.

The exact private URL guard runs first. A retry accepts only encoding-equivalent
query pairs after an exact raw pre-query URL match for the same fixed public Site.
It preserves pair order and duplicates; plus/space and encoded/literal slash follow
strict query decoding, while encoded plus remains distinct from space. Credentials,
hashes, path/origin changes, malformed Unicode/escapes and blank ampersand segments
cannot relax the guard. The verified actual316 string is used only as the frozen
guard's exact expected argument. Fetch URLs, temporary rescue URLs, raw visitor
queries and all other517configuration tokens remain untouched. The new fixture is
minimal/anonymized; complete public Google pages remain local evidence only.

A prolonged302 can affect which URL Google indexes; it is a temporary availability
measure requiring prompt adapter maintenance, not a permanent SEO strategy. The145
legacy301s execute before any source fetch and continue independently.

Operational limits and publication
----------------------------------
Public HTML is bounded to1MiB; source fetches have20-second timeouts. Input URLs are
bounded to8192UTF8bytes and paths to4096bytes. Visitor Cookie, Authorization, Referer,
Origin and supplied forwarding headers are not copied into source requests. Google
Set-Cookie is not delivered to visitors; CSP/nonce and other source security headers
are retained. Image changes are only the previously verified native CDN prefix;
there is no recompression, resizing, byte editing or general image proxy.

Ephemeral local per-IP quotas use only the platform CF-Connecting-IP:600origin GETs
and60Search requests per minute, at most4096buckets with minute expiry. IPs are not
logged or forwarded. These are per-isolate guards, not a global rate guarantee; absent
platform metadata does not create a shared deny-all bucket. Cloudflare account plan
limits still apply. No paid plan, monitoring automation or external notification is
created by this candidate.

Publish content in Google Sites normally. For a new path, verify public200/language,
then update the regression inventory and reciprocal sitemap with reviewed equivalents.
For a move, add only a verified exact301 and update links/sitemap. A deletion without
an equivalent stays404. If Google changes its viewer, fix it in the isolated preview
with a failing regression first, review, rebuild, and preserve ZIP/hash/deploymentID.

The first delivery is active on all four approved production hosts following the
IT-first rollout. This candidate is the narrow query-encoding compatibility update
for those active frontends. The parent owns final deployment and live verification.
Source TLS/DNS/custom-domain/oldWorker-route snapshots and the separate production
delivery gates remain the rollback runbook. The prior861274production ZIP is kept
as a byte-exact rollback archive. A preview421/noindex build is never a production
rollback target.

dist contains only the module Worker, routes manifest and harmless deployment.txt
asset. There is no static preview index or blanket _headers noindex fallback that
could accidentally become the public website if Worker routing is disabled.
