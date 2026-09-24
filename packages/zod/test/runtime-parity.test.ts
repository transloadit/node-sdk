import assert from 'node:assert/strict'
import { test } from 'node:test'

import { z as z3 } from 'zod/v3'
import { z as z4 } from 'zod/v4'

import { normalizeCoreMessage as v3NormalizeMessage } from '../src/v3/aiMessages.ts'
import { assemblyStatusSchema as v3AssemblyStatus } from '../src/v3/assemblyStatus.ts'
import { zodStableJsonDefault as v3StableDefault } from '../src/v3/lib/zodInputSemantics.ts'
import { MODEL_CAPABILITIES as v3ModelCapabilities } from '../src/v3/robots/_ai-models.ts'
import {
  interpolateRecursive as v3Interpolate,
  robotBase as v3RobotBase,
  robotFFmpeg as v3RobotFFmpeg,
} from '../src/v3/robots/_instructions-primitives.ts'
import {
  robotAiChatInstructionsSchema as v3Chat,
  interpolatableRobotAiChatInstructionsSchema as v3InterpolatableChat,
  vendorModelSchema as v3VendorModel,
} from '../src/v3/robots/ai-chat.ts'
import {
  interpolatableRobotImageUpscaleInstructionsSchema as v3InterpolatableUpscale,
  robotImageUpscaleInstructionsSchema as v3Upscale,
} from '../src/v3/robots/image-upscale.ts'
import { assemblyInstructionsSchema as v3AssemblyInstructions } from '../src/v3/template.ts'
import { normalizeCoreMessage as v4NormalizeMessage } from '../src/v4/aiMessages.ts'
import { assemblyStatusSchema as v4AssemblyStatus } from '../src/v4/assemblyStatus.ts'
import { zodStableJsonDefault as v4StableDefault } from '../src/v4/lib/zodInputSemantics.ts'
import { MODEL_CAPABILITIES as v4ModelCapabilities } from '../src/v4/robots/_ai-models.ts'
import {
  interpolateRecursive as v4Interpolate,
  robotBase as v4RobotBase,
  robotFFmpeg as v4RobotFFmpeg,
} from '../src/v4/robots/_instructions-primitives.ts'
import {
  robotAiChatInstructionsSchema as v4Chat,
  interpolatableRobotAiChatInstructionsSchema as v4InterpolatableChat,
  vendorModelSchema as v4VendorModel,
} from '../src/v4/robots/ai-chat.ts'
import {
  interpolatableRobotImageUpscaleInstructionsSchema as v4InterpolatableUpscale,
  robotImageUpscaleInstructionsSchema as v4Upscale,
} from '../src/v4/robots/image-upscale.ts'
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

for (const [name, v3, v4] of [
  ['direct', v3Upscale, v4Upscale],
  ['interpolatable', v3InterpolatableUpscale, v4InterpolatableUpscale],
] as const) {
  test(`${name} upscale preserves omitted defaults and explicit undefined`, () => {
    const input = { robot: '/image/upscale', use: ':original' }
    const omitted = v3.parse(input)
    assert.equal(Object.hasOwn(omitted, 'model'), false)
    assert.equal(Object.hasOwn(omitted, 'scale'), false)
    assert.equal(Object.hasOwn(omitted, 'face_enhance'), false)
    assert.deepEqual(v4.parse(input), omitted)

    const explicit = { ...input, model: undefined, scale: undefined, face_enhance: undefined }
    const expected = { ...omitted, model: undefined, scale: undefined, face_enhance: undefined }
    assert.deepEqual(v3.parse(explicit), expected)
    assert.deepEqual(v4.parse(explicit), expected)
    const supplied = { ...input, model: 'nightmareai/real-esrgan', scale: 4, face_enhance: true }
    assert.deepEqual(v4.parse(supplied), v3.parse(supplied))
    assert.equal(v3.safeParse({ ...input, scale: null }).success, false)
    assert.equal(v4.safeParse({ ...input, scale: null }).success, false)
  })
}

test('v4 authoring JSON Schema retains validated interpolation defaults', () => {
  const schema = v4Interpolate(z4.number().default(3))
  const jsonSchema = z4.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })
  assert.equal(jsonSchema.default, 3)
  assert.equal(schema.parse(undefined), jsonSchema.default)
  assert.equal(schema.safeParse('invalid-number').success, false)
})

