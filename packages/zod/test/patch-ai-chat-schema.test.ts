import assert from 'node:assert/strict'

import { patchAiChatSchema } from '../scripts/sync-v4.ts'

const source = `
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

const jsonValueSchema: z.ZodType<JsonValue> =
  z.union([z.string()])

const toolResultSchema = z.object({
  output: z.unknown(),
})
`

const patched = patchAiChatSchema(source)
assert.equal(
  patched,
  source,
  'should preserve the current AI SDK message schema without v4-only patches',
)

assert.throws(() => patchAiChatSchema('const jsonValueSchema: z.ZodType = z.string()'), /ai-chat/i)

console.log('ai-chat schema patching: ok')
