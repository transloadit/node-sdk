import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, posix, relative, resolve, sep } from 'node:path'

import ts from 'typescript'

/**
 * Files keyed by their POSIX path relative to an alphalib root, such as
 * `types/robots/ai-chat.ts`.
 */
export type SourceTree = Map<string, string>

/** Location of the Zod 3 optional-semantics adapter inside a Zod 4 source tree. */
export const optionalAdapterPath = 'lib/sdkZodOptional.ts'

/** Marks a two-argument `z.record(z.string(), …)` that the Zod 3 export keeps as written. */
export const explicitRecordKeyHint = '/* @zod-v3-explicit-key */'

const optionalWrapperName = 'optionalWithV3Semantics'
const relativeImportPattern = /(?:from\s+|import\s*)['"](\.\.?\/[^'"]+\.ts)['"]/g
const regionMarkerPattern = /^\/\/ @zod-(v3|v4)-only-(begin|end) ([a-z0-9-]+)$/
const sentinelPattern = /^\/\/@@zod-region-(\d+)-(begin|end)$/

const v4RegionBegin = (id: string): string => `// @zod-v4-only-begin ${id}`
const v4RegionEnd = (id: string): string => `// @zod-v4-only-end ${id}`
const v3RegionBegin = (id: string): string => `// @zod-v3-only-begin ${id}`
const v3RegionEnd = (id: string): string => `// @zod-v3-only-end ${id}`

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`)
}

// ---------------------------------------------------------------------------------------------
// Trees
// ---------------------------------------------------------------------------------------------

const collectFiles = async (dir: string, acc: string[] = []): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(full, acc)
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) acc.push(full)
  }
  return acc
}

const toTreePath = (root: string, file: string): string => relative(root, file).split(sep).join('/')

/** Read every `.ts` file below `root`. */
export async function readTree(root: string): Promise<SourceTree> {
  const tree: SourceTree = new Map()
  for (const file of (await collectFiles(root)).sort()) {
    tree.set(toTreePath(root, file), await readFile(file, 'utf8'))
  }
  return tree
}

/** Replace the `.ts` files below `root` with `tree`, leaving other files untouched. */
export async function writeTree(root: string, tree: SourceTree): Promise<void> {
  await mkdir(root, { recursive: true })
  for (const file of await collectFiles(root)) {
    if (!tree.has(toTreePath(root, file))) await rm(file)
  }
  for (const [path, contents] of tree) {
    const destination = resolve(root, ...path.split('/'))
    await mkdir(dirname(destination), { recursive: true })
    const existing = await readFile(destination, 'utf8').catch(() => undefined)
    if (existing !== contents) await writeFile(destination, contents, 'utf8')
  }
}

/** Write `tree` into a fresh directory, as the generated `src/v3` and `src/v4` trees are. */
export async function replaceDirectory(root: string, tree: SourceTree): Promise<void> {
  await rm(root, { recursive: true, force: true })
  await writeTree(root, tree)
}

const isInside = (root: string, path: string): boolean =>
  root === '' ? !path.startsWith('../') && path !== '..' : path.startsWith(`${root}/`)

const listRelativeImports = (path: string, contents: string): string[] => {
  const dependencies: string[] = []
  for (const match of contents.matchAll(relativeImportPattern)) {
    const specifier = match[1]
    if (!specifier) continue
    const dependency = posix.normalize(posix.join(posix.dirname(path), specifier))
    if (!isInside('', dependency)) fail(path, `schema dependency escapes alphalib: ${specifier}`)
    dependencies.push(dependency)
  }
  return dependencies
}

/**
 * Select the files `@transloadit/zod` publishes: everything below `types/` plus the helpers those
 * files import, transitively.
 */
export function selectSchemaSources(tree: SourceTree): SourceTree {
  const pending = [...tree.keys()].filter((path) => isInside('types', path)).sort()
  if (pending.length === 0) throw new Error('No schema sources found below types/')
  const selected = new Set(pending)
  for (let index = 0; index < pending.length; index += 1) {
    const path = pending[index]
    if (path === undefined) continue
    const contents = tree.get(path)
    if (contents === undefined) fail(path, 'imported but missing')
    for (const dependency of listRelativeImports(path, contents)) {
      if (selected.has(dependency)) continue
      if (!tree.has(dependency)) fail(path, `imports missing file ${dependency}`)
      selected.add(dependency)
      pending.push(dependency)
    }
  }
  const result: SourceTree = new Map()
  for (const path of [...selected].sort()) {
    const contents = tree.get(path)
    if (contents !== undefined) result.set(path, contents)
  }
  return result
}

/**
 * Lay a schema tree out as `@transloadit/zod` publishes it: `types/**` moves to the root, shared
 * helpers keep their paths, relative imports follow, and `index.ts` re-exports every type module.
 */
