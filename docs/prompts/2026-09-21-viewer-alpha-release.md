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
- [x] Reconcile council review; open and finish the alpha preparation PR (#503).
- [x] Inspect generated #502 versions, dependency floors, changelogs and exact-head CI.
- [x] Merge #502, watch trusted publication and verify every expected registry version.
- [x] Verify Viewer alpha tag and GitHub prerelease; document npm's retained `latest` tag without
  claiming stable API support.
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

## Publication receipts and follow-up

#503 merged as `78de89e`; #502 merged as `a4db0b2` with green PR and main CI. The bot's force push
was prohibited, so #502 was regenerated with Changesets and updated through normal commits without
weakening repository rules. Its merged tree matches the tested head `fe77d59`.

Viewer 0.0.1 required a maintainer MFA bootstrap because trusted publishing could not create the
new package. The registry accepted it at 19:34 UTC; its package index caught up around 19:39 UTC.
Release run `35643913063`, attempt 3, published the other six packages through trusted publishing:
Utils 4.9.0, Node and legacy CLI 4.13.0, Types and Zod 4.4.1, MCP 0.3.32. All seven versions are
independently available from the registry; the six CI-published versions have provenance.
Viewer's GitHub release is explicitly an alpha/prerelease. npm auto-created `latest` alongside
`alpha`; removing that Viewer-only tag with a fresh MFA code returned HTTP 400, matching
[npm/cli#8490](https://github.com/npm/cli/issues/8490). Do not keep requesting codes for this refusal
or claim that `latest` was removed. Alpha stability remains explicit in the package, README and
GitHub release. Configure its trusted publisher for future releases rather than leaving manual
publishing as the permanent process.

The packages and all seven GitHub releases were created, but the workflow then failed: both
`changeset publish` and `changeset tag` emitted the stable package tags. With this workflow's
GitHub-API commit mode, the action parsed both announcements and tried to create those releases
twice. Do not delete valid releases or publish new versions to hide that failure.

- [x] Reproduce the missing `--no-git-tag` guard with a failing publisher test.
- [x] Disable publication's tag pass and retain one final tag pass, including Viewer.
- [x] Cover failure before tagging so an incomplete publish does not announce unready versions.
- [ ] Review and verify this narrow release-orchestration fix; land it and confirm main's release
      workflow succeeds without republishing any existing version.

The follow-up council reported no findings; its Claude leg hit the monthly spending limit again.
The eight publisher tests and `yarn check` pass. No package version or published bytes change in
this orchestration fix.

Content PR #6047 is the registry-installed consumer and records the later backend/Console/CLI and
Storage dogfood gates. The API2 x64 main build at `b553c67b84` is green and uploaded to R2:
`s3://build-artifacts-transloadit/main/api2/api2-gha-ci-35641331297.tar.gz`. ARM64 is still running at
this checkpoint. Deployment remains Kevin's responsibility.

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
