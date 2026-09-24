# @transloadit/zod

**Stability:** This package is still relatively new and may evolve quickly.

Exports Zod schemas derived from Transloadit types.

For the stable SDK, use the unscoped `transloadit` package.

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
