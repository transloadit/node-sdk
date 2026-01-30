[![Build Status](https://github.com/transloadit/node-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/transloadit/node-sdk/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/transloadit/node-sdk/branch/main/graph/badge.svg)](https://codecov.io/gh/transloadit/node-sdk)

<a href="https://transloadit.com/?utm_source=github&utm_medium=referral&utm_campaign=sdks&utm_content=node_sdk">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://assets.transloadit.com/assets/images/sponsorships/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://assets.transloadit.com/assets/images/sponsorships/logo-default.svg">
    <img src="https://assets.transloadit.com/assets/images/sponsorships/logo-default.svg" alt="Transloadit Logo">
  </picture>
</a>

# Transloadit JavaScript/TypeScript SDKs

Monorepo for Transloadit SDKs and shared packages.

For SDK usage docs, see `packages/node/README.md`.

## Packages

- `@transloadit/node` — Node.js SDK + CLI (experimental). See `packages/node/README.md`.
- `transloadit` — Stable unscoped package (built from `@transloadit/node`).
- `@transloadit/types` — Shared TypeScript types.
- `@transloadit/utils` — Shared utilities.
- `@transloadit/zod` — Zod schemas for Transloadit APIs.

## Development

- Install: `corepack yarn`
- Checks + unit tests: `corepack yarn check`
- Node SDK unit tests: `corepack yarn workspace @transloadit/node test:unit`

See `CONTRIBUTING.md` for full guidelines.

## Repo notes

- Docs live under `docs/`.
- The `transloadit` package is prepared via `scripts/prepare-transloadit.ts`.

