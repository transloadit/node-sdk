# Viewer alpha: Changesets release and Content adoption

## Requested outcome

Kevin authorized publishing the first Viewer alpha and completing the existing Version Packages
PR #502, including its Node/CLI, Utils, Types, Zod and MCP releases. Use the release procedure in
`CONTRIBUTING.md`: changeset in a reviewed PR, generated version/changelog PR, then trusted
publishing. Do not hand-edit versions or generated changelogs, deploy API2, or merge Uppy.

The first Viewer patch changeset should produce **0.0.1**. This is an alpha product, not a stable
API promise: label its description and README accordingly, provide the `alpha` npm tag, and mark
its GitHub release as a prerelease. Record the actual registry version and tags before declaring
it available. The existing Changesets publisher passes `--tag latest`, overriding a package's
`publishConfig.tag`; that field alone is not proof of the final registry state. Do not put the
whole SDK into Changesets prerelease mode merely to release one experimental package.

Viewer needs Utils 4.9's new exports. Let the existing Utils changesets and normal dependency
versioning update its registry dependency, and verify that the generated Viewer manifest requires
at least 4.9.0 before publishing. The old private workspace protocol must not escape into npm.

## Gates

- [x] Read contributing/release instructions and confirm the existing release PR's scope.
- [x] Reproduce private-package/registry-dependency metadata failure with a regression test.
- [x] Verify package checks and the packed Next browser fixture (Chromium/WebKit, both cache modes,
  and development diagnostics). Run the versioned release dry run in PR CI.
- [ ] Reconcile council review; open and finish the alpha preparation PR.
- [ ] Inspect generated #502 versions, dependency floors, changelogs and exact-head CI.
- [ ] Merge #502, watch trusted publication and verify every expected registry version.
- [ ] Verify Viewer alpha tag and GitHub prerelease; prevent an accidental stable `latest` claim.
- [ ] Prove a registry-installed consumer, not just a workspace-linked or vendored package.

For a new npm package, trusted-publisher bootstrap may need a maintainer action. Follow the
documented `release:publish` Changesets fallback only if the actual CI failure requires it, on the exact
generated release commit, after identifying which packages remain unpublished. Never republish a
version, expose credentials or treat a successful pack as a successful release.

## Review and verification

There were no comments or reviews on #502 at inspection. The first council found two valid release
issues, both reproduced red-first and fixed: Changesets overriding the alpha npm tag, and Viewer's
recursive TypeScript clean deleting dependent Utils artifacts during concurrent packaging.
The publisher now explicitly publishes only Viewer to alpha, then lets Changesets publish the
remaining packages and generate tags. Registry lookup failures fail closed and published versions
are skipped on retry. Viewer uses the same incremental build approach as Utils. A follow-up council
reported no further findings. An explicit TypeScript check caught an overloaded `execa` type
extraction error; the options now use its public `Options` type. Claude's review legs could not run because their monthly
spend limit was reached; do not count that leg as a successful independent review.

Local `verify:full`, `check`, the 30 image fixture contract tests and the seven publisher tests pass.
The packed fixture passed both production modes (58 browser cases each), the secretless public-only
builds, and ten development cases. Evidence: `/tmp/viewer-alpha-20260921.gU9s3H/`.

## Before API2 is deployed

Storage Built-ins, native catalog APIs and device login need the matching backend rollout. The
README must not imply that merging or publishing the SDK has deployed those endpoints. Existing
origin-pinned HTTP/S3 Templates are independently usable.

Content already has a signed website-image Template and a static candidate policy. Its regular
Viewer `Image` direct-delivery factory intentionally calls `connection()` and rotates short-lived
signatures. Replacing the current static site wrapper with that factory would change prerendering
and cache behavior. Start with the published package and its resolved-model `TransloaditPicture`
renderer, preserving the existing URLs, origin limits, expiry, layout, responsive widths, no-script
fallback and WebKit hydration safeguards. Media-gated slots need their existing inert fallback
until the shared renderer supports the same contract. Do not silently make pages dynamic or add
per-image redirect requests for this public-site adoption.

The later production sequence remains backend deploy by Kevin/deployer → Console browser and
`gog` account/workspace proof → published CLI → Storage dogfood in Content and the Convex wedding
golden path. Keep application authorization/metadata in Convex and do not merge Uppy.

## Build monitoring

Monitoring began September 21, 2026 at 18:15 UTC, with a three-hour deadline (21:15 UTC), using
Content's `_scripts/alphalib/bin/gh-run-watch.ts`. SDK main `a2c5dd7` is green. API2 main `f664f5e`
was superseded/cancelled by `3abb5f0b81`; follow run `35637074003`, which includes the Storage merge.
Its predecessor `35627027644` still occupied the main concurrency group at inspection.
At 18:43 UTC, another main merge superseded that pending run: follow `35640243219` at `3555e451c2`
without extending the original 21:15 UTC monitoring deadline.

Content main run `35636664743` failed before checkout on Spot-interrupted runners, including
`sb93ep` with deadline 18:13:19 UTC. Preserve the logs and do not call that run green. Evidence and
watcher logs: `/tmp/viewer-alpha-20260921.gU9s3H/`. Report the actual final API2 buildtar URL when
verified; deployment belongs to Kevin and the deployer agent.
