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

1) **Type equality**
   - `packages/zod/test/type-equality-v3.ts`
   - `packages/zod/test/type-equality-v4.ts`
   - These assert `z.infer` output matches `@transloadit/types` exactly (non‑distributive mutual assignability).

2) **Runtime parity**
   - `packages/zod/test/runtime-parity.test.ts`
   - Uses fixtures from `packages/zod/test/fixtures/assembly-instructions.ts` and checks v3/v4 success parity.

The `@transloadit/zod` `check` script runs `sync`, `tsc`, and runtime parity.

## Node & TypeScript execution

All internal scripts are TypeScript and run via Node 24’s erasable syntax support (no `--experimental-strip-types` in the zod package). Other packages may still use the flag where needed.

## Publishing strategy

- `@transloadit/node` is canonical.
- `transloadit` is generated from the same artifacts and fingerprinted.
- `@transloadit/types` and `@transloadit/zod` are versioned in lock‑step (changesets).

## Future extensions

- Add JSON Schema export for v4 (`@transloadit/jsonschema` or subpath) once v4 tooling is stable.
- Consider promoting alphalib into its own workspace package if/when all consuming repos are v4‑ready.
