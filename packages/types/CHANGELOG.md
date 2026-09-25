# @transloadit/types

## 5.0.0

### Major Changes

- ba9299f: Accept current and historical API responses without discarding reserved uploads, numeric metadata,
  or structured diagnostics. Update Robot schemas and input linting, including `/http/request`,
  storage asset metadata, and the complete runtime error-code inventory. Correct generated
  input/output types and preserve parameter help, boolean transformations, and omitted options
  across Zod 3 and Zod 4.

  Breaking schema changes: Assembly URLs and identity fields can be null, upload entries can be
  reservations with missing metadata, and metadata and stored error reasons accept additional value
  types. Narrow these values before using them. Robot metadata removes legacy billing fields and
  changes `example_code` to `unknown`. Update `image-manipulation` category filters to
  `image-processing` in the SDK and MCP Robot-list tool. See the SDK README’s “Migrating Assembly and
  Robot schema consumers” section for details.

  `ApiError.reason` keeps its `string | undefined` contract. The new `rawReason` property preserves
  the original diagnostic value, including structured reasons.

  `/ai/chat` model interpolation now requires a whole-value expression such as `${fields.model}`;
  partial expressions such as `openai/${fields.model}` are rejected, matching the API. Supply the
  complete provider/model value in the referenced variable instead. Model validation exposes a
  finite enum, and the exported model-capability registry is read-only and frozen at the top level.

  Zod 4 interpolation defaults now return `ZodPrefault`: update `ZodDefault` type/instance checks,
  use `.unwrap()` instead of `.removeDefault()`, and add `{ io: 'input' }` to existing JSON Schema
  conversion options to retain input defaults. `interpolateRecursive()` now requires
  classic `zod/v4` schemas rather than core or Mini schemas. See the Zod package README for migration
  examples and JSON Schema conversion limits.

## 4.5.0

### Minor Changes

- be56c7f: Request server-generated image placeholders with `storeImage(..., { placeholder: 'blur' })`
  or `storage store --placeholder blur`, without adding a native image decoder to the SDK.
  Extraction is optional and best-effort; successful extraction adds metadata usage equal to 20%
  of the file's bytes. Omission performs no extraction.

  Preserve `thumbhash` and `has_alpha` in Storage receipts, native asset reads, Assembly recovery,
  batch results and catalog sync. Viewer remains alpha and accepts server alpha metadata as well
  as older `hasAlpha` catalogs. Private request-authorized delivery still omits inline preview pixels.
  Hashed upload replays never overwrite or re-upload an image to generate missing metadata.

  Release MCP alongside the SDK to keep its validated dependency versions aligned.

### Patch Changes

- b1fb7d3: Default image generation to OpenAI Images 2.5 Flare and expose Images 2.5 Sunburst as an explicit precision option. Existing explicit OpenAI and Google model selections are preserved. Add Claude Opus 5.5 image/PDF capabilities to the shared Robot schemas while retaining Opus 5 and Fable 5.1.

## 4.4.1

### Patch Changes

- a2c5dd7: Include the Transloadit Storage import and store Robots in the offline catalog and generated
  instructions, and type the optional `asset_id` in Assembly results. Recognize Storage import/store
  error codes in response validation and terminal-status helpers, preserving API errors while polling.
  Sync the canonical `recursive` option for Storage folder imports into the offline linter and
  generated instructions without adding SDK-only schema fields.

## 4.4.0

### Minor Changes

- 5fe9706: Support GPT-6 Astra and Claude Fable 5.1, and use Astra for automatic chat and assembly-instruction compilation. Assembly compilation retains medium reasoning effort. Existing model identifiers remain supported.

## 4.3.4

### Patch Changes

- c4cdc23: Update Robot schemas and Assembly status types with the latest supported parameters, formats,
  validation, and status fields.
- 507ec7f: Use GPT-5.6 Sol for OpenAI defaults, Claude Fable 5 for general Anthropic defaults, and Claude
  Sonnet 5 for image descriptions. Keep end-user Assembly Instructions compilation at medium
  reasoning for responsive generation.

## 4.3.3

### Patch Changes

- f2abe56: Sync robot and assembly status schemas with the latest Transloadit API definitions.

## 4.3.2

### Patch Changes

- 910b6d0: Refresh generated Transloadit Robot schemas and shared assembly types from alphalib, including `/document/extract`, FFmpeg v8 stack support, and the latest speech transcription provider defaults.

## 4.3.1

### Patch Changes

- 776932f: Release the latest alphalib robot schema sync.

  This updates generated Robot and assembly-status schemas, the public TypeScript type package, and
  the Zod schema package so SDK, CLI, MCP, and schema consumers all see the same validated Transloadit
  API surface.

## 4.3.0

## 4.2.0

## 4.1.9

## 4.1.8

### Patch Changes

- 10ac3f2: Add assembly URL parsing + stage helpers to the shared schema exports.

## 4.1.7

## 4.1.6

### Patch Changes

- 0f24238: Ensure packages build dist assets during publish.

## 4.1.5

### Patch Changes

- 0318b97: Add assembly status helpers and expand busy status codes for consistent terminal checks.

## 4.1.4

### Patch Changes

- Sync alphalib schema updates (ai-chat robot, new file-filter operators, updated assembly status codes).

## 4.1.3

### Patch Changes

- Publish initial patch releases for the split packages and legacy wrapper.

## 4.1.3

### Patch Changes

- f989dc1: chore: align workspace packages for upcoming monorepo releases
