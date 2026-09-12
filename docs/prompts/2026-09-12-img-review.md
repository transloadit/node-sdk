# Storage image onboarding review

## Why

Finish the complete Storage image DX in one reviewable PR, node-sdk #500 against `main`.
The orchestrator supplied the whole-stack council review; do not duplicate that review.

## Review checklist

- [x] Reject non-string `alt` from JavaScript callers, including the renderer and factory paths.
      Preserve strings, including the empty decorative alternative. Reproduce before fixing.
- [x] Keep the pending Suspense shell free of the resolved image's `id` and ARIA relationships.
      Preserve the real image's attributes and the placeholder's layout. Reproduce before fixing.
- [ ] Run package checks, the packed Next fixture, and repository verification; monitor CI.
- [ ] Retarget #500 to `main` and describe the whole A–D change, including schema provenance.
      Close #497–#499 as superseded, without merging or publishing anything.
- [ ] Dogfood one local Content consumer against the isolated canary devdock using the packed
      README recipe, then run the fresh-reader user test. Record `/tmp/img-dogfood-round1.md`.
- [ ] Add the approved native-browser proof in this same PR after dogfood and the user test.

The two P3 fixes belong at the top of the existing `img-onboard` branch. No rebase or force push
is needed. Transparency, package publication, API2 implementation, and production access remain
outside this slice.

The new focused run reproduced six failures before the fix and passed all 65 tests afterward.
Logs: `/tmp/img-task2-p3-red.log` and `/tmp/img-task2-p3-green.log`. The shared attribute snapshot
now validates `alt`; both rendering paths reuse the validated value. The fallback excludes all
caller ARIA attributes because it is inert and decorative; its own `aria-hidden` remains.

After both fixes, `yarn check`, `yarn verify:full`, img checks (87 tests plus type fixtures), and
the packed production Next fixture passed. The package and fixture checks ran sequentially.
