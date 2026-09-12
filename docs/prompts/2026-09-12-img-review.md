# Storage image onboarding review

## Why

Finish the complete Storage image DX in one reviewable PR, node-sdk #500 against `main`.
The orchestrator supplied the whole-stack council review; do not duplicate that review.

## Review checklist

- [x] Reject non-string `alt` from JavaScript callers, including the renderer and factory paths.
      Preserve strings, including the empty decorative alternative. Reproduce before fixing.
- [x] Keep the pending Suspense shell free of the resolved image's `id` and ARIA relationships.
      Preserve the real image's attributes and the placeholder's layout. Reproduce before fixing.
- [x] Run package checks, the packed Next fixture, and repository verification; monitor CI.
- [x] Retarget #500 to `main` and describe the whole A–D change, including schema provenance.
      Close #497–#499 as superseded, without merging or publishing anything.
- [x] Dogfood one local Content consumer against the isolated canary devdock using the packed
      README recipe, then run the fresh-reader user test. Record `/tmp/img-dogfood-round1.md`.
- [x] Add the approved native-browser proof in this same PR after dogfood and the user test.
- [x] Monitor the browser-proof commit's GitHub checks; keep README feedback for the next brief.

The two P3 fixes belong at the top of the existing `img-onboard` branch. No rebase or force push
is needed. Transparency, package publication, API2 implementation, and production access remain
outside this slice.

The new focused run reproduced six failures before the fix and passed all 65 tests afterward.
Logs: `/tmp/img-task2-p3-red.log` and `/tmp/img-task2-p3-green.log`. The shared attribute snapshot
now validates `alt`; both rendering paths reuse the validated value. The fallback excludes all
caller ARIA attributes because it is inert and decorative; its own `aria-hidden` remains.

After both fixes, `yarn check`, `yarn verify:full`, img checks (87 tests plus type fixtures), and
the packed production Next fixture passed. The package and fixture checks ran sequentially.

The accepted local Content dogfood and independent user test are recorded in
`/tmp/img-dogfood-round1.md`. Only #500 remains open; the README feedback is awaiting the
orchestrator's round-2 brief and must not be changed in the browser-proof slice.

The first real native-cookie regression returned 404 instead of 307 while the image request
carried its HttpOnly session cookie and no Bearer header (`/tmp/img-task2-e-red.log`). The fixture
now uses that cookie, and the browser suite follows redirects to an owned local origin that
independently validates signatures/expiry and serves real encoded image bytes. The existing
five-minute HTTP fixture policy remains; only the separate lifecycle page uses ten-second grants.

The final local run passed all six Chromium cases in 24.3 seconds, after `yarn check`,
`yarn verify:full`, and the img package's 87 tests plus type fixtures. The packed fixture builds
production Next.js with `cacheComponents`, checks the six offline seed cases, and records the
1/20/100-image delivery diagnostics before running the browser suite.

The browser checks cover native HttpOnly-cookie authorization without Bearer headers, actual
prerendered geometry and responsive candidates at 1200px/390px with application JavaScript held,
subsequent hydration, renewal from the original lazy capability, revocation, expiration, and
tampering. Every successful image response is decoded and checked against its requested dimensions
and MIME type; unexpected requests, console errors, page errors, and HTTP failures fail the suite.
The local CDN independently verifies HMAC signatures and expiry and receives no application cookie.

The saved desktop/mobile screenshots were visually checked. Native candidate-height rounding
can move following text by less than half a CSS pixel (640×427 versus 2400×1600); the geometry
assertion documents that tolerance. LCP, image-ready and navigation timings are diagnostics, not
performance thresholds. CI uploads the JSON report with successful screenshots/response evidence,
plus failure screenshots and traces. This is Chromium with opaque generated fixtures, not proof of
production CDN caching, transparency, other browsers, or improved production latency.

Logs: `/tmp/img-task2-e-{check,verify,img-check,final-fixture}.log`.
Local browser evidence: `test-results/img-next/results.json` (ignored build artifact).

## Round 2

The accepted brief is `/tmp/img-task2-round2-brief.md`; the linked independent Codex triage was
read in full. Keep all work in #500 with no merge, release, production access, API2 changes, or
edits to credential files. Council remains orchestrator-owned. Four follow-up commits:

- [x] Browser proof: production Cache Components enabled and omitted, distinct app/CDN hostnames,
      host-wide HttpOnly cookie exclusion at the CDN, JPEG fallback, and WebKit if inexpensive.
