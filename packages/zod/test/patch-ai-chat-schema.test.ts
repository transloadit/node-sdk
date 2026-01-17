import assert from 'node:assert/strict'
import { patchAiChatSchema } from '../scripts/sync-v4.ts'

const source = `
const jsonValueSchema: z.ZodType =
  z.union([z.string()])

const responseSchema = z.object({
  result: z.unknown(),
})
`

const patched = patchAiChatSchema(source)
assert.ok(
  patched.includes('const jsonValueSchema: z.ZodType<any> ='),
  'should widen jsonValueSchema to ZodType<any>',
)
assert.ok(patched.includes('result: z.unknown().optional(),'), 'should make result optional')

const alreadyPatched = `
const jsonValueSchema: z.ZodType<any> =
  z.union([z.string()])

const responseSchema = z.object({
  result: z.unknown().optional(),
})
`

assert.equal(
  patchAiChatSchema(alreadyPatched),
  alreadyPatched,
  'should be a no-op when already patched',
)

assert.throws(() => patchAiChatSchema('const jsonValueSchema: z.ZodType = z.string()'), /ai-chat/i)

console.log('ai-chat schema patching: ok')
