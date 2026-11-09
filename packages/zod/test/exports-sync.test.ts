import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import ts from 'typescript'

const execFileAsync = promisify(execFile)
const filePath = fileURLToPath(import.meta.url)
const zodRoot = resolve(dirname(filePath), '..')
const alphalibRoot = resolve(zodRoot, '../node/src/alphalib')
const typesRoot = resolve(alphalibRoot, 'types')
const relativeImportPattern = /(?:from\s+|import\s*)['"](\.\.?\/[^'"]+\.ts)['"]/g

const normalize = (items: string[]): string[] => [...new Set(items)].sort()

const listTypeModules = async (): Promise<string[]> => {
  const entries = await readdir(typesRoot, { withFileTypes: true })
  const modules = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name.replace(/\.ts$/, ''))
  modules.push('robots/_index')
  return normalize(modules)
}

const readIndexModules = async (indexPath: string): Promise<string[]> => {
  const contents = await readFile(indexPath, 'utf8')
  const modules = contents
    .split('\n')
    .map((line) => line.match(/export \* from ['"]\.\/(.+?)\.(?:ts|js)['"]/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => match[1])
  return normalize(modules)
}

const collectFiles = async (dir: string, acc: string[] = []): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(fullPath, acc)
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      acc.push(fullPath)
    }
  }
  return acc
}

const isPathInside = (root: string, candidate: string): boolean => {
  const relativePath = relative(root, candidate)
  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  )
}

const assertCompiles = (files: string[]): void => {
  const program = ts.createProgram(files, {
    allowImportingTsExtensions: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    types: ['node'],
  })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => zodRoot,
      getNewLine: () => '\n',
    }),
  )
}

const assertGeneratedDependencyClosure = async (
  generatedRoot: string,
  entrypoints: string[],
): Promise<void> => {
  const pending = [...new Set(entrypoints)]
  const visited = new Set(pending)
  for (let index = 0; index < pending.length; index += 1) {
    const file = pending[index]
    if (!file) continue

    const contents = await readFile(file, 'utf8')
    for (const match of contents.matchAll(relativeImportPattern)) {
      const specifier = match[1]
      if (!specifier) continue

      const dependency = resolve(dirname(file), specifier)
      assert.ok(
        isPathInside(generatedRoot, dependency),
        `${file}: ${specifier} escapes the generated package`,
      )
      if (visited.has(dependency)) continue
      visited.add(dependency)
      pending.push(dependency)
    }
  }
}

const assertSharedDependenciesAreSynced = async (
  sourceAlphalibRoot: string,
  generatedPackageRoot: string,
): Promise<void> => {
  const sourceTypesRoot = resolve(sourceAlphalibRoot, 'types')
  const pending = await collectFiles(sourceTypesRoot)
  const visited = new Set(pending)
  const sharedDependencies = new Set<string>()

  for (let index = 0; index < pending.length; index += 1) {
    const sourceFile = pending[index]
    if (!sourceFile) continue

    const contents = await readFile(sourceFile, 'utf8')
    for (const match of contents.matchAll(relativeImportPattern)) {
      const specifier = match[1]
      if (!specifier) continue

      const dependency = resolve(dirname(sourceFile), specifier)
      assert.ok(
        isPathInside(sourceAlphalibRoot, dependency),
        `${sourceFile}: ${specifier} escapes alphalib`,
      )
      if (!isPathInside(sourceTypesRoot, dependency)) {
        sharedDependencies.add(dependency)
      }

      if (visited.has(dependency)) continue
      visited.add(dependency)
      pending.push(dependency)
    }
  }

  for (const version of ['v3', 'v4']) {
    const generatedRoot = resolve(generatedPackageRoot, 'src', version)
    const generatedFiles = pending.map((file) =>
      resolve(
        generatedRoot,
        relative(isPathInside(sourceTypesRoot, file) ? sourceTypesRoot : sourceAlphalibRoot, file),
      ),
    )
    await assertGeneratedDependencyClosure(generatedRoot, [
      resolve(generatedRoot, 'index.ts'),
      ...generatedFiles,
    ])

    // Transformed helpers can differ from their sources but must still compile and load.
    const generatedHelpers = [...sharedDependencies].map((file) =>
      resolve(generatedRoot, relative(sourceAlphalibRoot, file)),
    )
    if (generatedHelpers.length > 0) assertCompiles(generatedHelpers)
    for (const file of generatedHelpers) {
      await import(pathToFileURL(file).href)
    }
  }
}

