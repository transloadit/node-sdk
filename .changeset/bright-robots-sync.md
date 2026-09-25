---
'@transloadit/node': major
'transloadit': major
'@transloadit/mcp-server': minor
'@transloadit/types': major
'@transloadit/zod': major
---

Accept current and historical API responses without discarding reserved uploads, numeric metadata,
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
