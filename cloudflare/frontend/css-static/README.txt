Panama Legal Lab - cache-off image recovery verified; mobile speed open

Active version: f62aeb5b-7e37-4bf1-9633-0985f1f4060e.
Backend 422116 bytes, SHA256
620e28f7e53d63f3f818a91cbd09e898a59e31f3d509664cca1e8c081a7bc521.
activation-receipt.json records public recovery: 5 views in 4 languages,
97 image HTTP200 transfers, zero broken images and zero retries. Late ES at
234.604 seconds received new image URLs with preserved photo/logo/overlay
hashes. Mobile speed remains open; the optimization is not finished.
The previous cf48 receipt is preserved byte-identically under
activation-cf48-cache-all-receipt.json, with the 7ff/f550 receipts also exact.

HTML cache reuse was withdrawn after valid image tokens at about 2 seconds and
broken tokens at about 159 seconds. Build explicitly with PLL_HTML_CACHE_MODE=off.
The supported off branch renders fresh on every HTML visit, with one Pages
execution, one DO call and one Google-origin fetch. It does not read/write or
certify/capture HTML templates, initialize cache SQLite or enqueue refresh work.
Maximum 8 in-flight, no queue, and existing Free resources remain, with finite shared
account quotas. No jobs, new dependencies, resources or latency guarantee.
The previous 300s/32-entry/8MiB/32-SQLite budgets are dormant history, not active reuse.

All four policy variables remain all: PLL_IMAGE_FORMAT, PLL_CSS_STATIC,
PLL_NATIVE_IMPRESSIONS and PLL_INITIAL_RENDER. backend.cache-off.wrangler.json
has the same vars body as initial-render-all; cache mode is compiled in the
artifact. Source is exact; only the emitted backend cache literal changes.
All five frontend artifacts, photos, source URLs, CSS and renderer stay exact.

The three initial-render edits remain: exact invalid-font link removal, native
lazy loading on the recognized Apps Script iframe, and missing homepage logo
ratio reservation with intrinsic fallback. Unknown shapes remain unchanged.
Historical 252-page replay: 252 fonts, 20 lazy frames, 3 new ratios and 1 Spanish
ratio preserved.
Earlier 12 preview views/six pairs and 8 GETs belong to cf48 cache-all, not final off
recovery proof. PageSpeed 543kcq01on scored 56 mobile/78 desktop without image
403s. This single external run does not establish causal gains or field CWV;
mobile speed remains open.
The responsive-image experiment was rejected: four corrected early views showed
short-window savings, but one separate rotation at 160.013 seconds selected nine
previously unfetched 1280 URLs and all nine returned 403/broken images. No trial
code is adopted; f62/photo delivery remains unchanged. Critical CSS is plan only,
not implemented. Mobile speed stays open.
Form delivery, Analytics conversions/attribution and GSC remain deferred.
No head hreflang observed; protected sitemap alternates remain unchanged.

Explicit preparation: node tooling/prepare-native-css.mjs, then build with
PLL_HTML_CACHE_MODE=off and run npm test using the locked existing dependencies.
The helper restores two exact CSS paths from one canonical gzip/base64 source,
with bounds/hash checks and no network/postinstall. The portable off build
matched all six artifacts and passed 163/163 tests. npm run coverage is available.
Previous source coverage is 99.68% lines / 94.70% functions / 89.01% branches with identical
source, not a new recovery coverage run. The unchanged CSS helper previously
passed 19/19 tests. No raw CSS, node_modules, archives or captures are packaged.

Keep the active cache-off artifact for recovery; do not routinely restore a
historical cache-all version. Preserve Worker/DO/SQLite, Pages, CSS, photos and
rules. CACHE-OFF-RECEIPT.json is local source/build proof. See ../../DEPLOYMENT.md.
