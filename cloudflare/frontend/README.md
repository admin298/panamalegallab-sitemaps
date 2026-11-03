PANAMA LEGAL LAB — HEADER LANGUAGE MENU CORRECTION — 2026-11-03

Problem and scope
-----------------
The deployed readiness package rewrote the footer language selector but left the
Google Sites header language menu pointing to language homepages. Its native menu
controller reads data-url as well as href. This candidate changes BOTH attributes
for the exact reviewed counterpart of the current service/page.

This is a local, unpublished candidate. Publication and live checks are recorded
separately; this README does not claim deployment or validation of every public
page. The existing release-manifest.json and publication-files.json describe the
earlier readiness package and are preserved as historical artifacts. The current
candidate is identified by header-release-manifest.json and its new allowlist.

Executable change
-----------------
The existing Site-identity HTMLRewriter pass recognizes the native localized
language parent and exactly three unique foreign-language root links. It supports
the mobile menu (yuynLe), desktop menu (WDxLfe), and desktop More submenu: three
native copies in the saved source headers. The existing rewrite pass updates the
selected anchors, with no additional full parse, client script or network request.

Native Google /url?q=ROOT wrappers are accepted only on the exact HTTPS Google
wrapper authority/path with a single decoded q that is an approved literal root.
The existing production URL normalizer is reused. Both href and data-url must
resolve to the same approved root; non-root targets, queries/fragments, duplicate
q values, credentials, other hosts, media, wrong labels and ambiguous structures
fail closed. Inputs are bounded to 512 anchors, 128 text characters per anchor,
three distinct menu groups, two native navigation containers, and 2048 URL chars.

Normal navigation, home links, logos, country CTAs, the existing footer behavior,
148 descriptions, 252 reviewed language equivalences, 145 legacy redirects,
Search, quotas, author robots, CSP/nonces, Google viewer configuration guards,
images and forms retain their contracts. Unmapped pages, Search and previews do
not receive the new language-menu enhancement. The historical draft flag in the
readiness data is provenance; this change does not edit that reviewed data.

Build and checks
----------------
Use npm ci, npm run build and npm run coverage. Dependencies and reviewed vendor
files are unchanged and pinned. The native header test fixtures retain actual
navigation structure and Google root-wrapper grammar. Signed image URLs are
replaced with a synthetic non-network logo URL and Google usg signatures removed;
full Google pages, inline configurations, forms and private browser evidence are
excluded from the public package. See test/fixtures/header-provenance.json.

Tests include the four real-derived native language headers, both attributes in
all three menu copies, all 252 reviewed paths, ordinary navigation/logo guards,
malformed wrappers/media, and all prior delivery/footer/Search regressions. The
new manifest records the definitive suite, coverage, source and bundle hashes.

A separate local comparison replays saved complete EN contact/company pages
against the deployed readiness baseline. Header href/data-url changes are the
only permitted body delta, with identical status and headers. Local elapsed time
is not Cloudflare billed CPU, a production speed score or proof that error1102
has disappeared. This change adds menu inspection work; production needs a
bounded canary and rollback remains available.

Release and rollback
--------------------
Upload only the ZIP named in header-release-manifest.json. Its three root members
are _worker.js, _routes.json and deployment.txt. Existing production ZIPs are kept.
The immediate prior deployed readiness Worker has SHA256
b5e12bf5f471d7e595c82dae36732d9cfb38f105aa6b632b2ac5b4dcad84318d,
and ZIP pages-upload-readiness-6fad6dd734ef.zip. Earlier source/deployment artifacts
are historical, not the current release identity. No automation is introduced.

An isolated pages.dev preview verifies compatibility/noindex only because the
language enhancement is intentionally production-only. The production canary
must inspect the real header and footer and click the actual top-menu language
items in each locale, checking the final service URL and heading after load.
No form submission, email, booking, credential or security setting is part of
this package. If production delivery or the menu regresses, restore the exact
previous readiness ZIP and verify the rollback.
