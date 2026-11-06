Panama Legal Lab - mobile native header width, accepted 6 November 2026

Accepted at 2026-11-06T15:38:49Z; backend traffic 100%.
Backend: 87feb3fd-50c1-4865-884e-49074049f706, 434028 bytes.
SHA256 3b4f29b06d61790b56a722c1d15a926da6f8437c2b5d283d85f4a1d5208aff7d.
Pages: f8843680-6120-47cb-93fe-1324addffd64; frontend 3750 bytes,
SHA256 72d46465485f1b00ecab178a57ab9db03403ba37371011840183afa241a2f953.
activation-receipt.json records the operator's public acceptance.

PLL_HERO_WIDTH=all caps the recognized native header photo at 1280 px on mobile.
Only the two matching CSS/native preloader URL width spans change. This resizes
the same photo; composition, crop, native preloader logic and desktop resolution
remain unchanged. Unknown shapes are preserved and no-photo headers are valid
noops. No added client scripts, fetches, image proxy, dependencies, resources or
jobs. The new policy variable is environment configuration, not a new resource.
PLL_IMAGE_FORMAT, PLL_CSS_STATIC, PLL_NATIVE_IMPRESSIONS and PLL_INITIAL_RENDER
also remain all.

HTML cache is compiled OFF. Each ordinary HTML visit invokes Pages and the DO,
then requests the Google origin again. Maximum eight in flight, no queue or jobs;
Free quotas remain finite. The old 300s/32-entry cache budgets are dormant.

Public acceptance: 252 preferred URLs in four languages, 248 resized header
references and four legal pages without photos, plus four device probes; zero
errors or retries. These 256 HTTP checks are not 252 browser/performance audits.
Sixteen public views covered eight home/commercial URLs, four languages and two
device classes. The revised phone contract passed all16, with the correct home
number and historical commercial absence preserved. No form fill/submission or
search query/RPC was performed; contexts and browser closed.

The original canary remains FAIL: eight of16 passed; eight commercial cases
required visible phone text absent in both current and historical baselines.
A prospectively reviewed separate16-view amendment passed without changing the
candidate code. See receipts/hero-width-canary-original-fail.json and
receipts/hero-width-canary-acceptance.json; public acceptance is separate.

Six counterbalanced Spanish-mobile-home lab pairs had six LCP gains, median
460 ms. Median FCP worsened8 ms, maximum48 ms. Photo response-body bytes fell
about19.16%, below the20% target. The late case covered one warm document and
three viewport changes after190s; it does not prove a new late image fetch,
other pages or other languages.

The later public PageSpeed report j9yhkxkllr scored57 mobile/LCP14.6s and82
desktop/LCP2.7s; both SEO/accessibility100, best practices96 and agentic2/2.
Earlier report oxuarv97gj, before this release, scored61/82 with mobile LCP9.2s.
The later mobile observation is worse, without a controlled comparison or causal
attribution. No global PageSpeed gain, field CWV or completed mobile optimization
is claimed. The report has no field data. Raw-trace LCP subparts and simulated
slow-4G LCP use different timing bases and must not be added/computed together.
Form delivery, Analytics conversions/attribution and GSC remain deferred.

Portable verification:196/196 tests, candidate194 plus two retained guards,
one execution; src coverage99.70% lines /89.00% branches /95.14% functions.
All seven generated artifacts match the frozen candidate. The unchanged helper
retains its prior28/28 evidence; no helper rerun or80% helper coverage claim.
Its temporary fixture copies are not attributed to the isolated Node module
coverage report. All15 existing JSON configs, portability guards, lockfile and
historical receipts remain exact; two hero-width configs are added.

Explicit preparation: node tooling/prepare-native-css.mjs reconstructs four fixed
CSS paths from two canonical gzip/base64 inputs, with bounds/hash and no-clobber
checks. No network, postinstall or automatic runtime preparation. Use the lockfile.
In PowerShell:
$env:PLL_HTML_CACHE_MODE = 'off'
npm run build
npm test
node --test tooling/*.test.mjs
Other HTML cache modes are refused. Build timestamps vary; compare seven output
hashes. Commands do not deploy or submit forms. Raw CSS, photos, captures,
dependencies and caches are not packaged.

activation-0507-receipt.json preserves the previous519 compatibility recovery:
backend0507d52a-a3c9-4d18-b8be-f0a6f6703b80 and Pages06533eae-ba22-4602-8920-631f871dfff1,
HTML cache off. Reviewed519 and historical518 contracts remain; current renderer
ab2390e634808742a87beddd19bce908eef3d7ac5ea5375dc709d99a7e546a07 and its27 sources
are unchanged by this release. reference-worker-58.js/vendor and f62/cf48/7ff/f550
receipts remain exact historical evidence. Check source compatibility and compiled
cache mode for any rollback. See ../../DEPLOYMENT.md. No GitHub/sitemap automation.
