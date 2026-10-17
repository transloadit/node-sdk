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

## Versioning policy

These packages mirror a live API. When API2 changes a Robot parameter, every customer gets that
change at once, whatever SDK version they installed. A major for each such change would give us
dozens of majors a year and teach users to ignore them. So we version two surfaces differently:
the **SDK surface** follows strict SemVer, and the **API contract** follows the API.

### SDK surface: strict SemVer

A breaking change to any of these requires a major:

- Package names, `exports` entry points and subpaths, module format and the supported Node.js
  range. We support TypeScript releases from the last two years, like DefinitelyTyped; dropping an
  older one is not breaking.
- Names of exported symbols, generated ones included. When API2 renames something, add the new
  name, keep the old one as a `@deprecated` alias, and remove it in the next major.
- The `Transloadit` client: constructor options, method names and parameters, return wrappers,
  error classes and their documented fields, and retry, polling and upload behavior.
- Hand-written helpers and types, such as `prepareInputFiles`, the signing helpers and
  `StoredImageReceipt`, and everything in `@transloadit/utils`.
- CLI command names, hand-written flags, exit codes, credential resolution order and `--json`
  output.
- The helper functions and supported Zod versions of `@transloadit/zod`.
- What the SDK, CLI and MCP server send, accept or reject at runtime for unchanged caller code,
  apart from explicit API-contract schema parsing and lint validation described below.

### API contract: follows API2

Types and schemas synced from alphalib describe what the Transloadit API accepts and returns today:
Robot parameters (names, optionality, nullability, defaults, enums, limits and refinements),
Assembly Instructions, Assembly status and other response types, error-code lists, Robot
metadata, model lists, descriptions and examples, lint rules that mirror API validation, and CLI
intent flags generated from Robot parameters. Their shapes, and Zod internals such as wrapper
classes, `.shape` and parse-time defaults, follow the API rather than SemVer.

### Bump rules

| Change | Bump |
| --- | --- |
| SDK bug fix, documentation, or a contract sync that only changes descriptions or examples | patch |
| New SDK feature or export, or an additive contract sync: new Robot, optional parameter, enum value or response field | minor |
| Type-breaking contract sync: an input type accepts less, or an output type returns more (`null`, `undefined`, a wider union, a removed parse-time default) | minor, with a `Type-breaking:` line |
| Breaking change to the SDK surface | major |
| Contract sync that changes SDK runtime behavior for unchanged code, for example the CLI rejecting instructions the API still accepts | major, or a warning in a minor first |

- Stable-package patch releases never contain contract type or validation changes, or type-breaking
  changes, so a `~` range only brings fixes. We do not backport fixes to older minors.
- A contract sync may still justify a major if it also breaks the SDK surface and the README quick
  start or `examples/` need edits to compile. Name that SDK break in the changeset; a contract-only
  type break still ships in a minor.
- SDK majors are batched: deprecate in a minor, collect removals in one tracking issue, and remove
  them together in the next major.
- Pre-1.0 packages (`@transloadit/mcp-server`, `@transloadit/notify-url-relay` and the alpha
  `@transloadit/viewer`) use a minor for breaking changes and a patch for everything else. Contract
  syncs are patches there unless their tools, CLI or exports change.

### Writing contract changesets

- Bump `@transloadit/node`, `transloadit`, `@transloadit/types` and `@transloadit/zod` by `minor`,
  or by `patch` for description-only syncs. Add `@transloadit/mcp-server` as described under
  Releasing.
- Start the summary with `Contract:` and link the API2 pull requests being synced.
- Add one `Type-breaking:` bullet per type-breaking change: what changed, who is affected (authors
  of Assembly Instructions, or readers of parsed output and API responses) and how to adapt.
- A contract-only sync is never `major`. Every `major` changeset contains an `SDK-breaking:` line
  that names the SDK surface it breaks.

```md
---
'@transloadit/node': minor
'transloadit': minor
'@transloadit/types': minor
'@transloadit/zod': minor
'@transloadit/mcp-server': patch
---

Contract: sync Robot schemas from API2 (transloadit/api2#9897, transloadit/api2#9938).

- Type-breaking: `/video/subtitle` no longer fills in `font`, `font_size` and `bold` while
  parsing. Parsed values (`RobotVideoSubtitleInstructions`, `AssemblyInstructions`,
  `schema.parse()`) can be `undefined`; the API still applies Arial, 16 and `false`, or the
  `social` style’s defaults. Instruction input types are unchanged.
- Type-breaking: `/video/thumbs` accepts `null` for `offsets`, `width` and `height`, so parsed
  values can be `null`. Treat `null` like an omitted value.
```

### What we tell consumers

Repeat this in the package READMEs:

- Commit your lockfile and type-check dependency update PRs. Type-breaking contract changes show
  up there, not in production.
- For the stable SDK packages, use `~` ranges for stable types: patch releases never change contract
  types. Use `^` to follow the API as it evolves. Pre-1.0 packages follow the exceptions above.
- Type the instructions you write with the input types, for example
  `const params = { steps } satisfies CreateAssemblyParams`. API changes usually widen these.
- Narrow fields from responses and parsed output before using them (`null`, `undefined`, unknown
  strings).
- Do not depend on Zod internals such as wrapper classes, `.shape` or parse-time defaults.

## Releasing

Only maintainers can make releases. Releases to [npm](https://www.npmjs.com) are automated using GitHub Actions and Changesets (including the legacy `transloadit` package).

Release flow:

1. Add a changeset in your PR:
   - `yarn changeset`
2. Merge the PR to `main`.
3. The `release` workflow opens a “Version Packages” PR with changelog + version bumps.
4. Review and merge the version PR. CI publishes automatically via npm trusted publishing (OIDC).
5. Add [release notes](https://github.com/transloadit/node-sdk/releases) once the publish succeeds.

The standard Changesets action maintains `changeset-release/main`, using GitHub API commits
to preserve verified signatures. The generated release branch permits force updates; `main`
and ordinary feature branches still forbid them. Do not edit the generated branch by hand.

Changesets owns version calculation, changelogs and publication. If a version update fails, inspect
the error and rerun the latest main release job. Do not merge an incomplete update. Approve any CI
runs awaiting approval on the bot-created PR before merging it. Do not bypass the required checks
or branch rules.
Release runs use GitHub's `queue: max` so newer pushes do not replace a pending publication run.
The queue supports up to 100 pending runs; monitor a larger backlog rather than assuming unlimited
retention. A superseded run with changesets skips versioning; a version-PR merge with no pending
changesets still goes through the existing publisher, even if main has advanced.

Changelog guidance:

- Treat changesets as the changelog source. Write them as release notes (short, user-facing, and accurate).
- Per-package `packages/*/CHANGELOG.md` files are generated/updated by Changesets during the “Version Packages” PR. Avoid editing them by hand.
- The top-level `CHANGELOG.md` is historical (the old `v4.x.y` tag series). Prefer GitHub releases and the package changelogs.

Manual fallback (maintainers only):

- On the generated version PR's merged commit: `corepack yarn release:publish`.
- This publishes Viewer with its explicit `alpha` tag, then uses `changeset publish --no-git-tag`
  for the remaining packages and one `changeset tag` pass for release discovery. After npm accepts
  Viewer, the script waits up to ten minutes for registry visibility before handing off to
  Changesets. Lookup failures stop the release; a timeout does not trigger another publication.
  Check registry visibility before retrying the workflow on the same commit. Duplicate tag
  announcements make the release action try to create the same GitHub release twice. Retries do not
  republish an existing version.

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
