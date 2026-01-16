import assert from 'node:assert/strict'

import { assemblyInstructionsSchema as v3AssemblyInstructions } from '../src/v3/template.ts'
import { assemblyInstructionsSchema as v4AssemblyInstructions } from '../src/v4/template.ts'
import { assemblyInstructionFixtures } from './fixtures/assembly-instructions.ts'

const schemas = [
  {
    name: 'assemblyInstructions',
    v3: v3AssemblyInstructions,
    v4: v4AssemblyInstructions,
    fixtures: assemblyInstructionFixtures,
  },
]

for (const schema of schemas) {
  for (const fixture of schema.fixtures) {
    const v3Result = schema.v3.safeParse(fixture.value)
    const v4Result = schema.v4.safeParse(fixture.value)

    assert.equal(
      v3Result.success,
      v4Result.success,
      `${schema.name}:${fixture.name} v3/v4 mismatch`,
    )
    assert.equal(
      v3Result.success,
      fixture.valid,
      `${schema.name}:${fixture.name} expected valid=${fixture.valid}`,
    )
  }
}

console.log('zod runtime parity: ok')
