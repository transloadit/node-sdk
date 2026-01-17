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

Only maintainers can make releases. Releases to [npm](https://www.npmjs.com) are automated using GitHub actions and Changesets (including the legacy `transloadit` package). To make a release, perform the following steps:

1. Create a changeset:
   - `yarn changeset`
2. Version packages (updates `CHANGELOG.md` + workspace `package.json` files):
   - `yarn changeset version`
   - `git add -A && git commit -m "chore: version packages"`
3. Push the version commit and tags:
   - `git push origin main`
4. Publish (maintainers only; GitHub Actions handles the release):
   - `yarn changeset publish`
5. When successful add [release notes](https://github.com/transloadit/node-sdk/releases).
6. Scoped packages publish with the `experimental` dist-tag by default. If you need to promote a scoped package to `latest`, update the tag manually.
7. If this was a pre-release, remember to reset the [npm `latest` tag](https://www.npmjs.com/package/transloadit?activeTab=versions) to the previous version (replace `x.y.z` with previous version):
   - `npm dist-tag add transloadit@X.Y.Z latest`

### Release FAQ

- **Lockstep versions:** Changesets use a fixed group, so version bumps and releases are always in lock‑step across `transloadit`, `@transloadit/node`, `@transloadit/types`, and `@transloadit/zod`.
- **Legacy parity:** `transloadit` is generated from `@transloadit/node` artifacts via `scripts/prepare-transloadit.ts`, then verified with `yarn parity:transloadit`. Only `package.json` metadata drift is allowed; any other drift fails.
- **Experimental packages:** Scoped packages (`@transloadit/node`, `@transloadit/types`, `@transloadit/zod`) publish with the `experimental` dist-tag. The unscoped `transloadit` package remains stable.
