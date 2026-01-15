# Proposal: multi-package repo with @transloadit/types, legacy transloadit, and @transloadit/node

## Summary

Split the current node-sdk repo into a Yarn 4 workspace monorepo that publishes:

- `@transloadit/node` (canonical Node runtime, current source lives here)
- `transloadit` (legacy wrapper, byte-for-byte compatible with current npm package)
- `@transloadit/types` (shared types for assemblies, robots, API responses)
- `@transloadit/zod3` (Zod v3 schemas, `zod` as a dependency)

This keeps backwards compatibility, adds a canonical types package for reuse across Convex, browser, and future SDKs, and sets the stage for a future repo rename to `typescript-sdk` with additional packages like `@transloadit/browser` and `@transloadit/deno`.

## Why a dedicated @transloadit/types

### 1) One source of truth for the public contract
The repo already has structured types under `src/alphalib/types` (templates, assemblies, robots, bills, etc). These are synced across internal repos and should remain the single source of truth. A types package should re-export from alphalib without copying the files, so there is one canonical contract.

A `@transloadit/types` package would provide:

- Strongly typed assembly instruction shapes (robot params, steps, template payloads)
- Shared response types (assembly status, templates, bills)
- Schema output for runtime validation without pulling in Node APIs

This reduces duplication and drift between SDKs, Convex integrations, and docs examples.

### 2) Better DX without runtime coupling
Consumers like browser SDKs (uppy) and Convex components often need types but not Node runtime code. A types-only package keeps bundles smaller and avoids Node-only dependencies (fs, streams, crypto).

### 3) Future-proof for multi-platform SDKs
If we eventually publish `@transloadit/browser`, `@transloadit/deno`, or a shared `@transloadit/core`, they can all depend on `@transloadit/types` for the contract while keeping platform-specific runtime. Zod schemas live in `@transloadit/zod3`, and we can later add `@transloadit/zod4` without breaking the v3 consumers.

## Goals

- Preserve `transloadit` package identity and output (byte-for-byte where possible).
- Make `@transloadit/node` the canonical source for the existing Node SDK runtime.
- Introduce `@transloadit/types` with stable, documented export surface.
- Publish Zod schemas without forcing a runtime dependency choice for types consumers.
- Enable future modularization without breaking existing users.
- Keep publish and versioning consistent (changesets, Yarn 4).

## Proposed workspace layout

```
node-sdk/
  packages/
    node/
      package.json (name: "@transloadit/node")
      src/ (current src moved here)
      dist/
    transloadit/
      package.json (name: "transloadit")
      src/ (thin wrapper or re-export)
      dist/
    types/
      package.json (name: "@transloadit/types")
      src/
        index.ts
        robots/
        assemblies/
        templates/
        schemas/
      dist/
    zod3/
      package.json (name: "@transloadit/zod3")
      src/ (zod schema export surface)
      dist/
  package.json (workspace root)
  tsconfig.base.json
  biome.json
  .changeset/
```

### Notes
- `packages/node` is the canonical source for the existing Node SDK runtime.
- `packages/transloadit` is a wrapper package that publishes the same artifacts under the legacy name.
- `packages/types` re-exports from `src/alphalib/types` so alphalib remains the single source of truth.
- `packages/zod3` exports Zod schemas and depends on `zod` explicitly.

## Alphalib strategy (synced source of truth)

`src/alphalib` is already synced across internal Transloadit repos. We should keep it as the single
source of truth for types and schemas, and avoid copying files into packages. Two viable approaches:

1) **Keep alphalib at repo root and re-export it**  
   - `packages/types` uses TS path mapping or barrel re-exports that point to `src/alphalib/types`.  
   - `packages/schemas` and `packages/zod` import from `src/alphalib/types` or from generated schema
     artifacts stored alongside alphalib.  
   - This keeps the sync workflow intact and avoids duplication.

2) **Promote alphalib to a workspace package**  
   - Move `src/alphalib` to `packages/alphalib` and keep the sync tool aligned.  
   - `@transloadit/types` depends on `@transloadit/alphalib` internally.  
   - This is cleaner structurally but changes the sync story.

Given the current sync mechanism, option 1 is safer and lower risk.

## Single source of truth for types vs Zod schemas

If we want Zod to be the canonical source, we should generate the types at build time and publish
only plain `.d.ts` files in `@transloadit/types` that do **not** reference Zod. Two patterns:

1) **Build-time type expansion (recommended)**  
   - `@transloadit/zod3` owns the schemas.  
   - A build step in `@transloadit/types` imports the schemas and emits `.d.ts` with concrete
     structural types (no `z.infer<>` left in the output).  
   - `zod` is a devDependency of `@transloadit/types` only, so consumers do not need it.

2) **Type-only imports from Zod (not recommended)**  
   - `@transloadit/types` would export `z.infer<typeof schema>` types.  
   - This leaks a dependency on `zod` into downstream typechecking.  

Recommendation: keep Zod as the source of truth, but generate `.d.ts` for `@transloadit/types`
so consumers do not need `zod` at runtime or for typechecking.

