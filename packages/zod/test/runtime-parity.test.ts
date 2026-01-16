import assert from 'node:assert/strict'

import { assemblyStatusSchema as v3AssemblyStatus } from '../src/v3/assemblyStatus.ts'
import {
  robotBase as v3RobotBase,
  robotFFmpeg as v3RobotFFmpeg,
} from '../src/v3/robots/_instructions-primitives.ts'
import { assemblyInstructionsSchema as v3AssemblyInstructions } from '../src/v3/template.ts'
import { assemblyStatusSchema as v4AssemblyStatus } from '../src/v4/assemblyStatus.ts'
import {
  robotBase as v4RobotBase,
  robotFFmpeg as v4RobotFFmpeg,
} from '../src/v4/robots/_instructions-primitives.ts'
import { assemblyInstructionsSchema as v4AssemblyInstructions } from '../src/v4/template.ts'
import { assemblyInstructionFixtures } from './fixtures/assembly-instructions.ts'
import { assemblyStatusFixtures } from './fixtures/assembly-status.ts'

const schemas = [
  {
    name: 'assemblyStatus',
    v3: v3AssemblyStatus,
    v4: v4AssemblyStatus,
    fixtures: assemblyStatusFixtures,
  },
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

const passthroughFixture = {
  ffmpeg: {
    unexpected_option: 'keep-me',
  },
}
const v3Passthrough = v3RobotFFmpeg.safeParse(passthroughFixture)
const v4Passthrough = v4RobotFFmpeg.safeParse(passthroughFixture)
assert.equal(v3Passthrough.success, true, 'robotFFmpeg v3 passthrough should parse')
assert.equal(v4Passthrough.success, true, 'robotFFmpeg v4 passthrough should parse')
if (v3Passthrough.success) {
  assert.equal(
    (v3Passthrough.data.ffmpeg as Record<string, unknown>).unexpected_option,
    'keep-me',
    'robotFFmpeg v3 should preserve passthrough keys',
  )
}
if (v4Passthrough.success) {
  assert.equal(
    (v4Passthrough.data.ffmpeg as Record<string, unknown>).unexpected_option,
    'keep-me',
    'robotFFmpeg v4 should preserve passthrough keys',
  )
}

const outputMetaValid = { output_meta: { has_transparency: true } }
const outputMetaInvalid = { output_meta: { has_transparency: 1 } }
const v3OutputMetaValid = v3RobotBase.safeParse(outputMetaValid)
const v4OutputMetaValid = v4RobotBase.safeParse(outputMetaValid)
const v3OutputMetaInvalid = v3RobotBase.safeParse(outputMetaInvalid)
const v4OutputMetaInvalid = v4RobotBase.safeParse(outputMetaInvalid)
assert.equal(v3OutputMetaValid.success, true, 'robotBase v3 output_meta valid should parse')
assert.equal(v4OutputMetaValid.success, true, 'robotBase v4 output_meta valid should parse')
assert.equal(v3OutputMetaInvalid.success, false, 'robotBase v3 output_meta invalid should fail')
assert.equal(v4OutputMetaInvalid.success, false, 'robotBase v4 output_meta invalid should fail')

console.log('zod runtime parity: ok')
