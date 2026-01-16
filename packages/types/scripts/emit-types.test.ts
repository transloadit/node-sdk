import assert from 'node:assert/strict'

import { escapeStringLiteral } from './emit-types.ts'

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
    input: 'it\'s fine',
    expected: 'it\\\'s fine',
  },
]

for (const { input, expected } of cases) {
  assert.equal(escapeStringLiteral(input), expected)
}

console.log('emit-types escapeStringLiteral: ok')