test('interpolation preserves outer optional around defaults and nullable schemas', () => {
  const v3 = v3Interpolate(
    z3.object({
      optional: z3.string().default('inner').optional(),
      nullable: z3.string().default('inner').nullable().optional(),
      prefault: v3StableDefault(
        z3.string().transform((value) => `parsed:${value}`),
        'inner',
      ).optional(),
      topDefault: z3.string().optional().default('outer'),
      nullDefault: z3.string().nullable().default(null),
    }),
  )
  const v4 = v4Interpolate(
    z4.object({
      optional: z4.string().default('inner').optional(),
      nullable: z4.string().default('inner').nullable().optional(),
      prefault: v4StableDefault(
        z4.string().transform((value) => `parsed:${value}`),
        'inner',
      ).optional(),
      topDefault: z4.string().optional().default('outer'),
      nullDefault: z4.string().nullable().default(null),
    }),
  )
  assert.deepEqual(v3.parse({}), { topDefault: 'outer', nullDefault: null })
  for (const input of [
    {},
    { optional: undefined, nullable: undefined, prefault: undefined },
    { topDefault: undefined, nullDefault: undefined },
    { optional: 'value', nullable: null, prefault: 'value' },
    { nullable: 'value', topDefault: 'supplied', nullDefault: 'supplied' },
  ]) {
    assert.deepEqual(v4.parse(input), v3.parse(input))
  }
  assert.equal(v3.safeParse({ optional: null }).success, false)
  assert.equal(v4.safeParse({ optional: null }).success, false)
})

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
    if (v3Result.success && v4Result.success) {
      assert.deepEqual(
        v4Result.data,
        v3Result.data,
        `${schema.name}:${fixture.name} parsed output must match, including defaults and transforms`,
      )
    }
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

const interpolationSchemas = [
  {
    version: 'v3',
    boolean: v3Interpolate(z3.boolean().describe('Boolean help')),
    falseDefault: v3Interpolate(z3.boolean().default(false)),
    trueDefault: v3Interpolate(z3.boolean().default(true)),
    transformedDefault: v3Interpolate(
      v3StableDefault(
        z3.string().transform((value) => `parsed:${value}`),
        'seed',
      ).describe('Default help'),
    ),
    arrayDefault: v3Interpolate(v3StableDefault(z3.array(z3.boolean()), [false])),
    optional: v3Interpolate(z3.boolean().optional().describe('Optional help')),
  },
  {
    version: 'v4',
    boolean: v4Interpolate(z4.boolean().describe('Boolean help')),
    falseDefault: v4Interpolate(z4.boolean().default(false)),
    trueDefault: v4Interpolate(z4.boolean().default(true)),
    transformedDefault: v4Interpolate(
      v4StableDefault(
        z4.string().transform((value) => `parsed:${value}`),
        'seed',
      ).describe('Default help'),
    ),
    arrayDefault: v4Interpolate(v4StableDefault(z4.array(z4.boolean()), [false])),
    optional: v4Interpolate(z4.boolean().optional().describe('Optional help')),
  },
]

for (const schema of interpolationSchemas) {
  for (const [input, expected] of [
    [true, true],
    [false, false],
    ['true', true],
    ['false', false],
  ]) {
    assert.equal(schema.boolean.parse(input), expected, `${schema.version}: boolean ${input}`)
    assert.equal(schema.falseDefault.parse(input), expected)
    assert.equal(schema.trueDefault.parse(input), expected)
  }
  assert.equal(schema.boolean.description, 'Boolean help')
  assert.equal(schema.boolean.safeParse('invalid').success, false)
  assert.equal(schema.falseDefault.parse(undefined), false)
  assert.equal(schema.trueDefault.parse(undefined), true)
  assert.equal(schema.transformedDefault.parse(undefined), 'parsed:seed')
  assert.equal(schema.transformedDefault.parse('input'), 'parsed:input')
  assert.equal(schema.transformedDefault.parse('prefix/${fields.input}'), 'prefix/${fields.input}')
  assert.equal(schema.transformedDefault.description, 'Default help')
  assert.deepEqual(schema.arrayDefault.parse(undefined), [false])
  assert.deepEqual(schema.arrayDefault.parse(['true', 'false']), [true, false])
  assert.equal(schema.arrayDefault.parse('${fields.flags}'), '${fields.flags}')
  assert.equal(schema.optional.description, 'Optional help')
}

