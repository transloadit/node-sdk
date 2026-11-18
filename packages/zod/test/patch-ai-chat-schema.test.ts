import assert from 'node:assert/strict'

import { exportV4File, forwardFile, reverseFile } from '../scripts/zodSource.ts'

const path = 'types/robots/ai-chat.ts'
const source = `import { z } from 'zod'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

const jsonValueSchema: z.ZodType<JsonValue> =
  z.union([z.string()])

const toolResultSchema = z.object({
  output: z.unknown(),
})

function withLegacyProviderMetadata<Schema extends z.AnyZodObject>(schema: Schema) {
  return schema
}
`

const v4 = exportV4File(path, forwardFile(path, source))
assert.equal(
  v4,
  source
    .replace("from 'zod'", "from 'zod/v4'")
    .replace('Schema extends z.AnyZodObject', 'Schema extends z.ZodObject'),
  'should preserve the current AI SDK message schema and only replace the Zod 3 object constraint',
)
assert.equal(reverseFile(path, forwardFile(path, source)), source)

assert.throws(
  () => forwardFile(path, source.replace('z.AnyZodObject', 'z.ZodTypeAny')),
  /ai-chat\.ts: any-zod-object/,
)

console.log('ai-chat schema patching: ok')