## Publishing strategy

### transloadit and @transloadit/node

Two options that both preserve compatibility:

1) **Source duplication with shared build inputs**
   - Build `packages/node` as the canonical runtime.
   - Build `packages/transloadit` from the same source using a small wrapper that re-exports the runtime, or by pointing its build output to the same compiled artifacts.

2) **Single build output, dual packaging**
   - Build once in `packages/node/dist`.
   - For `transloadit`, publish a package that contains the same files as `@transloadit/node`, generated during `prepack` (copy/rsync dist + package.json transforms).

Option 2 is stricter for byte-for-byte output parity but requires packaging logic. Option 1 is easier but can drift if any build settings differ. I recommend option 2 and automated fingerprinting (see below).

### @transloadit/types / @transloadit/zod3

- `@transloadit/types`: types only (`.d.ts`), no runtime dependencies.
- `@transloadit/zod3`: Zod schemas derived from alphalib types (depends on `zod`).
- Export stable API surfaces:

```
@transloadit/types
  /assemblies
  /templates
  /robots
  /webhooks
@transloadit/zod3
  /assemblies
  /templates
  /robots
  /webhooks
```

Zod schemas cannot be shipped without a runtime dependency; separating them avoids forcing Zod on all consumers. A dedicated `@transloadit/zod3` package also leaves room for a future `@transloadit/zod4`.

## Compatibility verification plan (byte-for-byte)

We can treat compatibility as a deterministic refactor target using a pre/post fingerprint.

### Proposed fingerprint process

1) **Baseline (current repo)**
   - `npm pack` or `yarn pack` from current `transloadit` package.
   - Capture:
     - tarball SHA256
     - file list, sizes, file SHA256 inside tarball
     - `package.json` fields that affect install (name, version, main, types, exports, files)

2) **After refactor**
   - `yarn workspace transloadit pack`
   - Compute the same fingerprint.
   - Assert byte-for-byte identity.

### Suggested script

A small Node script can be added under `scripts/fingerprint-pack.js` (uses `npm pack` + `tar`):

- `npm pack --json` to get the tarball name
- `sha256` the tarball
- `tar -tf` + `tar -xOf` to hash each file
- output JSON artifact for comparison

Example usage:

```bash
node scripts/fingerprint-pack.js .
node scripts/fingerprint-pack.js packages/transloadit
```

This becomes a refactor gate: only proceed if fingerprints match.

## Versioning and releases

Use Changesets in the workspace root (similar to `~/code/monolib`):

- `yarn changeset` for changes
- `yarn changeset version` to bump versions
- `yarn changeset publish` to publish all packages

We can keep versions synchronized across `transloadit` and `@transloadit/node`. `@transloadit/types` can either track the same version (simpler) or diverge if needed later.

## Suggested implementation phases

### Phase 1: Prepare monorepo scaffolding
- Add root workspace config, changesets, base tsconfig.
- Move current package into `packages/node` with minimal changes.
- Ensure existing build/test scripts still pass.

### Phase 2: Add @transloadit/types (re-export alphalib)
- Keep alphalib as a synced directory (single source of truth).
- In `packages/types`, re-export from `src/alphalib/types` via TS path mapping or barrel files.
- Build `.d.ts` only, no runtime JS.

### Phase 3: Add @transloadit/zod3
- Generate Zod schemas in `packages/zod3` from alphalib types (requires `zod`).

### Phase 4: Add transloadit wrapper
- Package identical output to `@transloadit/node` (copy dist + package.json transform).
- Confirm both packages are publishable via Changesets.

### Phase 5: Byte-for-byte compatibility validation
- Record baseline fingerprint from current `transloadit`.
- Validate refactor output is identical (except for `package.json` name where applicable).

## Risks and mitigations

- **Risk: Build output drift**
  - Mitigation: fingerprint test gate; lock tsconfig, build tools, and emitted files.

- **Risk: Consumers depend on side-effects or file paths**
  - Mitigation: keep `transloadit` package output identical and preserve exports layout.

- **Risk: Types package diverges from runtime API**
  - Mitigation: generate or validate types against runtime tests; add type-level tests.

## Long-term direction

A rename from `node-sdk` to `typescript-sdk` makes sense if this becomes the home for:

- `@transloadit/node` (Node runtime)
- `@transloadit/browser` (browser runtime)
- `@transloadit/deno` (Deno runtime)
- `@transloadit/types` (shared contract)

All can share `@transloadit/types` for schema and type fidelity, with platform-specific transport in each runtime package.

## Open questions

- Should we make `@transloadit/zod3` a dedicated package or make Zod a peer dep of `@transloadit/types`? I recommend a dedicated package to keep types-only consumers clean.
- Do we keep versions in lock-step across all packages or allow independent versioning?
- Should the root package publish anything, or remain private-only?

## Recommendation

Proceed with a workspace refactor using a fingerprint gate to keep `transloadit` byte-for-byte compatible, and introduce `@transloadit/types` as the contract layer for all SDKs. This unlocks future multi-platform SDKs while preserving existing consumers.