- [x] Sequential first-image walkthrough: close all eleven reader questions and document the
      full-cover `sizes` rule. Match the literal tested seed and repeat the Yarn consumer install.
- [x] SDK `storeImage` plus receipt-as-`src`: stream the checksum, validate the one completed
      receipt, preserve cancellation/progress, ship packed exports and legacy wrapper. Snapshot
      source geometry before suspension without weakening loading or authorization contracts.
- [x] Explicit-policy env factory: read the three rendering variables once, require `storage`,
      retain deny-all/redirect overloads, reject invalid environment without exposing secrets.

Before each push, run affected package checks, `yarn verify:full`, and the packed fixture
sequentially. Keep image layout APIs, CLI Storage commands, default-delivery changes, JPEG fallback
sizing changes, alpha preservation and production deployment outside this round.

Round-2 browser verification passed 36/36 cases: Chromium and WebKit with Cache Components
enabled (55.0s) and omitted (51.5s), no skips/retries. `yarn check`, the img package checks, and
`yarn verify:full` passed before the final packed run. Logs: `/tmp/img-round2-1-*.log`.
Evidence now lives under `test-results/img-next/{enabled,omitted}/results.json`.

The hostname regression failed first: a host-wide cookie reached the old same-host CDN. Next
now uses `127.0.0.1`, the CDN uses `localhost`, and no CDN request receives the session cookie.
Chromium's explicit loopback permission is fixture-origin-only; fulfilled HTML otherwise lacks
network address-space classification. The JPEG test disables modern sources before HTML parsing,
not through failed HTTP responses, and verifies the existing source-width fallback policy.

Fresh cookie-cloned browsing contexts exercise new grant requests: WebKit may reuse an image it
already decoded without HTTP, which is not new authorization and does not recall downloaded bytes.
The original lazy capability stays untouched in the main page. Prerender screenshots use another
context so fake empty bootstrap modules cannot contaminate the real page's WebKit module cache.
The benchmark route uses an ordinary Suspense boundary instead of the Cache-Components-only
`instant` setting. Both direct and private hero/avatar images decode before application JavaScript
is released; the subsequent button interaction verifies hydration in both browsers.

The browser-extension commit `73f8dc2` passed all ten GitHub checks, with three expected skips:
https://github.com/transloadit/node-sdk/actions/runs/34688893602.

The README now orders checkout/pack/install, separated credentials, seed, factory and rendering.
Its sequence regression failed first for `.env.local` seeding and use before factory definition;
all six focused fixture tests pass after the documentation fix. All eleven reader questions,
the full-cover `382vw` sizing lesson and the existing JPEG fallback policy are documented.

A separate clean Yarn 4/node-modules app installed all four tarballs with the literal commands.
An explicit root utils resolution prevents a nested registry copy. The six offline seed cases,
TypeScript compilation of the exact seed/factory/render snippets, and public model execution
passed; the lockfile and both img/node resolutions point to the same local utils artifact.
This is separate evidence from the npm-based production fixture, not a second live Storage write.
Logs: `/tmp/img-round2-2-{red,green,yarn-install,yarn-proof,yarn-types}.log`.

Repeated pre-push verification exposed a WebKit harness fault: pausing intercepted script requests
could stop animation frames despite a visible, focused document. React's streamed images then
stayed hidden until the held bundles resumed. Window order, navigation readiness, viewport setup
and a newer browser did not reliably fix it; all of those experiments were discarded.

A loopback gate instead holds real HTTP responses for only the app's static JavaScript. Routing
continues immediately, and explicit release still waits until native images have decoded. This
passed 40 focused WebKit repetitions, including the original viewport and shell-window order.
The gate cannot fetch arbitrary origins or image/API paths; its servers close after each test.
The combined suite also exposed cross-context WebKit frame stalls, so cases own fresh browser
processes. Capture the shell in the same window after the real page is finished, comparing its
geometry against both the saved pre-hydration and hydrated values. The full 18-case enabled suite
then passed in 54.9s, followed by 36/36 cases in a double repeat (1.9 minutes). The final sequential
root check, img check (87 tests plus types), full verification and packed fixture all passed;
the packed fixture passed 36/36 across both configurations (55.3s and 54.9s).
All original assertions, timeouts and dependencies remain, without retries, skips or fake frames.
An intentional failure in the temporary fixture confirmed that the fresh-browser fixture still
captures failure screenshots and traces. No intentionally failing test is part of the PR.
Final logs: `/tmp/img-round2-2-isolated-{check,img-check,verify,fixture}.log`;
repeat evidence: `/tmp/img-browser-isolated-repeat.log`.
Evidence: `/tmp/img-webkit-{scriptgate,gate-original}.log`; retained failing traces and probes are
under `/tmp/img-round2-webkit-red.d8oxnW` and `/tmp/img-webkit-debug.log`.

