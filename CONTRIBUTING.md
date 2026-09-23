# Contributing

We'd be happy to accept pull requests. If you plan on working on something big, please first drop us a line!

## Getting started

To get started, first fork the project on GitHub and clone the project using Git.

## Dependencies management

This project uses [Yarn](https://yarnpkg.com) 4 for dependency management. To install dependencies, run the following command from the project root:

```sh
yarn install
```

To check for updates, run:

```sh
yarn upgrade-interactive
```

If you bump internal `@transloadit/*` versions (for example in `packages/node/package.json`),
run `corepack yarn install` and commit the updated `yarn.lock`. CI uses immutable installs and
release workflows will fail if the lockfile is out of date.

## Tooling requirements

Local tooling (the TypeScript scripts in `scripts/` and package tests) requires Node 22.18+ so `node file.ts` works without flags. The published packages still support Node 20+ at runtime.

## Linting

This project is linted using Biome. You can lint the project by running:

```sh
yarn lint:js
```

## Formatting

This project is formatted using Biome. You can format the project:

```sh
yarn fix:js
```

## Testing

This project is tested using [Vitest](https://vitest.dev). There are two kinds of tests.

### Unit tests

Unit tests are in the [`test/unit`](test/unit) folder of the project. You can run them using the following command:

```sh
yarn test:unit
```

This will also generate a coverage report in the `coverage` directory.

### SDK Edge packaging regression

`yarn test:sdk:edge` packs both SDK names, installs each in a fresh consumer without omitting
optional dependencies, and bundles/runs them with a pinned Supabase Edge Runtime Docker image.
It rejects native image dependencies and bundles above 32 MiB raw / 5 MiB Brotli-compressed
(including the CLI's EZBR header). The 4.12.0 baseline is about 27 MB raw / 2.3 MB compressed;
the upload budget leaves room inside Supabase's 20 MB CLI deployment limit. Evidence is saved
under `test-results/sdk-edge/`.
The bundler uses a fresh 256 MiB tmpfs for its Deno cache to mitigate the pinned runtime's
SQLite initialization race tracked in [#510](https://github.com/transloadit/node-sdk/issues/510).
It does not reuse caches or retry crashes; all package and runtime assertions still run.
Docker with locally reachable published ports is required (for example Docker Desktop or Colima);
an unforwarded remote Docker daemon is not supported. To compare a published version, run
`yarn test:sdk:edge --version 4.12.0`. Version 4.13.0 should fail the regression gate.

### e2e tests

e2e tests are in the [`test/e2e`](test/e2e) folder. They require some extra setup.

Firstly, these tests require the Cloudflare executable. You can download this with:

```sh
curl -fsSLo cloudflared-linux-amd64 https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
```

They also require a Transloadit key and secret, which you can get from https://transloadit.com/c/credentials.

You can run the e2e tests with:

```sh
TRANSLOADIT_KEY='YOUR_TRANSLOADIT_KEY' TRANSLOADIT_SECRET='YOUR_TRANSLOADIT_SECRET' CLOUDFLARED_PATH='./cloudflared-linux-amd64' yarn test:e2e
```

### Code Coverage

Coverage reports are:

- Generated locally in the `coverage` directory
- Uploaded to Codecov for tracking
- Enforced in CI (builds will fail if coverage drops below thresholds)

View the coverage report locally by opening `coverage/index.html` in your browser.

## Packaging the legacy `transloadit` package

The `packages/transloadit` folder is a generated legacy wrapper. Tracked files under that package are refreshed by `scripts/prepare-transloadit.ts`, and CI verifies those tracked files stay in sync with `@transloadit/node`. If you need to validate the published legacy package contents, run:

```sh
yarn pack
```

## Releasing

Only maintainers can make releases. Releases to [npm](https://www.npmjs.com) are automated using GitHub Actions and Changesets (including the legacy `transloadit` package).

Release flow:

1. Add a changeset in your PR:
   - `yarn changeset`
2. Merge the PR to `main`.
3. The `release` workflow opens a “Version Packages” PR with changelog + version bumps.
4. Review and merge the version PR. CI publishes automatically via npm trusted publishing (OIDC).
5. Add [release notes](https://github.com/transloadit/node-sdk/releases) once the publish succeeds.

Changelog guidance:

- Treat changesets as the changelog source. Write them as release notes (short, user-facing, and accurate).
- Per-package `packages/*/CHANGELOG.md` files are generated/updated by Changesets during the “Version Packages” PR. Avoid editing them by hand.
- The top-level `CHANGELOG.md` is historical (the old `v4.x.y` tag series). Prefer GitHub releases and the package changelogs.

Manual fallback (maintainers only):

- On the generated version PR's merged commit: `corepack yarn release:publish`.
- This publishes Viewer with its explicit `alpha` tag, then uses `changeset publish --no-git-tag`
  for the remaining packages and one `changeset tag` pass for release discovery. Duplicate tag
  announcements make the release action try to create the same GitHub release twice. A failed registry lookup stops the
  release; retries do not republish an existing version.

Notes:

- CI publishing requires npm trusted publishing (OIDC) configured for this repo.
- Scoped packages publish to `latest`, except `@transloadit/viewer`, which is an alpha and uses
  `alpha`. Its `publishConfig.tag` alone is insufficient because Changesets passes `--tag latest`.
- Mark the Viewer GitHub release as a prerelease and verify the npm tags after publishing. On first
  publication, npm also assigned `latest` and rejected its removal with HTTP 400 (also reported in
  [npm/cli#8490](https://github.com/npm/cli/issues/8490)). Do not claim alpha-only registry tagging:
  keep the package description, README and GitHub release explicit about alpha stability.
- Viewer prepack uses incremental TypeScript builds, like Utils. Do not recursively clean project
  references there: Changesets can pack dependent packages concurrently.
- If this was a pre-release, remember to reset the [npm `latest` tag](https://www.npmjs.com/package/transloadit?activeTab=versions) to the previous version (replace `x.y.z` with previous version):
  - `npm dist-tag add transloadit@X.Y.Z latest`

### Release FAQ

- **Independent versions:** Changesets are not fixed to a single version. Only packages listed in a changeset bump; internal dependency changes auto-bump dependents (patch) via `updateInternalDependencies`.
- **Legacy wrapper sync:** PR checks run `scripts/prepare-transloadit.ts` and fail if tracked files in `packages/transloadit` drift from `@transloadit/node`.
- **Legacy parity:** `yarn parity:transloadit` remains available as a manual release/debug check when you need to compare the generated wrapper tarball against the recorded baseline.
- **Accepting intentional parity drift:** run `node scripts/prepare-transloadit.ts` before updating the parity baseline, then follow the parity tool instructions to regenerate `docs/fingerprint/*` so the baseline reflects the latest build.
- **Scoped packages:** Scoped packages publish to the default npm dist-tag unless a workflow or manual publish step overrides it. The unscoped `transloadit` package remains stable.
- **Changelog visibility:** the “Version Packages” PR is the single source of truth for what gets published. If something was published to npm without a corresponding GitHub release/tag, add the missing release/tag so users can discover the change history from GitHub.
