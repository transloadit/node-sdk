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

The public contract comes from alphalib. The schemas that `@transloadit/zod` publishes
(`types/**` and the helpers those files import) are kept as **Zod 4 source** in
`packages/zod/alphalib`. Every other schema tree is generated from it:

- `packages/node/src/alphalib` keeps a tracked **Zod 3** copy of that subset, because
  `@transloadit/node` and `transloadit` compile and publish it (including `src/` and source maps)
  and the alphalib sync tool writes into that directory. The SDK's other alphalib files are not
  generated.
- `packages/zod/src/v3` and `packages/zod/src/v4` are generated and git-ignored.
- `@transloadit/types` is generated from the Zod 3 copy.

We do not hand-edit schema types in other packages. `yarn lint:zod-source` (part of `check` and
`verify`) fails when the Zod 3 copy and the Zod 4 source disagree. To resolve it:

- after an alphalib sync brought Zod 3 changes into `packages/node/src/alphalib`, convert them:
  `yarn workspace @transloadit/zod codemod:v4`;
- after editing `packages/zod/alphalib`, regenerate the copy: `yarn workspace @transloadit/zod sync:sdk`.

## Packages

### @transloadit/node

- Canonical runtime implementation.
- Used as the source for the legacy `transloadit` wrapper.

### transloadit

- Publishes the legacy package name.
- Built from the same runtime artifacts as `@transloadit/node`.
- PR CI verifies that tracked files under `packages/transloadit` stay in sync with `@transloadit/node`.
- Tarball fingerprinting remains available as a manual release/debug tool.

### @transloadit/types

- Pure type package; no Zod runtime dependency.
- Types are generated from the Zod 3 schema copy in `packages/node/src/alphalib` into `.d.ts` only.
- Consumers get fast type‑checking without pulling in Node or Zod.

### @transloadit/zod

- Publishes Zod schemas for runtime validation.
- Versioned exports:
  - `@transloadit/zod/v3/*`
  - `@transloadit/zod/v4/*`

## Zod sync & generation pipeline

All transforms live in `packages/zod/scripts/zodSource.ts`.

### Zod 4 source (`packages/zod/alphalib`)

- Written for `zod/v4`. Every former `.optional()` is `optionalWithV3Semantics(…)`
  (`lib/sdkZodOptional.ts`), which keeps Zod 3's rule that `undefined` skips the inner schema, so
  defaults inside an optional are not applied. Do not replace it with `.optional()`: around
  defaults, prefaults and optional unions that changes parse output.
- One-argument `z.record(value)` is written `z.record(z.string(), value)`; `.passthrough()` is
  `.catchall(z.unknown())`.
- Code that cannot be derived mechanically sits in paired regions: `// @zod-v4-only-begin <id>` …
  `end`, immediately followed by `// @zod-v3-only-begin <id>` … `end` holding the Zod 3 lines
  commented out. Today these cover the interpolation helpers in `robots/_instructions-primitives.ts`,
  `zodCaseInsensitiveEnum` and the stable JSON default in `lib/zodInputSemantics.ts`, the File
  check and the `zod/v3` import in `aiMessages.ts`, the YouTube category annotation and the ai-chat
  object constraint. The generators fail when a listed region is missing.
- Two layout hints keep the Zod 3 export byte-identical to the original Zod 3 text: whitespace that
  preceded `.optional()` stays inside the wrapper's parentheses, and `/* @zod-v3-explicit-key */`
  marks a `z.record(z.string(), …)` that Zod 3 wrote with its key. The Zod 4 export removes both.

### Generators

- `scripts/sync-v4.ts`: drops the Zod 3 regions and hints and lays the tree out as published
  (`types/**` at the root, shared helpers keep their paths) into `src/v4`.
- `scripts/sync-v3.ts`: generates Zod 3 (unwraps the adapter, restores one-argument records,
  `.passthrough()` and the Zod 3 regions), lays it out the same way and rewrites `zod` imports to
  `zod/v3` in `src/v3`.
- `scripts/sync-sdk-alphalib.ts`: writes (or with `--check` compares) the same Zod 3 files into
  `packages/node/src/alphalib`.
- `scripts/zod4-codemod.ts --in <alphalib> --out <dir>`: the forward direction, Zod 3 alphalib to
  Zod 4 source. It takes directories so it can run on a larger alphalib tree, and it refuses
  constructs it cannot convert losslessly.

`test/zod-source.test.ts` checks that converting the generated Zod 3 tree reproduces the Zod 4
source byte for byte, so the two exports stay in bijection after contract syncs.

### Generated sources

- `packages/zod/src/v3` and `packages/zod/src/v4` are generated and git‑ignored.
- Build output is emitted to `packages/zod/dist`.

## Validation gates

