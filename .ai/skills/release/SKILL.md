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
   3. If you touched `packages/node` (or anything that affects the legacy `transloadit` clone):
      1. Run `corepack yarn parity:transloadit`
      2. If it updates `docs/fingerprint/transloadit-baseline*.json`, commit those changes in the PR
   4. `corepack yarn check`
   5. Commit + push branch
   6. Open PR, wait for CI green
   7. Squash-merge the PR

   Notes:
   1. When creating PRs with `gh pr create` from a shell, avoid unescaped backticks in the `--body` string.
      Prefer `--body-file` to prevent accidental command substitution.

3. Merge the "Version Packages" PR (changesets action):
   1. Wait for the `Version Packages` PR to appear (or update)
   2. Checkout that branch locally:
      1. `git fetch origin changeset-release/main`
      2. `git checkout changeset-release/main`
   3. Ensure `yarn.lock` is up to date (CI will fail otherwise):
      1. `corepack yarn`
      2. If `yarn.lock` changed: `git add yarn.lock && git commit -m "chore: update yarn.lock for release" && git push`
   4. Verify the Version Packages PR includes all expected linked/versioned packages:
      1. Read the `# Releases` section (this is the authoritative "what will publish")
      2. If you expect a linked package to bump (e.g. `@transloadit/node` and `transloadit`), ensure the PR updates both.
         If it doesn't, fix before merging (otherwise tags/releases can drift).
   5. Ensure CI is green for the PR
   6. Squash-merge the PR

4. Immediately after merging the Version Packages PR:
   1. `git checkout main && git pull`
   2. Run `corepack yarn check` (catches formatting/knip/ts/unit drift early)

5. Prevent the `packages/transloadit` clone from drifting (special case):
   1. If the `transloadit` package exists in this repo, keep it in sync with `@transloadit/node` by running:
      1. `git checkout main && git pull`
      2. `node scripts/prepare-transloadit.ts`
      3. Refresh parity baselines (if they changed):
         1. `node scripts/fingerprint-pack.ts ./packages/transloadit --ignore-scripts --quiet --out ./docs/fingerprint/transloadit-baseline.json`
         2. `cp ./packages/transloadit/package.json ./docs/fingerprint/transloadit-baseline.package.json`
      4. `corepack yarn check`
      5. If anything changed, commit + push to `main`

6. Monitor the `Release` workflow on `main`:
   1. `gh run list --workflow Release --branch main --limit 5`
   2. `gh run watch <run_id>`
   3. If it fails after publishing due to a missing tag:
      1. Identify the missing tag in the job logs (it will look like `<pkg>@<version>`)
      2. Create/push the missing tag from `main`:
         1. `git checkout main && git pull`
         2. `git tag <pkg>@<version>`
         3. `git push origin <pkg>@<version>`
      3. If needed, create a GitHub release:
         1. `gh release create <pkg>@<version> --generate-notes`

7. Verify what should have been published:
   1. In the merged `Version Packages` PR, read the `# Releases` section to get the authoritative list.

8. Verify npm publish for each released package:
   1. For each `<pkg>@<version>` in the `# Releases` section:
      1. `npm view <pkg> version` (should match)
      2. `git tag -l '<pkg>@<version>'` (tag should exist)
   2. If npm versions look stale, wait ~60s and retry (registry propagation)
