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

The `packages/transloadit` folder is a generated legacy wrapper. The `src` directory and top-level `README.md`, `CHANGELOG.md`, and `LICENSE` are produced during packing by `scripts/prepare-transloadit.ts` and are not tracked in git. If you need to validate the legacy package contents, run:

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

- `corepack yarn changeset publish`

Notes:

- CI publishing requires npm trusted publishing (OIDC) configured for this repo.
- Scoped packages publish with the `experimental` dist-tag by default. If you need to promote a scoped package to `latest`, update the tag manually.
- If this was a pre-release, remember to reset the [npm `latest` tag](https://www.npmjs.com/package/transloadit?activeTab=versions) to the previous version (replace `x.y.z` with previous version):
  - `npm dist-tag add transloadit@X.Y.Z latest`

### Release FAQ

- **Independent versions:** Changesets are not fixed to a single version. Only packages listed in a changeset bump; internal dependency changes auto-bump dependents (patch) via `updateInternalDependencies`.
- **Legacy parity:** `transloadit` is generated from `@transloadit/node` artifacts via `scripts/prepare-transloadit.ts`, then verified with `yarn parity:transloadit`. Only `package.json` metadata drift is allowed; any other drift fails.
- **Accepting intentional drift:** run `node scripts/prepare-transloadit.ts` before updating the parity baseline, then follow the parity tool instructions to regenerate `docs/fingerprint/*` so the baseline reflects the latest build.
- **Experimental packages:** Scoped packages (`@transloadit/node`, `@transloadit/types`, `@transloadit/zod`) publish with the `experimental` dist-tag. The unscoped `transloadit` package remains stable.
- **Changelog visibility:** the “Version Packages” PR is the single source of truth for what gets published. If something was published to npm without a corresponding GitHub release/tag, add the missing release/tag so users can discover the change history from GitHub.
