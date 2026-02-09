---
name: release
description: Checklist for releasing packages from this monorepo (code PR -> Version Packages PR -> npm publish).
---

# Release Checklist

1. Update local state:
   1. `git checkout main && git pull`
   2. `git status --porcelain=v1` (must be clean)

2. Prepare a code PR (feature/fix changes):
   1. Create branch from `main`
   2. Make changes
   3. `corepack yarn check`
   4. Commit + push branch
   5. Open PR, wait for CI green
   6. Squash-merge the PR

3. Merge the "Version Packages" PR (changesets action):
   1. Wait for the `Version Packages` PR to appear (or update)
   2. Checkout that branch locally:
      1. `git fetch origin changeset-release/main`
      2. `git checkout changeset-release/main`
   3. Ensure `yarn.lock` is up to date (CI will fail otherwise):
      1. `corepack yarn`
      2. If `yarn.lock` changed: `git add yarn.lock && git commit -m "chore: update yarn.lock for release" && git push`
   4. Ensure CI is green for the PR
   5. Squash-merge the PR

4. Prevent `transloadit` tag/version mismatches:
   1. Immediately after merging the Version Packages PR, sync the `packages/transloadit` clone on `main`:
      1. `git checkout main && git pull`
      2. `node scripts/prepare-transloadit.ts`
      3. Refresh parity baselines (if they changed):
         1. `node scripts/fingerprint-pack.ts ./packages/transloadit --ignore-scripts --quiet --out ./docs/fingerprint/transloadit-baseline.json`
         2. `cp ./packages/transloadit/package.json ./docs/fingerprint/transloadit-baseline.package.json`
      4. `corepack yarn check`
      5. If anything changed, commit + push to `main`

5. Monitor the `Release` workflow on `main`:
   1. `gh run list --workflow Release --branch main --limit 5`
   2. `gh run watch <run_id>`
   3. If it fails after publishing due to a missing `transloadit@X.Y.Z` tag:
      1. Ensure `packages/transloadit/package.json` `version` matches the published `transloadit` version (step 4)
      2. Create/push the missing tag:
         1. `git tag transloadit@X.Y.Z`
         2. `git push origin transloadit@X.Y.Z`
      3. Create a GitHub release for it (optional but keeps parity with other packages):
         1. `gh release create transloadit@X.Y.Z --generate-notes`

6. Verify npm publish:
   1. `npm view @transloadit/node version`
   2. `npm view @transloadit/mcp-server version`
   3. `npm view transloadit version`
   4. If values look stale, wait ~60s and retry (registry propagation)

