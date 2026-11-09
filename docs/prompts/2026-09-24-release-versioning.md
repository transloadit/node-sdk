# Signed, append-only version PR updates

## Why

Release PR #509 already merged as `6b16ad1200e356bed22e00ee5dd11b6411db63f6`. Release run
`35887362708` published Node/legacy 4.14.0, Types/Zod 4.5.0, MCP 0.3.34 and Viewer 0.0.2.
Viewer remains on the alpha tag, with a GitHub prerelease. Do not republish these versions.

The old release branch is gone, but Changesets' current updater force-resets its version branch.
That conflicts with the organization's verified-signature and fast-forward requirements. This
change replaces branch preparation only; Changesets still calculates versions and publishes.

## Contract

- Generate from the exact current main run SHA, never from previously generated versions.
- Restore only generated deltas to the merge base with a signed append-only commit, merge main
  through GitHub, then append the regenerated tree with an exact expected-head check.
- Preserve history as well as bytes: otherwise squash-merging can restore new consumed changesets.
  Preserve executable/symlink source changes through the native merge, not GraphQL's file API.
- Refuse unexpected source edits, invalid file modes and concurrent edits. No force pushes,
  destructive branch recreation, extra credentials or weakened rules.
- Serialize with `queue: max`, retaining up to 100 pending runs. Default single-pending concurrency
  could discard a version-PR publication when the next feature merge arrives.
- Superseded feature runs skip safely. Runs with no pending changesets still publish, even after
  main advances. Keep the existing trusted publisher and Viewer alpha policy.
- This updater deliberately supports the repository's normal Changesets mode, not `pre.json`.
  Viewer uses an npm tag, not Changesets prerelease mode; unexpected generated files fail closed.

## Verification

- [x] Red-first tests for blob newlines, changeset/history consumption, generated conflicts,
      modes, source edits, exact-head updates and stale runs; 24 focused tests pass.
- [x] Real Git object fixture reproduces the broken changeset and lockfile cases, then proves
      the corrected squash tree preserves exact bytes, modes and consumed notes.
- [x] Temporary remote `release-proof` proved a verified two-parent merge under current rules
      (`d50c260cbe6ff99393479f235add337c9d8d208d`); the owned diagnostic branch is removed.
- [x] Three council passes; valid findings reproduced and fixed. The final queue regression is
      covered red-first using GitHub's documented multi-pending queue configuration.
- [x] Final `yarn check` and the explicit strict script typecheck pass.

Merge gate: exact-head PR CI must be green. A future version PR still requires the normal release
review; this workflow repair must not publish new runtime versions by itself.

Temporary, local-only evidence is in `/tmp/storage-canary-20260924.sr1781`. This is not a durable
artifact; use the PR's exact-head CI for the handoff. The separate production Storage canary and
Content/Convex gates are recorded in Content #6103's private living checklist, not this public repo.

https://github.com/transloadit/node-sdk/pull/509
https://github.com/transloadit/content/pull/6103
