PANAMA LEGAL LAB — LOCAL PERFORMANCE AND ACCESSIBILITY CANDIDATE — 2026-11-03

This candidate preserves the current images and native Google Sites navigation.
It tests three narrowly scoped adjustments: the measured ES home logo ratio,
valid current-link ARIA, and an optional preload for the same current CSS hero.
No production speed benefit or deployment is claimed by this source package.

The reviewed source baseline is the frozen header-language-fix/public-release,
Worker deployment 14388418 SHA256:
2ff699a29edf7054a3f5ebc3637d60c169b16e136d2c54b699d3a117806c9428.
Existing manifests/ZIPs copied from that baseline are historical. The current
local bundles are identified only in speed-release-manifest.json. The older
full 8449020d127f candidate is rejected because its early-script guard suppressed
the hint on the real Google source; do not deploy it.

Reproduce the build and checks
------------------------------
Use npm ci, npm run build, then npm run coverage. The default build creates BOTH
dist/ (full) and dist-geometry/ (control), so the runtime comparison never relies
on missing or stale control assets. Both use the same locked dependencies and
reviewed vendor snapshots. New source has no additional runtime dependency.

For a single profile, use node build.mjs --profile=full or
node build.mjs --profile=geometry. Explicit --profile=all also builds both.
These are local build constants, with fixed output paths; no public endpoint,
request flag or runtime environment switch enables a profile.

The clean-build regression constructs both profiles in a unique temporary child
directory and requires byte identity with the current prebuilt assets. Runtime
tests exercise actual HTMLRewriter, native header fixtures in four languages,
the 252 reviewed pages, full/control response equality apart from the hero hint,
preview noindex/production canonical isolation, and malformed input guards.
speed-release-manifest.json records reviewed hashes and final verification.
Private raw responses, RED logs, temporary tests and coverage logs are excluded.

Behavior and limits
-------------------
Rendering inspection shares the existing source-identification parse. Changes
are emitted in the existing second parse, without a third parser, extra source
request, image request, client script, native controller rewrite or observer.
The Google source's ppConfig script and its late charset stay exactly in place;
the hero hint is added after that unique charset and before the image preloader.
Unknown external/oversized scripts or an image preloader preceding charset make
the hint a no-op. Changed hero/logo profile or ambiguous structure also fails
closed. Image URL tokens and suffixes are not pinned or replaced by new assets.

The logo ratio 1168/854 is an explicit browser measurement, scoped to the exact
ES home widget and alt. It must be revalidated if that underlying image changes.
The auto keyword permits the real intrinsic ratio after loading. No width or
height attributes are introduced, and existing author geometry is respected.

Native header links retain href, data-url, role, classes, tabindex and handlers.
Only the unsupported aria-selected state is removed from recognized native
links. aria-current=page is added only for an exact current canonical, with no
existing author aria-current. Other roles and unknown structures stay untouched.

Readiness descriptions, language equivalences, legacy redirects, Search, quotas,
cache/no-store, config guards, nonces/CSP, iframe/forms and all image resources
retain their existing policy. Rendering can apply to validated preview ES home
at /es/; preview root / is only the language portal. Preview remains noindex and
does not gain production-only SEO metadata/language menu changes.

Acceptance and release
----------------------
See REVIEW-NOTES.txt for measured source provenance, exact profiles, validation
scope and outstanding checks. speed-release-manifest.json lists immutable
ZIP hashes and all three members (_worker.js, _routes.json, deployment.txt).
Independent source replay and parent-controlled browser/PSI A/B are required
before promotion. Verify final desktop/mobile geometry, native hydration/clicks,
one reused hero resource, unchanged images/forms/maps, headers and real metrics.
Local elapsed time/coverage does not establish Cloudflare CPU or a speed gain.
No remote write or browser action was performed by this implementation worker.
