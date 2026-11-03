PANAMA LEGAL LAB — ARCHIVED PERFORMANCE TRIAL, GEOMETRY SELECTED — 2026-11-03

Selected runtime
----------------
The selected geometry profile retains the measured ES home logo ratio and valid
native current-link ARIA. Its hero preload is disabled. All current image
resources, native navigation, scripts, forms and existing SEO policies remain.

Deploy only the geometry ZIP identified in speed-release-manifest.json:
pages-upload-speed-geometry-2d4e920b6d23.zip
Its Worker is dist-geometry/_worker.js, SHA256:
2d4e920b6d2332210acadf53117c8be53f432fa48c443bed928881fdb163eb6d.

The complete three-adjustment trial remains archived in this source package.
dist/ and the full fd56147 ZIP are the inactive preload experiment. Do not use
those artifacts as the selected deployment. The preload did not demonstrate
consistent end-to-end gains in the sampled measurements, so it was removed from
the selected runtime. No production acceleration is promised by this package.
The actual production deployment and final measurements are recorded separately
in the release pull request; this archived source is not a deployment record.

Source and reproducibility
---------------------------
The frozen baseline is header-language-fix/public-release, production Worker:
2ff699a29edf7054a3f5ebc3637d60c169b16e136d2c54b699d3a117806c9428.
Earlier manifests and ZIPs retained from that baseline are historical. Use only
speed-release-manifest.json for this package's selected and inactive artifacts.
The immediate prior header ZIP remains the documented rollback artifact.

Use npm ci, npm run build, then npm run coverage. The unchanged default build
produces BOTH dist/ (archived full experiment) and dist-geometry/ (selected
geometry). A build output directory is not a deployment instruction: use only
the selected geometry ZIP and hash above. For a single profile, use
node build.mjs --profile=geometry or node build.mjs --profile=full.
These are fixed local build profiles, with no public request or runtime toggle.

The archived verification passed 206 tests with 92.57% line, 93.17% branch and
95.48% function coverage. A clean-source build reproduced both sealed Workers.
Eight original-source replays covered ES home and EN company, production and
preview, full and geometry. Only declared rendering/ARIA deltas were present;
headers and the single intercepted source request stayed identical. These
checks remain unchanged; selecting the previously reviewed geometry artifact
required no source, build, test or Worker change and no new test-suite run.

Runtime behavior and limits
----------------------------
The existing identification/rewrite passes remain two, with no extra parser,
source request, client script or observer. Recognized native header links keep
href, data-url, classes, role, tabindex and handlers. Invalid aria-selected is
removed; aria-current=page is added only for an exact current canonical without
an existing author aria-current. Other roles/unknown structures are untouched.

The ES home logo ratio 1168/854 comes from an explicit browser measurement of
its unique widget/alt, and must be revalidated if the underlying image changes.
The auto keyword permits the intrinsic ratio after loading. No width/height
attributes or replacement images are introduced; author geometry is respected.

The optional hero hint implementation is retained only for the inactive full
experiment. Its source guards, original charset ordering and same-resource URL
remain archived for reproducibility. Geometry emits no added hero preload.

Readiness descriptions, language equivalences, legacy redirects, Search, quotas,
cache/no-store, config guards, nonces/CSP, iframe/forms and all image resources
retain their existing policy. Preview ES home remains at /es/; preview root /
is only the language portal. Preview stays noindex and does not gain production
SEO metadata or production-only language-menu rewrites.

Portable source and release records
-----------------------------------
The allowlist overlays cloudflare/frontend/ only. The nine protected root/sibling
files are excluded and documented with their observed Git blob hashes. Private
raw HTML, signed image tokens, browser evidence, TDD/coverage/audit logs, caches,
node_modules and temporary files are absent. REVIEW-NOTES.txt describes the
archived three-feature experiment; selected runtime status is defined above and
in speed-release-manifest.json. All runtime ZIPs retain their reviewed bytes.
The source status does not assert a production deployment, speed gain, billed
CPU, indexing or form delivery. Consult the release pull request for that record.