The README commit is `e946915`. Its CI run `34691609803` passed nine checks but failed the extra
direct-WebKit-before-JavaScript case. Earlier green repetitions did not establish a reliable fix.
Restoring Playwright's standard context fixture recovered full network/DOM traces; the custom
context had retained test steps and screenshots, but not the complete browser trace.

The approved done criteria require private redirects to decode before application JavaScript in
both browsers. Keep that proof, plus Chromium's extra direct-streaming proof. Direct WebKit uses
normal script loading: its extra held-bundle streaming scenario remains unverified, with React's
resolved content observed in hidden stream containers. This is not evidence of an API2 failure or
a production Safari defect. The HTTP gate and custom browser lifecycle were removed; no retries,
timeouts, authorization assertions, geometry checks or production hydration code were changed.
The scoped full browser run passed 18/18 (`/tmp/img-browser-scoped.log`); the packed matrix follows.

SDK receipt work now wraps one original-only Storage Assembly with an explicit complete path and
conflict errors. Thirty-three red-first tests pass, covering malformed receipts, chunked checksum
input, cancellation, progress, path policy and preserved SDK errors. `StoredImageReceipt` is public
and reaches the generated legacy wrapper. Validation is explicitly after the write, not rollback.

Receipt sources now supply readonly path/geometry and exclude redundant dimension props. Model,
placeholder and direct/redirect signing share a validated source snapshot; ancillary receipt fields
are ignored. Mutation tests reproduce and fix the redirect's original-props dimension read. Image
checks pass 105 tests plus type fixtures; the packed seed now calls the public SDK helper and feeds
its receipt into the public image model. Both production browser pages exercise object sources.

The node package check initially resolved a globally installed Biome 2.5.10 and reported an
unrelated existing SVG fixture. Putting this checkout's pinned Biome 2.4.16 first on PATH made
the package check pass (285 tests, one existing skip). Incidental formatter and generated intent-doc
changes were discarded; the unrelated fixture and dependency versions were not modified.

The final sequential root check, img package check, full verification and packed production matrix
passed. Browser results: 36/36, 54.1s enabled and 52.2s omitted, without retries or skips. The clean
literal Yarn consumer also passed all six seed cases, exact updated snippet parity, public model
execution, shared local utils resolution and TypeScript compilation. It uses the same four tarballs
as that browser matrix: `/tmp/img-receipts-yarn.JD5X0O`. Logs: `/tmp/img-round2-3-*.log`.

The receipt commit `4b330c6` is pushed and all GitHub checks passed, monitored with
`gh-run-watch.ts` (`/tmp/img-round2-3-watch.log`). The explicit-policy env factory is the remaining
commit: its initial 16 runtime regressions failed before implementation, then passed. Additional
invalid-policy cases and type tests retain explicit Storage access, loading/preload discrimination
and redirect-only props. It reads only the three conventional rendering variables once, delegates
to the explicit factory and never loads files or falls back to Assembly credentials.

The final env-factory verification passed: 126 img tests plus type fixtures, root check,
`verify:full`, and 36/36 packed browser cases (55.9s enabled, 54.5s omitted). The direct production
fixture uses the env helper with explicit test-only environment in both build and server processes.
Automatic request/error auditing remains active after removing an unused fixture parameter; every
browser case has response evidence and no retry or skip. A separate clean Yarn consumer verifies
the new literal factory, receipt render and seed, all six offline seed cases, the four local package
resolutions and public TypeScript exports: `/tmp/img-env-yarn.CRhRIp`.
Logs: `/tmp/img-round2-4-{img-check,final-check,verify,fixture,yarn-final-proof,yarn-types}.log`.

One earlier root run failed an unchanged notify-relay cookie test; both full reruns passed all
22 relay tests without changing that package. An isolated diagnostic was invalidated by an
overlapping generated-utils rebuild and was not counted as evidence. Likewise, a bare Node
react-server-condition probe cannot replace Next's client/server module boundaries; the env
factory's runtime proof is the two real Next production builds, not that extra standalone probe.