export function flattenSchemaTree(tree: SourceTree): SourceTree {
  const destinationOf = (path: string): string =>
    isInside('types', path) ? path.slice('types/'.length) : path
  const result: SourceTree = new Map()
  for (const [path, contents] of tree) {
    const destination = destinationOf(path)
    const next = contents.replace(relativeImportPattern, (statement: string, specifier: string) => {
      const dependency = posix.normalize(posix.join(posix.dirname(path), specifier))
      const target = posix.relative(posix.dirname(destination), destinationOf(dependency))
      return statement.replace(specifier, target.startsWith('.') ? target : `./${target}`)
    })
    result.set(destination, next)
  }
  const modules = [...tree.keys()]
    .filter((path) => /^types\/[^/]+\.ts$/.test(path))
    .map((path) => path.slice('types/'.length, -'.ts'.length))
  modules.push('robots/_index')
  const index = [...new Set(modules)].sort().map((module) => `export * from './${module}.ts'`)
  result.set('index.ts', [...index, ''].join('\n'))
  return new Map([...result].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

/** Rewrite `from 'zod'` imports, as the published Zod 3 tree uses the `zod/v3` subpath. */
export function rewriteBareZodImports(tree: SourceTree, specifier: string): SourceTree {
  const result: SourceTree = new Map()
  for (const [path, contents] of tree) {
    result.set(path, contents.replace(/from ['"]zod['"]/g, `from '${specifier}'`))
  }
  return result
}

// ---------------------------------------------------------------------------------------------
// Region patches: Zod 4 replacements that cannot be derived from the Zod 3 text, and back.
// ---------------------------------------------------------------------------------------------

interface Hunk {
  start: number
  end: number
}

interface RegionPatch {
  id: string
  /** Line-aligned spans of the Zod 3 text this patch replaces. */
  find: (path: string, contents: string) => Hunk[]
  /** Zod 4 text for one span, after the import, record and passthrough rewrites. */
  toV4: (path: string, hunk: string) => string
}

const lineStartAt = (contents: string, index: number): number =>
  contents.lastIndexOf('\n', index - 1) + 1

const assertLineStart = (path: string, id: string, contents: string, index: number): void => {
  if (lineStartAt(contents, index) !== index) fail(path, `${id} anchor must start a line`)
}

const endOfLine = (contents: string, index: number): number => {
  const newline = contents.indexOf('\n', index)
  return newline === -1 ? contents.length : newline + 1
}

/** Replace everything from a starting anchor up to (not including) an ending anchor. */
const spanPatch = (
  id: string,
  startAnchor: string,
  endAnchor: string,
  replacement: string,
): RegionPatch => ({
  id,
  find: (path, contents) => {
    const start = contents.indexOf(startAnchor)
    const end = start === -1 ? -1 : contents.indexOf(endAnchor, start)
    if (start === -1 || end === -1) fail(path, `${id}: expected anchors are missing`)
    assertLineStart(path, id, contents, start)
    assertLineStart(path, id, contents, end)
    return [{ start, end }]
  },
  toV4: () => replacement,
})

/** Rewrite every line that contains `needle`. */
const linePatch = (id: string, needle: string, rewrite: (line: string) => string): RegionPatch => ({
  id,
  find: (path, contents) => {
    const hunks: Hunk[] = []
    for (let index = contents.indexOf(needle); index !== -1; ) {
      const start = lineStartAt(contents, index)
      const end = endOfLine(contents, index)
      hunks.push({ start, end })
      index = contents.indexOf(needle, end)
    }
    if (hunks.length === 0) fail(path, `${id}: expected ${JSON.stringify(needle)}`)
    return hunks
  },
  toV4: (path, hunk) => {
    const next = rewrite(hunk)
    if (next === hunk) fail(path, `${id}: rewrite did not apply`)
    return next
  },
})

/** Rewrite the lines spanned by the first match of `pattern`. */
const patternPatch = (id: string, pattern: RegExp, replacement: string): RegionPatch => ({
  id,
  find: (path, contents) => {
    const match = pattern.exec(contents)
    if (!match) fail(path, `${id}: expected ${pattern}`)
    const start = match.index
    assertLineStart(path, id, contents, start)
    return [{ start, end: endOfLine(contents, start + match[0].length) }]
  },
  toV4: (path, hunk) => {
    const next = hunk.replace(pattern, replacement)
    if (next === hunk) fail(path, `${id}: rewrite did not apply`)
    return next
  },
})

const interpolatableSchemaV4 =
  'type InterpolatableTuple<Schemas extends readonly z.core.SomeType[]> = Schemas extends readonly [\n' +
  '  infer Head extends z.core.SomeType,\n' +
  '  ...infer Rest extends z.core.SomeType[],\n' +
  ']\n' +
  '  ? [InterpolatableSchema<Head>, ...InterpolatableTuple<Rest>]\n' +
  '  : Schemas\n\n' +
  'type InterpolatableSchema<Schema extends z.core.SomeType> = Schema extends z.ZodString\n' +
  '  ? Schema\n' +
  '  : Schema extends\n' +
  '        | z.ZodBoolean\n' +
  '        | z.ZodEnum<infer _Enum>\n' +
  '        | z.ZodLiteral<infer _Literal>\n' +
  '        | z.ZodNumber\n' +
  '        | z.ZodPipe<z.ZodTypeAny, z.ZodTypeAny>\n' +
  '    ? z.ZodUnion<[z.ZodString, Schema]>\n' +
  '    : Schema extends z.ZodArray<infer T>\n' +
  '      ? z.ZodUnion<[z.ZodString, z.ZodArray<InterpolatableSchema<T>>]>\n' +
  '      : Schema extends z.ZodDefault<infer T> | z.ZodPrefault<infer T>\n' +
  '        ? z.ZodPrefault<InterpolatableSchema<T>>\n' +
  '        : Schema extends z.ZodNullable<infer T>\n' +
  '          ? z.ZodNullable<InterpolatableSchema<T>>\n' +
  '          : Schema extends z.ZodOptional<infer T>\n' +
  '            ? z.ZodOptional<InterpolatableSchema<T>>\n' +
  '            : Schema extends z.ZodRecord<infer Key, infer Value>\n' +
  '              ? z.ZodRecord<Key, InterpolatableSchema<Value>>\n' +
  '              : Schema extends z.ZodTuple<infer T, infer Rest>\n' +
  '                ? z.ZodUnion<[\n' +
  '                    z.ZodString,\n' +
  '                    z.ZodTuple<\n' +
  '                      InterpolatableTuple<T>,\n' +
  '                      Rest extends z.core.SomeType ? InterpolatableSchema<Rest> : null\n' +
  '                    >,\n' +
  '                  ]>\n' +
  '                : Schema extends z.ZodObject<infer T, infer Config>\n' +
  '                  ? z.ZodUnion<[\n' +
  '                      z.ZodString,\n' +
  '                      z.ZodObject<{ [Key in keyof T]: InterpolatableSchema<T[Key]> }, Config>,\n' +
  '                    ]>\n' +
  '                  : Schema extends z.ZodDiscriminatedUnion<infer _T>\n' +
  '                    ? Schema\n' +
  '                    : Schema extends z.ZodUnion<infer T>\n' +
  '                      ? z.ZodUnion<[z.ZodString, ...InterpolatableTuple<T>]>\n' +
  '                      : Schema\n\n' +
  'const applyArrayChecks = (schema: z.ZodArray<z.ZodTypeAny>, checks: unknown): z.ZodArray<z.ZodTypeAny> => {\n' +
  '  if (!Array.isArray(checks)) return schema\n' +
  '  let next = schema\n' +
  '  for (const check of checks) {\n' +
  '    const def = (check as { _zod?: { def?: { check?: string; minimum?: number; maximum?: number; length?: number } } })?._zod?.def\n' +
  '    if (!def) continue\n' +
  `    if (def.check === 'min_length' && typeof def.minimum === 'number') {\n` +
  '      next = next.min(def.minimum)\n' +
  '    }\n' +
  `    if (def.check === 'max_length' && typeof def.maximum === 'number') {\n` +
  '      next = next.max(def.maximum)\n' +
  '    }\n' +
  `    if (def.check === 'length_equals' && typeof def.length === 'number') {\n` +
  '      next = next.length(def.length)\n' +
  '    }\n' +
  '  }\n' +
  '  return next\n' +
  '}\n\n' +
  'function interpolateRecursiveWithoutDescriptionRegistration<Schema extends z.ZodTypeAny>(\n' +
  '  schema: Schema,\n' +
  '): InterpolatableSchema<Schema> {\n' +
  '  const def = (schema as z.core.SomeType)._zod.def as unknown\n\n' +
  '  switch ((def as { type?: string }).type) {\n' +
  `    case 'boolean':\n` +
  '      return z.union([\n' +
  '        interpolationSchemaFull,\n' +
  '        z\n' +
  '          .union([schema, booleanStringSchema])\n' +
  "          .transform((value) => value === true || value === 'true'),\n" +
  '      ]) as unknown as InterpolatableSchema<Schema>\n' +
  `    case 'array': {\n` +
  '      const arrayDef = def as { element: z.ZodTypeAny; checks?: z.core.$ZodCheck[] }\n' +
  '      // Zod 3 wraps refined arrays in Effects: preserve their complete value checks,\n' +
  '      // allowing only whole-field interpolation instead of widening their elements.\n' +
  "      if (arrayDef.checks?.some((check) => check._zod.def.check === 'custom')) {\n" +
  '        return z.union([interpolationSchemaFull, schema]) as unknown as InterpolatableSchema<Schema>\n' +
  '      }\n' +
  '      let replacement = z.array(interpolateRecursive(arrayDef.element))\n' +
  '      replacement = applyArrayChecks(replacement, arrayDef.checks)\n' +
  '      return z.union([interpolationSchemaFull, replacement]) as unknown as InterpolatableSchema<Schema>\n' +
  '    }\n' +
  `    case 'default':\n` +
  // Both forms must parse their fresh default through the interpolated inner schema.
  // Zod 4 exposes factory defaults through a getter; keep reading it for each parse.
  // Prefaults describe input defaults; JSON Schema authoring consumers must use io: 'input'.
  `    case 'prefault': {\n` +
  '      const defaultDef = def as { innerType: z.ZodTypeAny; defaultValue: unknown }\n' +
  '      return interpolateRecursive(defaultDef.innerType).prefault(() => defaultDef.defaultValue as never) as unknown as InterpolatableSchema<Schema>\n' +
  '    }\n' +
  `    case 'enum':\n` +
  `    case 'literal':\n` +
  '      return z.union([interpolationSchemaFull, schema]) as unknown as InterpolatableSchema<Schema>\n' +
  `    case 'number':\n` +
  '      return z.union([\n' +
  '        z\n' +
  '          .string()\n' +
  '          .regex(/^\\d+(\\.\\d+)?$/)\n' +
  '          .transform((value) => Number(value)),\n' +
  '        interpolationSchemaFull,\n' +
  '        schema,\n' +
  '      ]) as unknown as InterpolatableSchema<Schema>\n' +
  `    case 'nullable': {\n` +
  '      const nullableDef = def as { innerType: z.ZodTypeAny }\n' +
  '      const replacement = interpolateRecursive(nullableDef.innerType).nullable()\n' +
  '      const description = (schema as { description?: string }).description\n' +
  '      return (description ? replacement.describe(description) : replacement) as unknown as InterpolatableSchema<Schema>\n' +
  '    }\n' +
  `    case 'object': {\n` +
  '      const objectDef = def as { shape: Record<string, z.ZodTypeAny> | (() => Record<string, z.ZodTypeAny>); catchall?: z.ZodTypeAny }\n' +
  `      const shape = typeof objectDef.shape === 'function' ? objectDef.shape() : objectDef.shape\n` +
  '      let replacement = z.object(\n' +
  '        Object.fromEntries(\n' +
  '          Object.entries(shape).map(([key, nested]) => [\n' +
  '            key,\n' +
  '            interpolateRecursive(nested as z.ZodTypeAny),\n' +
  '          ]),\n' +
  '        ),\n' +
  '      )\n' +
  '      if (objectDef.catchall) {\n' +
  '        const catchallType = objectDef.catchall._zod.def.type\n' +
  `        if (catchallType === 'never') {\n` +
  '          replacement = replacement.strict()\n' +
  '        } else {\n' +
  '          replacement = replacement.catchall(objectDef.catchall)\n' +
  '        }\n' +
  '      }\n' +
  '      return z.union([interpolationSchemaFull, replacement]) as unknown as InterpolatableSchema<Schema>\n' +
  '    }\n' +
  `    case 'optional': {\n` +
  '      const optionalDef = def as { innerType: z.ZodTypeAny }\n' +
  '      return interpolateRecursive(optionalDef.innerType).optional() as unknown as InterpolatableSchema<Schema>\n' +
  '    }\n' +
  `    case 'record': {\n` +
  '      const recordDef = def as { keyType?: z.ZodTypeAny; valueType: z.ZodTypeAny }\n' +
  '      const keyType = (recordDef.keyType ?? z.string()) as z.core.$ZodRecordKey\n' +
  '      return z.record(keyType, interpolateRecursive(recordDef.valueType)) as unknown as InterpolatableSchema<Schema>\n' +
  '    }\n' +
  `    case 'string':\n` +
  '      return z.union([interpolationSchemaPartial, schema]) as unknown as InterpolatableSchema<Schema>\n' +
  `    case 'tuple': {\n` +
  '      const tupleDef = def as { items: z.ZodTypeAny[]; rest?: z.ZodTypeAny }\n' +
  '      const items = tupleDef.items.map(interpolateRecursive)\n' +
  '      const tuple = items.length === 0 ? z.tuple([]) : z.tuple(items as [z.ZodTypeAny, ...z.ZodTypeAny[]])\n' +
  '      return z.union([\n' +
  '        interpolationSchemaFull,\n' +
  '        tupleDef.rest ? tuple.rest(tupleDef.rest) : tuple,\n' +
  '      ]) as unknown as InterpolatableSchema<Schema>\n' +
  '    }\n' +
  `    case 'union': {\n` +
  '      const unionDef = def as { options: z.ZodTypeAny[]; discriminator?: string }\n' +
  '      if (unionDef.discriminator) {\n' +
  '        return schema as unknown as InterpolatableSchema<Schema>\n' +
  '      }\n' +
  '      return z.union([interpolationSchemaFull, ...unionDef.options.map(interpolateRecursive)]) as unknown as InterpolatableSchema<Schema>\n' +
  '    }\n' +
  `    case 'pipe': {\n` +
  '      const pipeDef = def as { in: z.ZodTypeAny }\n' +
  '      return z.union([pipeDef.in instanceof z.ZodString ? interpolationSchemaPartial : interpolationSchemaFull, schema]) as unknown as InterpolatableSchema<Schema>\n' +
  '    }\n' +
  '    default:\n' +
  '      return schema as unknown as InterpolatableSchema<Schema>\n' +
  '  }\n' +
  '}\n\n' +
  '/** Keep parameter help on rebuilt interpolation schemas. */\n' +
  'export function interpolateRecursive<Schema extends z.ZodTypeAny>(\n' +
  '  schema: Schema,\n' +
  '): InterpolatableSchema<Schema> {\n' +
  '  // Conditional core types lose the classic Zod methods in generic constraints; every\n' +
  '  // runtime branch above constructs a classic schema and describe preserves its type.\n' +
  '  const interpolated = interpolateRecursiveWithoutDescriptionRegistration(schema) as z.ZodTypeAny\n' +
  '  return inheritApiParameterDescription(schema, interpolated) as InterpolatableSchema<Schema>\n' +
  '}\n\n'

const interpolatableRobotV4 =
  'type InterpolatableRobot<Schema extends z.ZodObject> =\n' +
  '  Schema extends z.ZodObject<infer T, infer Config>\n' +
  '    ? z.ZodObject<\n' +
  '        {\n' +
  '          [Key in keyof T]: Key extends (typeof uninterpolatableKeys)[number]\n' +
  '            ? T[Key]\n' +
  '            : InterpolatableSchema<T[Key]>\n' +
  '        },\n' +
  '        Config\n' +
  '      >\n' +
  '    : never\n\n' +
  'export function interpolateRobot<Schema extends z.ZodObject>(\n' +
  '  schema: Schema,\n' +
  '): InterpolatableRobot<Schema> {\n' +
  '  const def = (schema as z.core.SomeType)._zod.def as unknown\n' +
  `  const shape = typeof (def as { shape: Record<string, z.ZodTypeAny> | (() => Record<string, z.ZodTypeAny>) }).shape === 'function'\n` +
  '    ? (def as { shape: () => Record<string, z.ZodTypeAny> }).shape()\n' +
  '    : (def as { shape: Record<string, z.ZodTypeAny> }).shape\n' +
  '  return z\n' +
  '    .object(\n' +
  '      Object.fromEntries(\n' +
  '        Object.entries(shape).map(([key, nested]) => [\n' +
  '          key,\n' +
  '          (uninterpolatableKeys as readonly string[]).includes(key)\n' +
  '            ? nested\n' +
  '            : interpolateRecursive(nested as z.ZodTypeAny),\n' +
  '        ]),\n' +
  '      ),\n' +
  '    )\n' +
  '    .strict() as InterpolatableRobot<Schema>\n' +
  '}\n\n'

// Zod 4 replaces the source’s typed ZodEffects constructor with a public transform pipeline.
const caseInsensitiveEnumV4 = `export function zodCaseInsensitiveEnum<Schema extends z.ZodEnum<Record<string, string>>>(schema: Schema) {
  const lowercaseAscii = (value: string): string => value.replace(/[A-Z]/gu, (character) => character.toLowerCase())
  return z.string().transform((value) =>
    schema.options.find((option) => lowercaseAscii(option) === lowercaseAscii(value)) ?? value,
  ).pipe(schema)
}

`

/** Region patches by alphalib path. A listed file that lacks an anchor fails the codemod. */
export const regionPatches: Record<string, RegionPatch[]> = {
  'lib/zodInputSemantics.ts': [
    spanPatch(
      'case-insensitive-enum',
      'export function zodCaseInsensitiveEnum',
      '/** Apply the Robot',
      caseInsensitiveEnumV4,
    ),
    // Zod 4 defaults bypass parsing; prefault preserves Zod 3 validation and output transforms.
    linePatch(
      'stable-json-default',
      'return schema.default(() => structuredClone(snapshot))',
      (line) => line.replace('schema.default(', 'schema.prefault('),
    ),
  ],
  'aiMessages.ts': [
    // Zod 3 treats File as an object; keep that legacy snapshot behavior in Zod 4.
    linePatch('parsed-type', "z.getParsedType(value) === 'object'", (line) =>
      line.replaceAll(
        "z.getParsedType(value) === 'object'",
        "['object', 'file'].includes(z.core.util.getParsedType(value))",
      ),
    ),
  ],
  'types/robots/_instructions-primitives.ts': [
    spanPatch(
      'interpolatable-schema',
      'type InterpolatableTuple',
      '/**\n * The robot keys specified in this array can’t be interpolated.',
      interpolatableSchemaV4,
    ),
    // The following schemas are compatible after the generic rewrites; preserve their shared docs.
    spanPatch(
      'interpolatable-robot',
      'type InterpolatableRobot',
      'const robotInterpolateBooleanSchema',
      interpolatableRobotV4,
    ),
  ],
  'types/robots/ai-chat.ts': [
    linePatch('any-zod-object', 'z.AnyZodObject', (line) =>
      line.replaceAll('z.AnyZodObject', 'z.ZodObject'),
    ),
  ],
  'types/robots/youtube-store.ts': [
    // The source deliberately widens this legacy preprocessed field’s input to unknown.
    patternPatch(
      'youtube-category-type',
      /const youtubeCategorySchema: z\.ZodEffects<[\s\S]+?\n> =/,
      'const youtubeCategorySchema: z.ZodType<z.output<typeof youtubeCategoryValueSchema>, unknown> =',
    ),
  ],
}

// Files that pin `zod/v3` keep that subpath in the Zod 3 export; the import rewrite has already
// turned the Zod 4 side into `zod/v4`.
const zodV3ImportPatch: RegionPatch = {
  ...linePatch('zod-v3-import', "from 'zod/v3'", (line) => line),
  toV4: (path, hunk) => {
    if (!hunk.includes("from 'zod/v4'")) fail(path, 'zod-v3-import: expected a zod/v4 import')
    return hunk
  },
}

const commentLine = (line: string): string => (line === '' ? '//' : `// ${line}`)

const uncommentLine = (path: string, line: string): string => {
  if (line === '//') return ''
  if (!line.startsWith('// ')) fail(path, `malformed Zod 3 region line ${JSON.stringify(line)}`)
  return line.slice(3)
}

const splitLines = (text: string): string[] => {
  const lines = text.split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines
}

// ---------------------------------------------------------------------------------------------
// Forward codemod: Zod 3 source -> Zod 4 source
// ---------------------------------------------------------------------------------------------

const assertForwardInput = (path: string, contents: string): void => {
  const forbidden: [RegExp, string][] = [
    [/from "zod(?:\/v3)?"/, 'double-quoted zod imports are not normalized losslessly'],
    [/from ['"]zod\/v4/, 'the file already imports zod/v4'],
    [new RegExp(`\\b${optionalWrapperName}\\b`), `the file already uses ${optionalWrapperName}`],
    [/@zod-v[34]-|@@zod-region-/, 'the file already contains Zod 4 codemod markers'],
    [/\.catchall\(z\.unknown\(\)\)/, '.catchall(z.unknown()) would turn into .passthrough()'],
  ]
  for (const [pattern, reason] of forbidden) {
    if (pattern.test(contents)) fail(path, `cannot convert losslessly: ${reason}`)
  }
}

const rewriteZodImports = (contents: string): string =>
  contents.replace(/from 'zod(?:\/v3)?'/g, "from 'zod/v4'")

const rewritePassthroughCalls = (contents: string): string =>
  contents.replace(/\.passthrough\(\)/g, '.catchall(z.unknown())')

const findTopLevelComma = (source: string): number => {
  let depth = 0
  let inString: '"' | "'" | null = null
  let escaped = false
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (inString) {
      if (!escaped && char === inString) inString = null
      escaped = char === '\\' && !escaped
      continue
    }
    if (char === '"' || char === "'") {
      inString = char
      continue
    }
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ',' && depth === 0) return index
  }
  return -1
}

const recordCallPattern = /z\s*\.record\(/y

/**
 * Give one-argument `z.record(value)` calls Zod 4's required string key. Existing
 * `z.record(z.string(), …)` calls get a hint so the Zod 3 export keeps their explicit key.
 */
const rewriteRecordCalls = (path: string, contents: string): string => {
  const transform = (source: string): string => {
    let output = ''
    let index = 0
    while (index < source.length) {
      recordCallPattern.lastIndex = index
      const call = /\w/.test(source[index - 1] ?? '') ? null : recordCallPattern.exec(source)
      if (!call) {
        output += source[index]
        index += 1
        continue
      }
      // Keep the receiver's layout; the Zod 4 export normalizes it to z.record( as before.
      const marker = call[0]
      const argsStart = index + marker.length
      let depth = 1
      let position = argsStart
      let inString: '"' | "'" | null = null
      let escaped = false
      while (position < source.length) {
        const char = source[position]
        if (inString) {
          if (!escaped && char === inString) inString = null
          escaped = char === '\\' && !escaped
          position += 1
          continue
        }
        if (char === '"' || char === "'") {
          inString = char
          position += 1
          continue
        }
        if (char === '(') depth += 1
        if (char === ')') depth -= 1
        if (depth === 0) break
        position += 1
      }
      const args = transform(source.slice(argsStart, position))
      const comma = findTopLevelComma(args)
      if (comma === -1) {
        if (args !== args.trim()) fail(path, `z.record(${args}) has surrounding whitespace`)
        output += `${marker}z.string(), ${args})`
      } else if (args.slice(0, comma).trim() === 'z.string()') {
        output += `${marker}${explicitRecordKeyHint} ${args})`
      } else {
        output += `${marker}${args})`
      }
      index = position + 1
    }
    return output
  }
  return transform(contents)
}

const optionalImportSpecifier = (path: string): string => {
  const specifier = posix.relative(posix.dirname(path), optionalAdapterPath)
  return specifier.startsWith('.') ? specifier : `./${specifier}`
}

const optionalImportLine = (path: string): string =>
  `import { ${optionalWrapperName} } from '${optionalImportSpecifier(path)}'\n\n`

/**
 * Wrap `.optional()` receivers in the adapter. Whitespace before `.optional()` moves inside the
 * wrapper's parentheses, which keeps the reverse generator lossless.
 */
const rewriteOptionalCalls = (path: string, contents: string): string => {
  const source = ts.createSourceFile('schema.ts', contents, ts.ScriptTarget.Latest, true)
  const edits: { start: number; end: number; text: string }[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'optional' &&
      node.arguments.length === 0
    ) {
      const inner = node.expression.expression
      const call = /^(\s*)\.optional\(\)$/.exec(contents.slice(inner.end, node.end))
      if (!call) fail(path, `cannot convert ${contents.slice(inner.end, node.end)} losslessly`)
      // Zod 4 evaluates defaults inside an outer optional; preserve the source's Zod 3 contract.
      edits.push({
        start: inner.getStart(source),
        end: inner.getStart(source),
        text: `${optionalWrapperName}(`,
      })
      edits.push({ start: inner.end, end: node.end, text: `${call[1]})` })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (edits.length === 0) return contents
  let next = contents
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end)
  }
  return `${optionalImportLine(path)}${next}`
}

/** Convert one Zod 3 alphalib file into its Zod 4 source form. */
export function forwardFile(path: string, contents: string): string {
  assertForwardInput(path, contents)
  const patches = [...(regionPatches[path] ?? []), zodV3ImportPatch]
  const regions: { id: string; hunk: Hunk; patch: RegionPatch }[] = []
  for (const patch of patches) {
    if (patch === zodV3ImportPatch && !contents.includes("from 'zod/v3'")) continue
    for (const hunk of patch.find(path, contents)) regions.push({ id: patch.id, hunk, patch })
  }
  regions.sort((a, b) => a.hunk.start - b.hunk.start)
  for (let index = 1; index < regions.length; index += 1) {
    const previous = regions[index - 1]
    const current = regions[index]
    if (previous && current && current.hunk.start < previous.hunk.end) {
      fail(path, `regions ${previous.id} and ${current.id} overlap`)
    }
  }

  // Sentinels let the textual and syntax rewrites run over the whole file, as before, while
  // remembering which lines each region replaces.
  let sentinelled = ''
  let cursor = 0
  for (const [index, { hunk }] of regions.entries()) {
    if (!contents.slice(hunk.start, hunk.end).endsWith('\n')) fail(path, 'region must end a line')
    sentinelled += contents.slice(cursor, hunk.start)
    sentinelled += `//@@zod-region-${index}-begin\n${contents.slice(hunk.start, hunk.end)}`
    sentinelled += `//@@zod-region-${index}-end\n`
    cursor = hunk.end
  }
  sentinelled += contents.slice(cursor)

  const rewritten = rewritePassthroughCalls(
    rewriteRecordCalls(path, rewriteZodImports(sentinelled)),
  )
  const patched = replaceSentinelRegions(path, rewritten, (index, hunk) => {
    const region = regions[index]
    if (!region) return fail(path, `unknown region ${index}`)
    return `//@@zod-region-${index}-begin\n${region.patch.toV4(path, hunk)}//@@zod-region-${index}-end\n`
  })
  const optional = rewriteOptionalCalls(path, patched)
  return replaceSentinelRegions(path, optional, (index, hunk) => {
    const region = regions[index]
    if (!region) return fail(path, `unknown region ${index}`)
    const v3 = splitLines(contents.slice(region.hunk.start, region.hunk.end)).map(commentLine)
    return [
      v4RegionBegin(region.id),
      ...splitLines(hunk),
      v4RegionEnd(region.id),
      v3RegionBegin(region.id),
      ...v3,
      v3RegionEnd(region.id),
      '',
    ].join('\n')
  })
}

const replaceSentinelRegions = (
  path: string,
  contents: string,
  replace: (index: number, hunk: string) => string,
): string => {
  const lines = contents.split('\n')
  let output = ''
  let open: { index: number; body: string[] } | undefined
  for (const [lineIndex, line] of lines.entries()) {
    const isLast = lineIndex === lines.length - 1
    const sentinel = sentinelPattern.exec(line)
    if (!sentinel) {
      if (open) open.body.push(line)
      else output += isLast ? line : `${line}\n`
      continue
    }
    const index = Number(sentinel[1])
    if (sentinel[2] === 'begin') {
      if (open) fail(path, 'nested region sentinels')
      open = { index, body: [] }
      continue
    }
    if (!open || open.index !== index) fail(path, 'unbalanced region sentinels')
    output += replace(index, open.body.map((bodyLine) => `${bodyLine}\n`).join(''))
    open = undefined
  }
  if (open) fail(path, 'unterminated region sentinel')
  return output
}

/**
 * Convert the schema subset of a Zod 3 alphalib tree into the Zod 4 source tree, including the
 * optional-semantics adapter.
 */
export function forwardTree(v3Tree: SourceTree, adapterSource: string): SourceTree {
  const result: SourceTree = new Map()
  for (const [path, contents] of selectSchemaSources(v3Tree)) {
    result.set(path, forwardFile(path, contents))
  }
  if (result.has(optionalAdapterPath)) {
    throw new Error(`${optionalAdapterPath} is reserved for the Zod 4 optional adapter`)
  }
  result.set(optionalAdapterPath, adapterSource)
  return new Map([...result].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

// ---------------------------------------------------------------------------------------------
// Zod 4 source -> Zod 3 export and Zod 4 export
// ---------------------------------------------------------------------------------------------

interface ParsedRegions {
  /** The file with Zod 4-only regions removed and each Zod 3-only region as a placeholder line. */
  text: string
  v3Regions: string[]
  v4Text: string
  ids: Set<string>
}

const parseRegions = (path: string, contents: string): ParsedRegions => {
  const lines = contents.split('\n')
  let text = ''
  let v4Text = ''
  const v3Regions: string[] = []
  const ids = new Set<string>()
  let state: { kind: 'v3' | 'v4'; id: string; body: string[] } | undefined
  let expectV3For: string | undefined
  for (const [lineIndex, line] of lines.entries()) {
    const newline = lineIndex === lines.length - 1 ? '' : '\n'
    const marker = regionMarkerPattern.exec(line)
    if (!marker) {
      if (expectV3For)
        fail(path, `${expectV3For}: Zod 4 region must be followed by its Zod 3 region`)
      if (state?.kind === 'v3') state.body.push(uncommentLine(path, line))
      else if (state?.kind === 'v4') v4Text += `${line}${newline}`
      else {
        text += `${line}${newline}`
        v4Text += `${line}${newline}`
      }
      continue
    }
    const [, kind, edge, id] = marker
    if (kind !== 'v3' && kind !== 'v4') continue
    if (!id) continue
    if (edge === 'begin') {
      if (state) fail(path, `region ${id} starts inside region ${state.id}`)
      if (kind === 'v3' && expectV3For !== id)
        fail(path, `Zod 3 region ${id} lacks its Zod 4 region`)
      if (kind === 'v4' && expectV3For) fail(path, `${expectV3For}: missing Zod 3 region`)
      expectV3For = undefined
      state = { kind, id, body: [] }
      continue
    }
    if (!state || state.kind !== kind || state.id !== id) fail(path, `unbalanced region end ${id}`)
    if (kind === 'v4') {
      expectV3For = id
    } else {
      text += `//@@zod-region-${v3Regions.length}-begin\n//@@zod-region-${v3Regions.length}-end\n`
      v3Regions.push(state.body.map((bodyLine) => `${bodyLine}\n`).join(''))
      ids.add(id)
    }
    state = undefined
  }
  if (state || expectV3For) fail(path, 'unterminated Zod region')
  for (const patch of regionPatches[path] ?? []) {
    if (!ids.has(patch.id)) fail(path, `missing Zod 3/4 region ${patch.id}`)
  }
  return { text, v3Regions, v4Text, ids }
}

interface Replacement {
  start: number
  end: number
  render: (renderRange: (start: number, end: number) => string) => string
}

/** Apply possibly nested node replacements, rendering inner replacements first. */
const applyReplacements = (contents: string, replacements: Replacement[]): string => {
  const sorted = [...replacements].sort((a, b) => a.start - b.start || b.end - a.end)
  const renderRange = (start: number, end: number, from: number): string => {
    let output = ''
    let cursor = start
    let index = from
    while (index < sorted.length) {
      const replacement = sorted[index]
      if (!replacement || replacement.start >= end) break
      if (replacement.start < cursor) {
        index += 1
        continue
      }
      output += contents.slice(cursor, replacement.start)
      const childFrom = index + 1
      output += replacement.render((childStart, childEnd) =>
        renderRange(childStart, childEnd, childFrom),
      )
      cursor = replacement.end
      index += 1
    }
    return output + contents.slice(cursor, end)
  }
  return renderRange(0, contents.length, 0)
}

const isZodRecordCall = (node: ts.CallExpression): boolean =>
  ts.isPropertyAccessExpression(node.expression) &&
  ts.isIdentifier(node.expression.expression) &&
  node.expression.expression.text === 'z' &&
  node.expression.name.text === 'record'

const isOptionalWrapperCall = (node: ts.CallExpression): boolean =>
  ts.isIdentifier(node.expression) && node.expression.text === optionalWrapperName

const closingParenOf = (path: string, contents: string, node: ts.CallExpression): number => {
  const position = node.end - 1
  if (contents[position] !== ')') fail(path, 'call expression must end with )')
  return position
}

/** Turn wrapper calls back into `.optional()` and two-argument records into Zod 3's form. */
const reverseSyntax = (path: string, contents: string): string => {
  const source = ts.createSourceFile('schema.ts', contents, ts.ScriptTarget.Latest, true)
  const replacements: Replacement[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isOptionalWrapperCall(node)) {
      const [argument, ...rest] = node.arguments
      if (!argument || rest.length > 0) fail(path, `${optionalWrapperName} takes one argument`)
      const close = closingParenOf(path, contents, node)
      const between = contents.slice(argument.end, close)
      const whitespace = /^\s*$/.test(between) ? between : /^,\s*$/.test(between) ? '' : undefined
      if (whitespace === undefined) fail(path, `unexpected ${JSON.stringify(between)} in wrapper`)
      replacements.push({
        start: node.getStart(source),
        end: node.end,
        render: (renderRange) =>
          `${renderRange(argument.getStart(source), argument.end)}${whitespace}.optional()`,
      })
    } else if (ts.isCallExpression(node) && isZodRecordCall(node) && node.arguments.length === 2) {
      const [key, value] = node.arguments
      if (key && value) {
        const open = node.arguments.pos
        const leading = contents.slice(open, key.getStart(source))
        if (leading.startsWith(`${explicitRecordKeyHint} `)) {
          replacements.push({
            start: open,
            end: key.getStart(source),
            render: () => leading.slice(explicitRecordKeyHint.length + 1),
          })
        } else if (key.getText(source) === 'z.string()') {
          replacements.push({
            start: key.getStart(source),
            end: value.getStart(source),
            render: () => '',
          })
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return applyReplacements(contents, replacements)
}

/** Generate the Zod 3 form of one Zod 4 source file. */
export function reverseFile(path: string, contents: string): string {
  const { text, v3Regions } = parseRegions(path, contents)
  let next = text
  const importLine = optionalImportLine(path)
  if (next.startsWith(importLine)) next = next.slice(importLine.length)
  if (new RegExp(`import \\{ ${optionalWrapperName} \\}`).test(next)) {
    fail(path, `the ${optionalWrapperName} import must be the file's first statement`)
  }
  next = reverseSyntax(path, next)
  if (next.includes(optionalWrapperName)) fail(path, `${optionalWrapperName} remains after unwrap`)
  next = next.replace(/\.catchall\(z\.unknown\(\)\)/g, '.passthrough()')
  next = next.replace(/from 'zod\/v4'/g, "from 'zod'")
  return replaceSentinelRegions(path, next, (index) => {
    const region = v3Regions[index]
    if (region === undefined) return fail(path, `unknown Zod 3 region ${index}`)
    return region
  })
}

/** Generate the Zod 3 alphalib tree from the Zod 4 source tree. */
export function reverseTree(v4Tree: SourceTree): SourceTree {
  const result: SourceTree = new Map()
  for (const [path, contents] of v4Tree) {
    if (path === optionalAdapterPath) continue
    result.set(path, reverseFile(path, contents))
  }
  return result
}

/** Remove Zod 3-only regions and layout hints from one Zod 4 source file. */
export function exportV4File(path: string, contents: string): string {
  const { v4Text } = parseRegions(path, contents)
  const next = v4Text
    .replaceAll(`${explicitRecordKeyHint} `, '')
    .replace(/\bz\s*\.record\(/g, 'z.record(')
  if (next.includes(explicitRecordKeyHint)) fail(path, `misplaced ${explicitRecordKeyHint}`)
  const source = ts.createSourceFile('schema.ts', next, ts.ScriptTarget.Latest, true)
  const deletions: Hunk[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isOptionalWrapperCall(node)) {
      const argument = node.arguments[0]
      const close = closingParenOf(path, next, node)
      if (argument && /^\s+$/.test(next.slice(argument.end, close))) {
        deletions.push({ start: argument.end, end: close })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  let output = next
  for (const deletion of deletions.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, deletion.start) + output.slice(deletion.end)
  }
  return output
}

/** Generate the published Zod 4 tree (still in alphalib layout) from the Zod 4 source tree. */
export function exportV4Tree(v4Tree: SourceTree): SourceTree {
  const result: SourceTree = new Map()
  for (const [path, contents] of v4Tree) result.set(path, exportV4File(path, contents))
  return result
}

/** Compare two trees and describe the files that differ. */
export function diffTrees(expected: SourceTree, actual: SourceTree): string[] {
  const differences: string[] = []
  for (const path of new Set([...expected.keys(), ...actual.keys()])) {
    const want = expected.get(path)
    const have = actual.get(path)
    if (want === have) continue
    if (want === undefined) differences.push(`unexpected ${path}`)
    else if (have === undefined) differences.push(`missing ${path}`)
    else differences.push(`differs ${path}`)
  }
  return differences.sort()
}
