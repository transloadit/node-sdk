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
- [ ] Monitor the browser-proof commit's GitHub checks; keep README feedback for the next brief.

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
