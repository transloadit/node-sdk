# Private CDN signing-window reuse

## Why

The production Convex dogfood measured cold private renditions at 1.91–2.60 seconds, while
repeating the exact signed URL hit the CDN in 25–135 ms. The default minute boundary creates
another cache key. This narrow change permits a longer window without extending the grant's
maximum lifetime or caching an application's authorization result. It does not accelerate the
first cold transform. The runtime-neutral route is the only changed delivery API.

## Contracts and verification

- [x] Preserve the default interval and five-minute maximum lifetime.
- [x] Permit an explicit positive integer interval no greater than half the lifetime.
- [x] Red first: four longer-window cases and seven invalid configurations fail on main.
- [x] All 101 route tests and all 468 Viewer tests pass after implementation.
- [x] Cover preview, crop, original and download, GET/HEAD, clock boundaries and same-window
  revocation; retain per-request authorization and `private, no-store`.
- [x] Document the remaining-validity tradeoff; add a Viewer-only alpha patch changeset.
- [x] Council review: no remaining issues; retain the unchanged Node/Next defaults deliberately.
- [x] Full repository `yarn verify:full` passes (existing lint warnings remain).
- [x] Local defensive Opus security review: PASS, no supported P0–P3 findings. This is an
  in-memory API review, not a live CDN security claim. Rebuilt/reran all 468 Viewer tests on
  commit `3d3192e`; retained its SHA and source/build checksums with the machine-readable result.
- [x] Reconcile the local packed-fixture attempt: stale npm metadata was fixed with an isolated
  fresh cache; install, seed and consumer type checks passed. Firefox extraction then stalled
  for ten minutes. Stopped only the owned installer processes; no browser PASS is claimed.

Merge/release gate: the unchanged packed browser fixture and all other checks must pass on the
exact PR head: <https://github.com/transloadit/node-sdk/pull/527>. No tests or gates are disabled.

## Consumer follow-up

After the normal Changesets alpha release, the Convex demo can explicitly choose a 150-second
window and 300-second maximum lifetime. Verify repeat-view reuse and denial/expiry again after
deployment. Keep the default unchanged for other consumers. API2 rendition reuse across signing
windows needs a separate design; do not remove authentication or expiry from Bunny's cache key.
