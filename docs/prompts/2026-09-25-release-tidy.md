# Restore standard Changesets version PRs

Kevin approved this follow-up on September 25, 2026, after the generated release-branch
force-update exemption was installed and Convex release #34 passed publication/deployment.

## Why

The SDK's append-only version writer existed to work around a rule that now has a narrow,
intentional exception. The standard action already supports GitHub-signed commits. Remove the
writer and its implementation-specific tests, while retaining queued main runs and the existing
version/install and alpha-aware publish commands.

Separately, npm accepted Viewer 0.0.3 before exposing it in package metadata. Handing control to
Changesets immediately caused a second publication attempt. This change waits for that exact
version, with a ten-minute deadline and bounded fresh registry lookups; auth/server failures
stop the run, and a timeout never republishes or changes tags.

## Progress and review

- [x] Start from main `5b2b550` in the configured, clean framework1 SDK checkout; preserve the
      separate local checkout's contract work.
- [x] Reproduce red first: five failures in the 11-test publisher/workflow suite on unchanged
      implementation (missing visibility checks and custom writer still wired into the workflow).
- [x] Remove the 258-line writer and its 363-line tests. Recovery remains in Git history.
- [x] Restore standard `changesets/action` versioning with `commitMode: github-api`.
- [x] Preserve Viewer alpha publication, single tag emission, OIDC and FIFO main release runs.
- [x] Wait for accepted publication to become visible; test delayed visibility, deadline, and
      errors without a second publish. Focused suite: 11 tests pass.
- [x] Run required repository checks and immutable installation. `yarn check` passes after
      refreshing ignored generated Zod output from the previous checkout. Publisher/workflow:
      11; script suite: 46; Utils: 63; Viewer: 456; Node: 863 plus one existing skip; MCP: 53;
      generated Types/Zod tests and notify relay: pass. Existing informational lint notices and
      Vitest/coverage peer-version warnings remain outside this release-only change.
- [x] Council review (`/tmp/council-qCNup1`, two reviewers plus arbiter): both findings were valid.
      Restore a small stale-main guard, separate from the removed version writer; publication
      runs without changesets still proceed. Remove the obsolete append-only instructions.
      Nine new/extended assertions failed first; the combined publisher/guard suite now passes
      all 19 tests, and a second full `yarn check` passes (script suite: 54).
- [ ] Open PR and monitor exact-head CI to green.
- [ ] After merge, follow the main release workflow; do not manufacture a package bump just to
      exercise npm publication.

No product runtime or published package version changes are intended. Tests mock npm publication;
no credentials, existing npm tags, global rules or `.env` files are modified.
