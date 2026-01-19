# Monorepo architecture

## Overview

This repository is a Yarn 4 workspace that publishes a small set of cohesive packages:

- `@transloadit/node` — canonical Node SDK runtime.
- `transloadit` — legacy wrapper package that stays byte-for-byte compatible with the current npm artifact.
- `@transloadit/types` — generated `.d.ts` contract (assemblies, robots, templates, responses), no runtime deps.
- `@transloadit/zod` — Zod schemas, with versioned subpaths (`/v3`, `/v4`).

The goal is stable backwards compatibility, a single source of truth for types, and a clean path to multi‑platform SDKs.

## Repository layout

```
node-sdk/
  packages/
    node/                     # @transloadit/node runtime
    transloadit/              # legacy wrapper package
    types/                    # @transloadit/types (d.ts only)
    zod/                      # @transloadit/zod (v3 + v4 schemas)
  docs/
  scripts/
```

## Source of truth: alphalib

`packages/node/src/alphalib/types` is the synced source of truth for the public contract. We do not hand‑edit schema types in other packages; everything is derived from alphalib.

## Packages

### @transloadit/node

- Canonical runtime implementation.
- Used as the source for the legacy `transloadit` wrapper.

### transloadit

- Publishes the legacy package name.
- Built from the same runtime artifacts as `@transloadit/node`.
- Compatibility is verified via tarball fingerprinting.
- Allowed drift is limited to `package.json` metadata and is reported explicitly.

### @transloadit/types

- Pure type package; no Zod runtime dependency.
- Types are generated from Zod v3 schemas into `.d.ts` only.
- Consumers get fast type‑checking without pulling in Node or Zod.

### @transloadit/zod

- Publishes Zod schemas for runtime validation.
- Versioned exports:
  - `@transloadit/zod/v3/*`
  - `@transloadit/zod/v4/*`

## Zod sync & generation pipeline

### v3 sync (`packages/zod/scripts/sync-v3.ts`)

- Copies alphalib types into `packages/zod/src/v3`.
- Rewrites `zod` imports to `zod/v3`.
- Writes the v3 `index.ts` barrel.

### v4 sync (`packages/zod/scripts/sync-v4.ts`)

- Transforms `src/v3` into `src/v4`.
- Rewrites imports to `zod/v4` and applies compatibility patches:
  - `z.record(...)` gets explicit string key types for v4.
  - `.passthrough()` is rewritten to `.catchall(z.unknown())` to preserve output types.
  - Interpolation helpers handle v4 `pipe` (used by transforms and preprocess) and avoid discriminated‑union expansion.
  - Known ai‑chat schema differences are patched (JSON value output + tool‑result optionality).

### Generated sources

- `packages/zod/src/v3` and `packages/zod/src/v4` are generated and git‑ignored.
- Build output is emitted to `packages/zod/dist`.

## Validation gates

1. **Type equality**

   - `packages/zod/test/type-equality-v3.ts`
   - `packages/zod/test/type-equality-v4.ts`
   - These assert `z.infer` output matches `@transloadit/types` exactly (non‑distributive mutual assignability).

2. **Runtime parity**
   - `packages/zod/test/runtime-parity.test.ts`
   - Uses fixtures from `packages/zod/test/fixtures/assembly-instructions.ts` and checks v3/v4 success parity.

The `@transloadit/zod` `check` script runs `sync`, `tsc`, and runtime parity.

## Node & TypeScript execution

All internal scripts are TypeScript and rely on Node’s built-in type stripping. Tooling expects Node 22.18+ (or newer) so scripts can run directly via `node script.ts` without flags.

## Publishing strategy

- `@transloadit/node` is canonical.
- `transloadit` is generated from the same artifacts and fingerprinted.
- `@transloadit/types` and `@transloadit/zod` are versioned in lock‑step (changesets).

### Parity verification

The `transloadit` tarball is compared against a recorded baseline:

