# Reduce @transloadit/node Type Payload (Without Loosening Types)

## Context

`@transloadit/node` currently publishes a large TypeScript declaration payload.

From unpacking `@transloadit/node@4.5.1`:

- npm tarball download: about 1.2 MiB
- npm unpacked size: about 24.8 MiB
- dominant contributor: `dist/alphalib/types/**/*.d.ts` (about 23 MiB)
  - `dist/alphalib/types/robots/_index.d.ts`: about 4.5 MiB
  - `dist/alphalib/types/template.d.ts`: about 7.4 MiB
  - `dist/alphalib/types/assemblyStatus.d.ts`: about 4.1 MiB

The bulk is not "our strict instruction types" themselves, but TypeScript emitting the full
inferred Zod schema generic types (e.g. `z.ZodObject<...>`, `z.ZodDiscriminatedUnion<...>`) into
`.d.ts`, which serializes terribly at scale.

## Goals

- Cut published `.d.ts` size substantially (order-of-magnitude where possible).
- Keep strict, helpful instruction types (no loosening).
- Preserve runtime behavior (schemas still work at runtime).
- Keep good debugging DX (shipping sources and sourcemaps is fine).

## Non-Goals

- Do not weaken instruction types to `Record<string, unknown>`.
- Do not remove runtime schemas (some internal and external callers rely on them).

## Root Cause

When a schema constant is exported without an explicit annotation, TypeScript emits its full
inferred type, which for Zod schemas expands into huge nested generics. Central schemas like
`robotsSchema` and `stepSchema` become multi-megabyte `.d.ts` files.

This is visible in current output, e.g.:

- `dist/alphalib/types/robots/_index.d.ts` contains `export declare const robotsSchema:
  z.ZodDiscriminatedUnion<"robot", [z.ZodObject<...` and pages of nested generics.
- `dist/alphalib/types/template.d.ts` similarly serializes `stepSchema` as a Zod intersection +
  discriminated union, expanding the entire robots union again.

## Proposed Fix (Recommended)

Make the *type declarations* depend on explicit TS types, not on Zod's inferred schema types.

### A) Generate explicit TS types and annotate schema exports

For each schema module:

1. Generate explicit TS types (interfaces/unions) for the public surface:
   - Example: `export interface RobotImageResizeInstructions { ... }`
   - Keep DRY via shared primitives (existing `_instructions-primitives.ts` is a good place for
     common pieces).

2. Annotate exported schema constants to avoid type inference bloat:
   - Example:
     - `export const robotImageResizeInstructionsSchema: z.ZodType<RobotImageResizeInstructions> =
       ...`
   - This keeps runtime validation identical but prevents `.d.ts` from expanding the Zod AST.

3. Add non-exported compile-time assertions to prevent drift:
   - Example:
     - `type _Assert = AssertEqual<z.infer<typeof robotImageResizeInstructionsSchema>, RobotImageResizeInstructions>`
   - Keep assertions non-exported so they don't bloat `.d.ts`.

Expected result: `.d.ts` shrinks dramatically because schema values become one-liners and public
types are plain TS shapes.

### B) Reuse the existing "Zod-free type renderer" machinery

This monorepo already contains a Zod-avoidant generator:

- `packages/types/scripts/emit-types.ts`

It renders schemas into TS types without emitting Zod generic types, and its output is much
smaller than `@transloadit/node`'s current `.d.ts` output.

Options:

- Use similar generation for `packages/node`'s `alphalib/types` declaration surface.
- Or generate a parallel type-only tree and point `package.json` `exports` `types` conditions at
  those slim declarations (while runtime still points at the real JS modules).

This avoids hand-editing hundreds of files and keeps the reduction systematic.

## Measurement and Validation

1. Baseline:
   - `npm view @transloadit/node@latest dist.unpackedSize dist.fileCount`
   - `npm pack @transloadit/node@latest` then `du -ah package | sort -hr | head`

2. After changes:
   - Repeat the same checks and compare:
     - total unpacked size
     - top 20 largest files in the packed artifact
     - `dist/alphalib/types` size specifically

3. Type safety:
   - Ensure `corepack yarn check` passes.
   - Add a small compile-time-only test that imports representative robot instruction types and
     ensures they remain strict and usable.

## Implementation Sketch (Phased)

Phase 1 (cheap wins, low risk):
- Set `declarationMap: false` in `packages/node/tsconfig.build.json` to drop `*.d.ts.map`.
- Measure impact (won't solve the main 23 MiB, but reduces clutter).

Phase 2 (systematic shrink, keeps strict types):
- Pick one high-impact file pair (`robots/_index.ts`, `template.ts`) and prove the approach:
  - Keep runtime Zod schemas
  - Make the exported schema const types non-inferred (annotated)
  - Ensure strict TS types remain exportable and ergonomic
  - Measure `.d.ts` size change

Phase 3 (scale):
- Automate generation/annotation across all robot schema modules.
- Keep the runtime JS identical and minimize risk to API2, SDK, and MCP server code.

## Notes / Tradeoffs

- Keeping `src/` and sourcemaps is a good debugging tradeoff, and not the dominant size driver.
- The dominant wins come from avoiding Zod generic expansion in exported declaration types.