1. **Type equality**

   - `packages/zod/test/type-equality-v3.ts`
   - `packages/zod/test/type-equality-v4.ts`
   - These assert `z.infer` output matches `@transloadit/types` (strict identity for v3, mutual assignability for v4).

2. **Runtime parity**
   - `packages/zod/test/runtime-parity.test.ts`
   - Uses fixtures from `packages/zod/test/fixtures/assembly-instructions.ts` and checks v3/v4 success parity.
   - Parses every optional site whose inner schema supplies a default, prefault or optional union
     omitted, as `undefined` and as `null` in both versions.

3. **Export proof** (manual, for changes to the pipeline or the Zod dependency)
   - `node scripts/prove-zod-exports.ts --base origin/main` materializes the base ref and the working
     tree into temporary directories, installs and builds both with their own scripts, and compares
     sha256 manifests of `packages/zod/src/{v3,v4}`, `packages/zod/dist`, `packages/types`
     (generated sources and `dist`), `packages/node/dist` and the `npm pack` contents of
     `packages/node` and `packages/transloadit`.
   - Its runtime probe compares a structural fingerprint of every exported schema, a parse corpus
     (a synthesized sample per schema, then each key omitted and each optional site as `undefined`
     and `null`, in both versions) and `z.toJSONSchema` output of every Zod 4 export.
   - Any difference fails unless `scripts/prove-zod-exports.allowlist.ts` explains it. Results go
     to `--out` (default: a temporary directory).
   - It also lists inputs that Zod 3 and Zod 4 parse differently and fails when that list changes.
     One such difference predates the Zod 4 source: `toolCallPartBaseSchema.input` (`z.unknown()`)
     may be omitted in Zod 3 but is required by Zod 4.

The `@transloadit/zod` `check` script runs `sync`, `tsc`, and runtime parity.

## Node & TypeScript execution

All internal scripts are TypeScript and rely on Node’s built-in type stripping. Tooling expects Node 22.18+ (or newer) so scripts can run directly via `node script.ts` without flags.

## Publishing strategy

- `@transloadit/node` is canonical.
- `transloadit` is generated from the same artifacts and fingerprinted.
- When `@transloadit/node` changes, include `transloadit` in the same Changeset to keep parity.
- Packages are versioned independently via Changesets (no fixed version group).

### Wrapper sync verification

The generated `transloadit` wrapper is kept fresh in PR CI:

- `scripts/prepare-transloadit.ts` regenerates the tracked wrapper files.
- `scripts/check-transloadit-sync.ts` fails if tracked files under `packages/transloadit` drift.

### Optional parity verification

The `transloadit` tarball is compared against a recorded baseline:

- `scripts/fingerprint-pack.ts` creates a tarball fingerprint.
- `scripts/verify-fingerprint.ts` compares fingerprints and reports drift.
- `docs/fingerprint/transloadit-baseline.json` is the baseline fingerprint.
- `docs/fingerprint/transloadit-baseline.package.json` is used to diff `package.json`.

This is now a manual/release-time tool for investigating publish drift or intentionally updating the recorded baseline.

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
- [x] Use independent versioning across packages

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

## Assembly response migration

The response-reader correction is a breaking type release for `@transloadit/node`, `transloadit`,
`@transloadit/types` and `@transloadit/zod`; the pre-1.0 MCP server and notification relay follow in minor releases. The relay publicly
exports its `AssemblyResponse` alias, so its consumers see the same type widening.
The API already emits these values, and response validation now preserves them without coercion:

- `meta.state` and `meta.xp_subject` can be finite numbers as well as strings, null or omitted.
  Narrow with `typeof value === 'number'` before using string methods.
- `date_file_modified`, `date_recorded`, `date_file_created`, `create_date` and `modify_date` can
  contain a string, a finite number, an array of those values, null or no value. Use `Array.isArray`
  before treating a repeated metadata tag as a scalar; numeric values are preserved rather than
  converted into an assumed timestamp format.
- A completed uploaded file can have `ext: null`. Check for null before calling extension string
  methods; null does not mean an empty extension.
- Public Assembly status and list response errors are nonempty strings, including future server
  codes. Exhaustive switches need a default branch. `hasError(status, code)` accepts an arbitrary
  string, and terminal-error helpers recognize future errors. `assemblyStatusErrCodeSchema`,
  `AssemblyStatusErrCode` and `isAssemblyErrorStatus` still describe only the closed known-code
  inventory; use them when an application specifically needs to narrow to a known code.

Empty errors, nonfinite metadata numbers, booleans and nested date arrays remain invalid. The HTTP
status and paginated-list regression fixtures protect the same contract as the generated Zod v3/v4
schemas and public TypeScript declarations. This change does not publish a package automatically.