- `scripts/fingerprint-pack.ts` creates a tarball fingerprint.
- `scripts/verify-fingerprint.ts` compares fingerprints and reports drift.
- `docs/fingerprint/transloadit-baseline.json` is the baseline fingerprint.
- `docs/fingerprint/transloadit-baseline.package.json` is used to diff `package.json`.

Only `package.json` metadata drift is currently allowed; any other file difference fails the check.

## TODO

### Compatibility verification (byte-for-byte)

- [x] Baseline: run `npm pack` or `yarn pack` from current `transloadit`
- [x] Record tarball SHA256
- [x] Record file list + sizes + per-file SHA256 inside tarball
- [x] Record `package.json` fields that affect install (name, version, main, types, exports, files)
- [x] After refactor: run `yarn workspace transloadit pack`
- [x] Compute same fingerprint
- [x] Assert byte-for-byte identity

### Fingerprint script

- [x] Add `scripts/fingerprint-pack.ts`
- [x] Use `npm pack --json` to get tarball name
- [x] Hash the tarball SHA256
- [x] Hash each file via `tar -tf` + `tar -xOf`
- [x] Output JSON artifact for comparison
- [x] Support `node scripts/fingerprint-pack.ts .`
- [x] Support `node scripts/fingerprint-pack.ts packages/transloadit`

### Versioning and releases

- [x] Add Changesets at workspace root
- [x] Use `yarn changeset` for changes
- [x] Use `yarn changeset version` to bump versions
- [ ] Use `yarn changeset publish` to publish packages
- [x] Keep `transloadit` and `@transloadit/node` versions synchronized
- [x] Decide whether `@transloadit/types` tracks same version or diverges

### Implementation phases

#### Phase 1: monorepo scaffolding

- [x] Add root workspace config
- [x] Add Changesets config
- [x] Add base tsconfig
- [x] Move current package to `packages/node`
- [x] Ensure existing build/test scripts still pass

#### Phase 2: @transloadit/types (re-export alphalib)

- [x] Keep alphalib as synced source of truth
- [x] Re-export from `src/alphalib/types` via TS path mapping or barrel files
- [x] Build `.d.ts` only, no runtime JS

#### Phase 3: @transloadit/zod

- [x] Generate Zod schemas in `packages/zod` from alphalib types
- [x] Depend on `zod`

#### Phase 4: transloadit wrapper

- [x] Publish identical output to `@transloadit/node`
- [x] Copy dist + transform `package.json`
- [ ] Confirm publish via Changesets

#### Phase 5: compatibility validation

- [x] Record baseline fingerprint from current `transloadit`
- [x] Validate refactor output matches baseline (except package name if applicable)

### Cross-repo validation

- [x] Trial the updated robot schemas in alphalib within `~/code/content` and `~/code/api2`, then run `yarn check` in both repos

### Refactors

- [x] Unify pack/build orchestration into a single script used by CI + local pack
- [x] Align `@transloadit/types` export map with the generated layout (keep subpath imports stable)
- [x] Centralize Zod sync export list/extension to avoid drift
- [x] Document inline heavy-inference casts (helper wrappers trigger TS7056)
- [x] Keep legacy `transloadit` metadata synced from `@transloadit/node` with one source of truth

### Zod v4 parity hardening

- [x] Add runtime parity fixtures by copying proven Assembly Instructions from `~/code/content` (stepParsing fixtures)
- [x] Add a sync-v4 regression fixture to verify `.passthrough()` → `.catchall(z.unknown())` and `z.record(...)` key injection
- [x] Add runtime parity coverage for `assemblyStatus` (ok/error/busy) once stable samples are selected
- [x] Add a CI guard that `@transloadit/zod` exports list stays in sync with `packages/node/src/alphalib/types`

## Future extensions

- Add JSON Schema export for v4 (`@transloadit/jsonschema` or subpath) once v4 tooling is stable.
- Consider promoting alphalib into its own workspace package if/when all consuming repos are v4‑ready.