let factoryCalls = 0
const factoryDefault = v4Interpolate(
  z4
    .number()
    .transform((value) => value * 10)
    .prefault(() => {
      factoryCalls += 1
      return factoryCalls
    }),
)
assert.equal(factoryCalls, 0, 'interpolation must not evaluate factory defaults early')
assert.equal(factoryDefault.parse(undefined), 10)
assert.equal(factoryDefault.parse(undefined), 20)

const opaqueDefault = v4Interpolate(v4StableDefault(z4.unknown(), { values: ['original'] }))
const mutable = opaqueDefault.parse(undefined)
assert(
  mutable !== null &&
    typeof mutable === 'object' &&
    'values' in mutable &&
    Array.isArray(mutable.values),
)
mutable.values.push('changed')
assert.deepEqual(opaqueDefault.parse(undefined), { values: ['original'] })

const cyclic: { self?: unknown } = {}
cyclic.self = cyclic
for (const result of [
  { found: true, count: 2 },
  new Date(0),
  new Map([['key', 'value']]),
  new Set(['value']),
  Promise.resolve('value'),
  new File(['content'], 'input.txt'),
  cyclic,
]) {
  const message = {
    role: 'tool',
    content: [{ type: 'tool-result', toolCallId: 'call', toolName: 'lookup', result }],
  }
  assert.deepEqual(v4NormalizeMessage(message), v3NormalizeMessage(message))
}
assert.deepEqual(
  v4NormalizeMessage({
    role: 'tool',
    content: [
      { type: 'tool-result', toolCallId: 'call', toolName: 'lookup', result: { found: true } },
    ],
  }),
  {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: 'call',
        toolName: 'lookup',
        output: { type: 'json', value: { found: true } },
      },
    ],
  },
)

for (const { version, capabilities, vendor, direct, interpolatable } of [
  {
    version: 'v3',
    capabilities: v3ModelCapabilities,
    vendor: v3VendorModel,
    direct: v3Chat,
    interpolatable: v3InterpolatableChat,
  },
  {
    version: 'v4',
    capabilities: v4ModelCapabilities,
    vendor: v4VendorModel,
    direct: v4Chat,
    interpolatable: v4InterpolatableChat,
  },
]) {
  test(`${version} AI chat retains enum choices and whole-value model interpolation`, () => {
    const input = { robot: '/ai/chat', use: ':original', messages: 'Synthetic prompt' }
    const models = Object.keys(capabilities)
    assert.equal(Object.isFrozen(capabilities), true)
    assert.deepEqual(vendor.options, models)
    for (const model of models) {
      assert.equal(vendor.parse(model), model)
      assert.equal(direct.parse({ ...input, model }).model, model)
      assert.equal(interpolatable.parse({ ...input, model }).model, model)
    }
    for (const schema of [direct, interpolatable]) {
      assert.equal(schema.parse(input).model, 'auto')
      assert.equal(schema.parse({ ...input, model: 'auto' }).model, 'auto')
      for (const model of [
        'unknown/model',
        'openai/${fields.model}',
        '${fields.model}/suffix',
        'prefix${fields.model}suffix',
      ]) {
        assert.equal(schema.safeParse({ ...input, model }).success, false, model)
      }
    }
    assert.equal(
      interpolatable.parse({ ...input, model: '${fields.model}' }).model,
      '${fields.model}',
    )
    assert.equal(direct.safeParse({ ...input, model: '${fields.model}' }).success, false)
    const unsupported = vendor.safeParse('unknown/model')
    assert.equal(unsupported.success, false)
    if (!unsupported.success) {
      // Zod 3 and 4 expose different native enum issue shapes for the same rejection.
      assert.equal(
        unsupported.error.issues[0]?.code,
        version === 'v3' ? 'invalid_enum_value' : 'invalid_value',
      )
      assert.deepEqual(unsupported.error.issues[0]?.path, [])
    }
  })
}

console.log('zod runtime parity: ok')
