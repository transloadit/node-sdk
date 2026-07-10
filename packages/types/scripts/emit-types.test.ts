import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { escapeStringLiteral, normalizeExportPath } from './emit-types.ts'

const cases = [
  {
    input: 'line1\nline2',
    expected: 'line1\\nline2',
  },
  {
    input: 'line1\rline2',
    expected: 'line1\\rline2',
  },
  {
    input: 'col1\tcol2',
    expected: 'col1\\tcol2',
  },
  {
    input: 'path\\name',
    expected: 'path\\\\name',
  },
  {
    input: "it's fine",
    expected: "it\\'s fine",
  },
]

for (const { input, expected } of cases) {
  assert.equal(escapeStringLiteral(input), expected)
}

console.log('emit-types escapeStringLiteral: ok')

const exportCases = [
  {
    input: 'robots\\image-resize.ts',
    expected: 'robots/image-resize',
  },
  {
    input: 'template.ts',
    expected: 'template',
  },
]

for (const { input, expected } of exportCases) {
  assert.equal(normalizeExportPath(input), expected)
}

console.log('emit-types normalizeExportPath: ok')

// Importing emit-types.ts above runs its top-level generator before this artifact assertion.
const aiChatTypes = readFileSync(
  join(import.meta.dirname, '..', 'src', 'generated', 'robots', 'ai-chat.ts'),
  'utf8',
)
assert.match(aiChatTypes, /export type RobotAiChatInstructions/)
assert.match(aiChatTypes, /export type CoreMessageInput/)
assert.match(aiChatTypes, /experimental_providerMetadata\?:/)
assert.match(aiChatTypes, /args: unknown/)
assert.match(aiChatTypes, /kind: `\$\{string\}\.\$\{string\}`/)
assert.doesNotMatch(aiChatTypes, /kind: \{ \[key: number\]: string/)
assert.doesNotMatch(aiChatTypes, /messages: string \| Array<unknown>/)

console.log('emit-types recursive JSON schema: ok')
