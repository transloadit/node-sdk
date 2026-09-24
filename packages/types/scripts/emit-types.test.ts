import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import ts from 'typescript'

const execFileAsync = promisify(execFile)

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

const assertCompiles = (files: string[]): void => {
  const program = ts.createProgram(files, {
    allowImportingTsExtensions: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    types: [],
  })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => import.meta.dirname,
      getNewLine: () => '\n',
    }),
  )
}

// Content's composed Robot definitions expose indexed accesses through a private Instructions alias.
const fixture = `
import { z } from 'zod/v3'
import type { SchemaDefinition } from './definitions.ts'
import type { MergeObjects } from '../utility.ts'

export type RobotSchemaVariantTypes<Variants extends {
  schema: z.ZodTypeAny
  withHiddenFields: z.ZodTypeAny
  interpolatable: z.ZodTypeAny
}> = {
  output: z.output<Variants['schema']>
  input: z.input<Variants['schema']>
  hiddenOutput: z.output<Variants['withHiddenFields']>
  interpolatableInput: z.input<Variants['interpolatable']>
}

const schema = z.object({
  robot: z.literal('/video/encode'),
  width: z.string().transform((value) => Number(value)),
  result: z.boolean().default(false),
})
const definition: SchemaDefinition<typeof schema> = { schema }
const robotDefinition = {
  ...definition,
  withHiddenFields: schema.extend({ internal: z.boolean().default(false) }),
  interpolatable: schema.extend({ width: z.union([z.string(), z.number()]) }),
}
type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>
type Output = Instructions['output']

export type RobotVideoEncodeInstructions = Output
export type RobotVideoEncodeInstructionsInput = Instructions['input']
export type RobotVideoEncodeInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotVideoEncodeInstructionsInput = Instructions['interpolatableInput']
export type ExtendedInput<T> = MergeObjects<T, { added: string }>
const parameterDocs = { width: 'Width', result: 'Result' }
export type ParameterId = keyof typeof parameterDocs
`

const consumer = `
import type {
  RobotVideoEncodeInstructions as Output,
  RobotVideoEncodeInstructionsInput as Input,
  RobotVideoEncodeInstructionsWithHiddenFields as Hidden,
  InterpolatableRobotVideoEncodeInstructionsInput as Interpolatable,
  ExtendedInput,
  ParameterId,
} from './src/generated/index.ts'

const output: Output = { robot: '/video/encode', width: 320, result: false }
const input: Input = { robot: '/video/encode', width: '320' }
const hidden: Hidden = { ...output, internal: true }
const interpolatable: Interpolatable = { robot: '/video/encode', width: 320 }
const extended: ExtendedInput<{ added: number; kept: boolean }> = { added: 'updated', kept: true }
const parameter: ParameterId = 'width'

// @ts-expect-error Generic merge helpers retain their source-wins behavior.
const wrongMerge: ExtendedInput<{ added: number; kept: boolean }> = { added: 123, kept: true }
// @ts-expect-error Type queries become the declared parameter names.
const wrongParameter: ParameterId = 'unknown'

// @ts-expect-error The schema transforms width to a number in the output.
const stringOutput: Output = { ...output, width: '320' }
// @ts-expect-error The input accepts strings before transforming width.
const numberInput: Input = { ...input, width: 320 }
// @ts-expect-error Defaults are required in parsed output.
const missingDefault: Output = { robot: '/video/encode', width: 320 }
// @ts-expect-error Internal fields do not leak into the public output.
const privateField: Output = { ...output, internal: true }
// @ts-expect-error Robot names remain literal types.
const wrongRobot: Input = { ...input, robot: '/image/resize' }
`

test('emits composed Robot types with an isolated generator command', async () => {
  const temporaryRoot = await mkdtemp(join(import.meta.dirname, '.emit-types-'))
  const packageRoot = join(temporaryRoot, 'packages/types')
  const generatorPath = join(packageRoot, 'scripts/emit-types.ts')
  const fixturePath = join(temporaryRoot, 'packages/node/src/alphalib/types/robots/video-encode.ts')
  const consumerPath = join(packageRoot, 'consumer.ts')

  try {
    await mkdir(dirname(generatorPath), { recursive: true })
    await mkdir(dirname(fixturePath), { recursive: true })
    await copyFile(join(import.meta.dirname, 'emit-types.ts'), generatorPath)
    await writeFile(fixturePath, fixture)
    await writeFile(
      join(dirname(fixturePath), 'definitions.ts'),
      "import type { z } from 'zod/v3'\nexport type SchemaDefinition<Schema extends z.ZodTypeAny> = { schema: Schema }\n",
    )
    await copyFile(
      join(import.meta.dirname, '../../node/src/alphalib/types/utility.ts'),
      join(dirname(fixturePath), '../utility.ts'),
    )
    await writeFile(consumerPath, consumer)
    assertCompiles([fixturePath])

    await execFileAsync(process.execPath, [generatorPath], { cwd: temporaryRoot })
    assertCompiles([consumerPath])

    // These preexisting helper tests import the copy because importing also runs the generator.
    const { escapeStringLiteral, normalizeExportPath } = await import(
      pathToFileURL(generatorPath).href
    )
    for (const { input, expected } of cases) {
      assert.equal(escapeStringLiteral(input), expected)
    }
    for (const { input, expected } of exportCases) {
      assert.equal(normalizeExportPath(input), expected)
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
})

test('generated types preserve recursive JSON schemas', async () => {
  const aiChatTypes = await readFile(
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
})
