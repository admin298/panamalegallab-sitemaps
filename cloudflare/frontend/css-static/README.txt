Panama Legal Lab - bounded HTML reuse in the existing Durable Object

The included activation-receipt.json records the accepted public deployment:
backend f550851a-2013-4772-8263-f39abd3d03f6, SHA256
b418914671ad90e2e53ee4bd190bbfde2ed0636600bff7142f113933ccd793ff.
Pages remains bc2cd6ed-c1ed-448e-9873-df07ee3e7a53. Source/build hashes and
observed deployment IDs are separate records; this checkout does not deploy itself.

Purpose and placement
Pages keeps the exact previously accepted thin frontend, SHA256 3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9.
HTML lookup, certification and fresh nonce renewal run in the existing SQLite
Durable Object. A HIT avoids Google Sites and the full renderer. Every HTML visit
still invokes Pages once and the same DO once. This reduces origin/render work;
it does not eliminate Pages or Durable Object request accounting.
The plan, namespace, bindings, frozen 26-file renderer, images and exact CSS stay
unchanged. No image is substituted. The eight previously accepted WebP profiles
remain in place with their original photos, crop and appearance.

Freshness and scope
All 252 currently preferred routes in Spanish, English, French and Italian are
eligible. Actual request host, path, semantic language and release isolate keys;
preview responses retain noindex and cannot warm public keys. Queries, HEAD/POST,
search/RPC, unknown paths and unsupported response/security shapes use the original
handler. The DO sees the thin frontend's sanitized anonymous request: credentials,
Cookie, Range, conditionals and Cache-Control are not forwarded. Therefore this
package does NOT claim that original browser authorization or force-reload headers
bypass caching. Source retrieval remains anonymous with a fixed language.
Google Sites stays the source of truth. A valid copy may lag a publication by up
to 300 seconds. Access does not extend that absolute lifetime. Expiration is checked
again before a renewed response is committed. There is no stale serving or retry.

Storage and lifecycle
At most 32 entries and 8MiB of accounted key/header/body data are retained in the
memory layer. This is a data budget, not a measured bound on the whole V8 heap.
Optional backing uses only the existing DO SQLite database, with one new dedicated
table and 32 fixed hash slots. Each slot holds at most a 1MiB body, 64KiB headers
and a bounded exact key. Hash collisions produce a safe miss. Only one parameterized
SELECT is used on a memory miss and at most one UPSERT on a newly rendered miss;
HITs do not update SQL or LRU metadata in the database. No secondary index, delete,
GC job, alarm or namespace/class migration is introduced; table creation is DDL. Expired public rows can remain at rest
until replaced; expiry limits delivery, not physical retention or SQLite file size.
This backing preserves useful reuse across normal DO memory eviction. No timer or
keepalive prevents hibernation. Any storage error disables optional backing for the
instance and falls back safely; it cannot prevent normal anonymous rendering.

Bounds and security
The existing eight in-flight request slots and 30s delivery deadline remain.
Only one cache fill/certification can run at a time; other concurrent misses render
normally without a queue or additional certification/capture work. Capture is <=1MiB, <=2048 chunks,
<=8 empty chunks and <=1000ms. Optional asynchronous store operations have finite
deadlines and no retries; disabled backing prevents repeated pending work.
The trusted private DO validates UTF-8, native structure, canonical/site identity,
CSP, the two explicitly pinned Report-Only policies and all nonce occurrences once
when certifying a miss. V2 metadata contains verified byte offsets and a raw-body
SHA256. A HIT checks the private certificate, identity, SHA, age and exact old ASCII
nonce/quote bytes, then copies disjoint byte ranges and generates independent fresh
192-bit script/style nonces. It does not decode/re-encode or parse the whole HTML.
SHA is an integrity check, not a signature. Forging a matching private certificate
and body is outside the private-writer trust boundary. V1 certificates are rejected.
Internal template headers never reach public responses. CSP and Report-Only remain
intact apart from the required fresh enforced nonce. Public HTML stays no-store.
Request-specific telemetry and obsolete body validators are not replayed. Current
backend version metadata is applied to the final response, including stored HITs.

Free-plan limits
No paid resources or new bindings are required. Existing account-wide request,
DO-duration, memory and SQL quotas remain finite and shared. One SQL data write per
rendered miss is bounded by the existing one-DO-call-per-visit request ceiling;
this is not a guarantee of available account headroom. A storage quota error loses
cache benefit and follows the ordinary handler. No unlimited-capacity promise is
made. There is no cron, warmer, automatic retry, polling or recurring task.

Portable preparation, build and verification
The exact native CSS is stored as canonical ASCII base64 of deterministic gzip.
Before installing dependencies, testing or building, run these explicit offline steps:
  node tooling/prepare-native-css.mjs
  node --test tooling/prepare-native-css.test.mjs
The helper validates the encoded/compressed/decoded bounds and SHA256 hashes, and
reconstructs only the two fixed native CSS paths without replacing existing files.
It has no network access, postinstall hook or automatic build invocation. The original
Google stylesheet/provenance and its applicable copyright/terms remain unchanged.

Use the locked dependencies: npm ci. To reproduce the accepted backend, explicitly
set PLL_HTML_CACHE_MODE=all in the invoking shell, then run npm run build, npm test
and npm run coverage. PowerShell: $env:PLL_HTML_CACHE_MODE='all'; npm run build.
For POSIX shells: PLL_HTML_CACHE_MODE=all npm run build. The default is off; preview
and all are compile-time backend modes, not new Dashboard environment variables.
The accepted build outputs backend SHA b418914671ad90e2e53ee4bd190bbfde2ed0636600bff7142f113933ccd793ff
and frontend SHA 3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9.
build-manifest.json contains a build timestamp, so its bytes change on reproduction;
compare its deployment file hashes and modes, rather than its timestamp.
Use config/backend.all.wrangler.json to retain the accepted image and CSS all modes.
Those image/CSS settings are independent from the compiled HTML cache mode.

The portable copy omits only top-level editor $schema in eight configuration JSON
files. config/css-config.test.mjs shallowly normalizes that metadata in its original
eight comparisons and adds two guards rejecting runtime and nested-field changes.
All other source/config bytes are compared in activation-receipt.json. The 19 helper
tests and 14 configuration tests remain unchanged from the previous portable copy.

Any future change requires local tests/coverage, native thin-to-SQLite checks,
security/correctness review and a finite preview MISS/HIT pilot, followed by public
checks after authorized publication. The existing Pages five deployment files stay
byte-identical. Nothing in these commands publishes, polls or schedules work.

Rollback
The previous accepted static-CSS backend was version
44ca5e88-b938-4087-8269-cb9efb27016d, SHA256
faf97097fac5c117459a4843c8a2235ccc143e767289b34216351081c5ed13dc, retained
in the Git history immediately before this change. Redeploy that artifact on the
SAME Worker and namespace, or rebuild this source with PLL_HTML_CACHE_MODE=off
and verify the new artifact before deployment; the off build is not the accepted
b418 artifact. Keep the original Pages code and exact CSS.
Do not delete the namespace, run a removal migration or drop the cache table.
The old backend ignores the optional table. Preserve all failed and accepted
measurement receipts; source/static assets and actual deployment IDs are separate.