test('generated exports and dependency closure match the SDK sources', async () => {
  const expected = await listTypeModules()
  const v3Index = await readIndexModules(resolve(zodRoot, 'src/v3/index.ts'))
  const v4Index = await readIndexModules(resolve(zodRoot, 'src/v4/index.ts'))

  assert.deepEqual(
    v3Index,
    expected,
    'zod v3 index exports must match packages/node/src/alphalib/types',
  )
  assert.deepEqual(
    v4Index,
    expected,
    'zod v4 index exports must match packages/node/src/alphalib/types',
  )
  await assertSharedDependenciesAreSynced(alphalibRoot, zodRoot)
})

test('preserves schemas and helper dependencies with isolated generator commands', async () => {
  const temporaryRoot = await mkdtemp(resolve(zodRoot, 'test/.sync-fixtures-'))
  const fixtureAlphalibRoot = resolve(temporaryRoot, 'packages/node/src/alphalib')
  const fixturePackageRoot = resolve(temporaryRoot, 'packages/zod')
  const helperSource = `
import { z } from 'zod'
import { isRecord } from './lib/object.ts'

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(jsonValueSchema)]),
)
export function normalizeCoreMessage(value: unknown): unknown {
  if (!isRecord(value)) return value
  const { experimental_providerMetadata, ...rest } = value
  const providerOptions = value.providerOptions ?? experimental_providerMetadata
  return providerOptions === undefined ? rest : { ...rest, providerOptions }
}
`
  const objectSource = `
import type { UnknownRecord } from './record.ts'

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
`
  const schemaSource = `
import { z } from 'zod'
import { jsonValueSchema, normalizeCoreMessage } from '../aiMessages.ts'
import { zodStableJsonDefault } from '../lib/zodInputSemantics.ts'

export { jsonValueSchema, normalizeCoreMessage } from '../aiMessages.ts'
type Recursive = { child?: Recursive }
export const lazyOptionalSchema: z.ZodType<Recursive | undefined> = z
  .lazy(() => z.object({ child: lazyOptionalSchema }))
  .optional()
const innerDefault = z.string().default('inner')
export const omissionSchema = z.object({
  optional: innerDefault.optional().describe('Optional help'),
  nullable: innerDefault.nullable().optional(),
  prefault: zodStableJsonDefault(z.string().transform((value) => 'parsed:' + value), 'inner').optional(),
  topDefault: z.string().optional().default('outer'),
  nullDefault: z.string().nullable().default(null),
  nested: z.object({ optional: innerDefault.optional() }).optional(),
  repeated: innerDefault.optional().optional(),
})
export const fixtureSchema = z.object({
  width: z.string().transform((value) => Number(value)),
  result: z.boolean().default(false),
  defaulted: zodStableJsonDefault(z.string().transform((value) => 'parsed:' + value), 'initial'),
  items: zodStableJsonDefault(z.array(z.string()), []),
  message: z.preprocess(normalizeCoreMessage, z.object({
    role: z.literal('assistant'),
    providerOptions: jsonValueSchema.optional(),
  }).passthrough()),
})
`
  // The shared description sits inside the old replacement span but is used again after it.
  const primitivesSource = `
import { z } from 'zod'
import { inheritApiParameterDescription } from '../apiParameterDescription.ts'

const booleanStringSchema = z.enum(['true', 'false'])
const interpolationSchemaFull = z.string()
const interpolationSchemaPartial = z.string()
type InterpolatableTuple<Schemas extends z.ZodTypeAny[]> = Schemas
type InterpolatableSchema<Schema extends z.ZodTypeAny> = Schema
export function interpolateRecursive<Schema extends z.ZodTypeAny>(schema: Schema): Schema {
  return inheritApiParameterDescription(schema, schema)
}

/**
 * The robot keys specified in this array can’t be interpolated.
 */
const uninterpolatableKeys = ['interpolate', 'robot', 'use'] as const

type InterpolatableRobot<Schema extends z.ZodTypeAny> = Schema
export function interpolateRobot<Schema extends z.ZodTypeAny>(schema: Schema): Schema {
  return schema
}

const robotInterpolateBooleanSchema = z
  .union([z.boolean(), booleanStringSchema])
  .transform((value) => value === true || value === 'true')
const robotInterpolateDescription = 'Shared interpolation documentation from the source.'
export const robotInterpolateSchema = z
  .union([robotInterpolateBooleanSchema, z.record(robotInterpolateBooleanSchema)])
  .default(true)
  .describe(robotInterpolateDescription)

/**
 * Fields that are shared by all Transloadit robots.
 */
export const robotParameterDocs = { interpolate: { description: robotInterpolateDescription } }
`
  const consumer = (version: string): string => `
import assert from 'node:assert/strict'
import { z } from 'zod/${version}'
import {
  fixtureSchema,
  jsonValueSchema,
  lazyOptionalSchema,
  normalizeCoreMessage,
  omissionSchema,
  robotInterpolateSchema,
  robotParameterDocs,
} from './src/${version}/index.ts'

assert.equal(lazyOptionalSchema.parse(undefined), undefined)
assert.deepEqual(lazyOptionalSchema.parse({ child: {} }), { child: {} })
assert.deepEqual(omissionSchema.parse({}), { topDefault: 'outer', nullDefault: null })
assert.deepEqual(omissionSchema.parse({ optional: undefined, nullable: undefined, prefault: undefined }), {
  optional: undefined, nullable: undefined, prefault: undefined, topDefault: 'outer', nullDefault: null,
})
assert.deepEqual(omissionSchema.parse({ topDefault: undefined, nullDefault: undefined, nested: { optional: undefined }, repeated: undefined }), {
  topDefault: 'outer', nullDefault: null, nested: { optional: undefined }, repeated: undefined,
})
assert.deepEqual(omissionSchema.parse({ optional: 'value', nullable: null, prefault: 'value', nested: {} }), {
  optional: 'value', nullable: null, prefault: 'parsed:value', nested: {}, topDefault: 'outer', nullDefault: null,
})
assert.equal(omissionSchema.shape.optional.description, 'Optional help')
assert.equal(omissionSchema.shape.optional.unwrap().parse(undefined), 'inner')
const innerSchema: z.ZodDefault<z.ZodString> = omissionSchema.shape.optional.unwrap()
assert.equal(innerSchema.parse(undefined), 'inner')
assert.equal(omissionSchema.shape.optional.describe('Changed help').parse(undefined), undefined)
assert.equal(await omissionSchema.shape.optional.parseAsync(undefined), undefined)
assert.equal(omissionSchema.safeParse({ optional: null }).success, false)
const omittedOutput: z.output<typeof omissionSchema> = { topDefault: 'outer', nullDefault: null }
const optionalOutput: string | undefined = omittedOutput.optional
const optionalInput: z.input<typeof omissionSchema> = { optional: undefined, nullable: null }

const nested = { provider: { count: 3, enabled: true, parts: ['text', null] } }
assert.deepEqual(jsonValueSchema.parse(nested), nested)
assert.equal(jsonValueSchema.safeParse({ unsupported: new Date() }).success, false)
assert.deepEqual(
  normalizeCoreMessage({ role: 'assistant', experimental_providerMetadata: nested }),
  { role: 'assistant', providerOptions: nested },
)
const input: z.input<typeof fixtureSchema> = {
  width: '320',
  message: { role: 'assistant', experimental_providerMetadata: nested, extra: 'preserved' },
}
const output: z.output<typeof fixtureSchema> = fixtureSchema.parse(input)
assert.deepEqual(output, {
  width: 320,
  result: false,
  defaulted: 'parsed:initial',
  items: [],
  message: { role: 'assistant', providerOptions: nested, extra: 'preserved' },
})
output.items.push('changed')
assert.deepEqual(fixtureSchema.parse(input).items, [])
assert.equal(fixtureSchema.safeParse({ ...input, width: 320 }).success, false)
assert.equal(fixtureSchema.safeParse({ ...input, result: 'false' }).success, false)
// @ts-expect-error Width is a string before the schema transforms it.
const wrongInput: z.input<typeof fixtureSchema> = { ...input, width: 320 }
// @ts-expect-error Width is a number in the parsed output.
const wrongOutput: z.output<typeof fixtureSchema> = { ...output, width: '320' }
// @ts-expect-error Defaults are required in the parsed output.
const missingDefault: z.output<typeof fixtureSchema> = { width: 320, message: output.message }
assert.equal(robotParameterDocs.interpolate.description, 'Shared interpolation documentation from the source.')
assert.equal(robotInterpolateSchema.description, robotParameterDocs.interpolate.description)
assert.equal(robotInterpolateSchema.parse(undefined), true)
assert.equal(robotInterpolateSchema.parse('false'), false)
assert.deepEqual(robotInterpolateSchema.parse({ path: 'false', 'ffmpeg.vf': 'true' }), {
  path: false,
  'ffmpeg.vf': true,
})
assert.equal(robotInterpolateSchema.safeParse({ path: 1 }).success, false)
`
  const fixtures = [
    {
      path: 'aiMessages.ts',
      source: helperSource,
    },
    { path: 'lib/object.ts', source: objectSource },
    {
      path: 'lib/record.ts',
      source: "export type { UnknownRecord } from '../types/utility.ts'\n",
    },
    {
      path: 'lib/zodInputSemantics.ts',
      source: await readFile(resolve(alphalibRoot, 'lib/zodInputSemantics.ts'), 'utf8'),
    },
    { path: 'types/fixture.ts', source: schemaSource },
    { path: 'types/utility.ts', source: 'export type UnknownRecord = Record<string, unknown>\n' },
    {
      path: 'types/apiParameterDescription.ts',
      source: await readFile(resolve(alphalibRoot, 'types/apiParameterDescription.ts'), 'utf8'),
    },
    {
      path: 'types/robots/_instructions-primitives.ts',
      source: primitivesSource,
    },
    {
      path: 'types/robots/_index.ts',
      source: "export * from './_instructions-primitives.ts'\n",
    },
  ]

  try {
    for (const fixture of fixtures) {
      const destination = resolve(fixtureAlphalibRoot, fixture.path)
      await mkdir(dirname(destination), { recursive: true })
      await writeFile(destination, fixture.source)
    }
    await mkdir(resolve(fixturePackageRoot, 'scripts'), { recursive: true })
    await mkdir(resolve(fixturePackageRoot, 'scripts/adapters'), { recursive: true })
    await copyFile(
      resolve(zodRoot, 'scripts/adapters/zodOptional.ts'),
      resolve(fixturePackageRoot, 'scripts/adapters/zodOptional.ts'),
    )
    for (const version of ['v3', 'v4']) {
      const generatorPath = resolve(fixturePackageRoot, `scripts/sync-${version}.ts`)
      await copyFile(resolve(zodRoot, `scripts/sync-${version}.ts`), generatorPath)
      await execFileAsync(process.execPath, [generatorPath], { cwd: temporaryRoot })
      assert.deepEqual(
        await readIndexModules(resolve(fixturePackageRoot, 'src', version, 'index.ts')),
        ['apiParameterDescription', 'fixture', 'robots/_index', 'utility'],
      )
      assert.match(
        await readFile(resolve(fixturePackageRoot, 'src', version, 'aiMessages.ts'), 'utf8'),
        new RegExp(`from ['"]zod/${version}['"]`),
      )
      const consumerPath = resolve(fixturePackageRoot, `consumer-${version}.ts`)
      await writeFile(consumerPath, consumer(version))
      assertCompiles([consumerPath])
      await execFileAsync(process.execPath, [consumerPath], { cwd: temporaryRoot })
    }
    await assertSharedDependenciesAreSynced(fixtureAlphalibRoot, fixturePackageRoot)
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
})
