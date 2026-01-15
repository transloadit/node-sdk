# Proposal: multi-package repo with @transloadit/types, legacy transloadit, and @transloadit/node

## Summary

Split the current node-sdk repo into a Yarn 4 workspace monorepo that publishes:

- `@transloadit/node` (canonical Node runtime, current source lives here)
- `transloadit` (legacy wrapper, byte-for-byte compatible with current npm package)
- `@transloadit/types` (shared types for assemblies, robots, API responses)
- `@transloadit/zod` (Zod schemas with versioned subpaths like `@transloadit/zod/v3`)

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
If we eventually publish `@transloadit/browser`, `@transloadit/deno`, or a shared `@transloadit/core`, they can all depend on `@transloadit/types` for the contract while keeping platform-specific runtime. Zod schemas live in `@transloadit/zod` with versioned subpaths (`/v3`, later `/v4`) so we can add a new major without breaking existing imports.

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
    zod/
      package.json (name: "@transloadit/zod")
      src/v3/ (zod v3 schema export surface)
      src/v4/ (future)
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
- `packages/zod` exports Zod schemas and depends on `zod` explicitly, with `exports` for `./v3` (and later `./v4`).

## Alphalib strategy (synced source of truth)

`src/alphalib` is already synced across internal Transloadit repos. We should keep it as the single
source of truth for types and schemas, and avoid copying files into packages. Two viable approaches:

1) **Keep alphalib at repo root and re-export it**  
   - `packages/types` uses TS path mapping or barrel re-exports that point to `src/alphalib/types`.  
   - `packages/zod` imports from `src/alphalib/types` or from generated schema
     artifacts stored alongside alphalib.  
   - This keeps the sync workflow intact and avoids duplication.

2) **Promote alphalib to a workspace package**  
   - Move `src/alphalib` to `packages/alphalib` and keep the sync tool aligned.  
   - `@transloadit/types` depends on `@transloadit/alphalib` internally.  
   - This is cleaner structurally but changes the sync story.

Given the current sync mechanism, option 1 is safer and lower risk.

## Single source of truth for types vs Zod schemas

If we want Zod to be the canonical source, we should generate the types at build time and publish
only plain `.d.ts` files in `@transloadit/types` that do **not** reference Zod.

### Recommended pipeline (guaranteed compatibility)

1) **Zod schemas live in `@transloadit/zod/v3`.**  
2) **Generate structural types** into `@transloadit/types` (no `z.infer`, no `zod` imports).  
3) **Enforce type equality in CI** between generated types and `z.infer` from the schemas.

This gives a compile-time guarantee that the generated types are 100% compatible with Zod inference.

### Build script sketch

```
packages/
  zod/
    src/v3/*.ts           # Zod schemas
    test/type-equality.ts # Assert z.infer === generated types
  types/
    scripts/emit-types.ts # Generates .ts from zod schemas
    src/index.ts          # Re-exports generated types
```

`emit-types.ts` can use the TS compiler API or ts-morph to:
- import `@transloadit/zod/v3` schemas,
- create `type Foo = z.infer<typeof fooSchema>` aliases,
- emit a temporary `.ts`,
- run `tsc --emitDeclarationOnly` to produce `.d.ts`,
- then strip the intermediate `.ts` from the published package.

`type-equality.ts` then asserts:

```ts
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;

type _Check = Assert<Equal<Generated.Foo, z.infer<typeof fooSchema>>>;
```

If anything drifts, the build fails. This is the compatibility guarantee.

### Why not export `z.infer` directly?

That would force all `@transloadit/types` consumers to install `zod` just to typecheck. Generating
`.d.ts` avoids runtime and typechecking dependencies downstream.

### Future: JSON Schema from Zod v4

When we move to Zod v4 (outside this scope), we can add `@transloadit/zod/v4` and use the native
JSON Schema exporter to generate a separate `@transloadit/jsonschema` package (or subpath) without
changing the `@transloadit/types` contract.

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

### @transloadit/types / @transloadit/zod

- `@transloadit/types`: types only (`.d.ts`), no runtime dependencies.
- `@transloadit/zod`: Zod schemas derived from alphalib types (depends on `zod`).
- Export stable API surfaces:

```
@transloadit/types
  /assemblies
  /templates
  /robots
  /webhooks
@transloadit/zod/v3
  /assemblies
  /templates
  /robots
  /webhooks
```

Zod schemas cannot be shipped without a runtime dependency; separating them avoids forcing Zod on all consumers. A single `@transloadit/zod` package with `./v3` and `./v4` subpath exports keeps upgrade paths explicit.

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

### Phase 3: Add @transloadit/zod
- Generate Zod schemas in `packages/zod` from alphalib types (requires `zod`).

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

- Should we make `@transloadit/zod` a dedicated package or make Zod a peer dep of `@transloadit/types`? I recommend a dedicated package to keep types-only consumers clean.
- Do we keep versions in lock-step across all packages or allow independent versioning?
- Should the root package publish anything, or remain private-only?

## Recommendation

Proceed with a workspace refactor using a fingerprint gate to keep `transloadit` byte-for-byte compatible, and introduce `@transloadit/types` as the contract layer for all SDKs. This unlocks future multi-platform SDKs while preserving existing consumers.
