# @transloadit/zod

**Stability:** Exported names, helper functions and supported Zod versions follow strict SemVer.
API contract types and schemas follow API2 and can change in minor releases, including
type-breaking updates. See the
[versioning policy](https://github.com/transloadit/node-sdk/blob/main/CONTRIBUTING.md#versioning-policy).

- Commit your lockfile and type-check dependency update PRs.
- Use `~` ranges for stable contract types within a minor; patch releases do not change contract
  types. Use `^` to follow the API as it evolves.
- Use input types for instructions you write, such as `AssemblyInstructionsInput`; narrow fields
  from responses and parsed output before use (`null`, `undefined`, unknown strings).
- Do not depend on Zod internals such as wrapper classes, `.shape` or parse-time defaults.

Exports Zod schemas derived from Transloadit types.

For the SDK client, use `@transloadit/node` or the unscoped `transloadit` package.

## Migrating schema consumers

Assembly fields now admit historical nulls, reserved uploads, numeric metadata, and structured
diagnostics. Robot metadata also removes legacy billing fields and renames the
`image-manipulation` category to `image-processing`. Follow the
[SDK migration guidance](https://github.com/transloadit/node-sdk/tree/main/packages/node#migrating-assembly-and-robot-schema-consumers)
when updating consumers of either Zod version.

`/ai/chat` model schemas now expose finite enum choices. Invalid model literals passed to
`vendorModelSchema` produce native enum issues (`invalid_enum_value` in Zod 3, `invalid_value` in
Zod 4) instead of custom refinement issues. Interpolated models require a whole-value expression
such as `${fields.model}`, not `openai/${fields.model}`; put the complete provider/model value in
the variable. The exported `MODEL_CAPABILITIES` registry is read-only and frozen at the top level.

In the Zod 4 helpers, interpolated defaults now use `ZodPrefault` so defaults are validated and
transformed during parsing, as they are in Zod 3. Update `ZodDefault` type assignments and
`instanceof` checks accordingly. Use `.unwrap()` instead of `.removeDefault()` to access the inner
schema of a `ZodPrefault`. The exported `interpolateRecursive()` helper now accepts classic schemas
created with `zod/v4`; callers using `zod/v4/core` or Mini schemas must use classic schemas instead.

Interpolatable schemas contain custom validation that Zod cannot directly express in JSON Schema.
If your authoring tools use `unrepresentable: 'any'` to generate an approximation, also request the
input projection so prefault values appear as defaults:

```ts
import { interpolateRecursive } from '@transloadit/zod/v4/robots/_instructions-primitives'
import { z } from 'zod/v4'

const schema = interpolateRecursive(z.number().default(3))
const inputSchema = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })
// inputSchema.default is 3; schema.parse(undefined) is also 3.
```

Zod’s output projection omits prefault defaults. The `unrepresentable: 'any'` fallback replaces
unsupported constructs with unconstrained JSON values; use the original Zod schema for runtime
validation. Setting `io: 'input'` alone can still raise conversion errors for custom schemas.
