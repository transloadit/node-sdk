import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const filePath = fileURLToPath(import.meta.url)
const zodRoot = resolve(dirname(filePath), '..')
const sourceRoot = resolve(zodRoot, 'src/v3')
const destRoot = resolve(zodRoot, 'src/v4')

const collectFiles = async (dir: string, acc: string[] = []): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(full, acc)
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      acc.push(full)
    }
  }
  return acc
}

const rewriteZodImports = (contents: string): string =>
  contents.replace(/from ['"]zod\/v3['"]/g, "from 'zod/v4'")

const rewritePassthroughCalls = (contents: string): string =>
  contents.replace(/\.passthrough\(\)/g, '.catchall(z.unknown())')

const rewriteRecordCalls = (contents: string): string => {
  const marker = 'z.record('
  const normalized = contents.replace(/\bz\s*\.record\(/g, marker)

  const hasTopLevelComma = (source: string): boolean => {
    let depth = 0
    let inString: '"' | "'" | null = null
    let escaped = false

    for (let i = 0; i < source.length; i += 1) {
      const char = source[i]
      if (inString) {
        if (!escaped && char === inString) {
          inString = null
        }
        escaped = char === '\\' && !escaped
        continue
      }
      if (char === '"' || char === "'") {
        inString = char
        continue
      }
      if (char === '(') depth += 1
      if (char === ')') depth -= 1
      if (char === ',' && depth === 0) return true
    }
    return false
  }

  const transform = (source: string): string => {
    let output = ''
    let index = 0

    while (index < source.length) {
      if (!source.startsWith(marker, index)) {
        output += source[index]
        index += 1
        continue
      }

      const argsStart = index + marker.length
      let depth = 1
      let position = argsStart
      let inString: '"' | "'" | null = null
      let escaped = false

      while (position < source.length) {
        const char = source[position]
        if (inString) {
          if (!escaped && char === inString) {
            inString = null
          }
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

      const argsEnd = position
      const rawArgs = source.slice(argsStart, argsEnd)
      const rewrittenArgs = transform(rawArgs)
      const nextArgs = hasTopLevelComma(rewrittenArgs)
        ? rewrittenArgs
        : `z.string(), ${rewrittenArgs.trim()}`
      output += `${marker}${nextArgs})`
      index = argsEnd + 1
    }

    return output
  }

  return transform(normalized)
}

const patchInterpolatableHelpers = (contents: string): string => {
  const start = contents.indexOf('type InterpolatableTuple')
  const marker = '/**\n * The robot keys specified in this array can’t be interpolated.'
  const end = contents.indexOf(marker)
  if (start === -1 || end === -1) {
    return contents
  }

  const replacement = `type InterpolatableTuple<Schemas extends readonly z.core.SomeType[]> = Schemas extends readonly [\n` +
    `  infer Head extends z.core.SomeType,\n` +
    `  ...infer Rest extends z.core.SomeType[],\n` +
    `]\n` +
    `  ? [InterpolatableSchema<Head>, ...InterpolatableTuple<Rest>]\n` +
    `  : Schemas\n\n` +
    `type InterpolatableSchema<Schema extends z.core.SomeType> = Schema extends z.ZodString\n` +
    `  ? Schema\n` +
    `  : Schema extends\n` +
    `        | z.ZodBoolean\n` +
    `        | z.ZodEnum<infer _Enum>\n` +
    `        | z.ZodLiteral<infer _Literal>\n` +
    `        | z.ZodNumber\n` +
    `        | z.ZodPipe<z.ZodTypeAny, z.ZodTypeAny>\n` +
    `    ? z.ZodUnion<[z.ZodString, Schema]>\n` +
    `    : Schema extends z.ZodArray<infer T>\n` +
    `      ? z.ZodUnion<[z.ZodString, z.ZodArray<InterpolatableSchema<T>>]>\n` +
    `      : Schema extends z.ZodDefault<infer T>\n` +
    `        ? z.ZodDefault<InterpolatableSchema<T>>\n` +
    `        : Schema extends z.ZodNullable<infer T>\n` +
    `          ? z.ZodNullable<InterpolatableSchema<T>>\n` +
    `          : Schema extends z.ZodOptional<infer T>\n` +
    `            ? z.ZodOptional<InterpolatableSchema<T>>\n` +
    `            : Schema extends z.ZodRecord<infer Key, infer Value>\n` +
    `              ? z.ZodRecord<Key, InterpolatableSchema<Value>>\n` +
    `              : Schema extends z.ZodTuple<infer T, infer Rest>\n` +
    `                ? z.ZodUnion<[\n` +
    `                    z.ZodString,\n` +
    `                    z.ZodTuple<\n` +
    `                      InterpolatableTuple<T>,\n` +
    `                      Rest extends z.core.SomeType ? InterpolatableSchema<Rest> : null\n` +
    `                    >,\n` +
    `                  ]>\n` +
    `                : Schema extends z.ZodObject<infer T, infer Config>\n` +
    `                  ? z.ZodUnion<[\n` +
    `                      z.ZodString,\n` +
    `                      z.ZodObject<{ [Key in keyof T]: InterpolatableSchema<T[Key]> }, Config>,\n` +
    `                    ]>\n` +
    `                  : Schema extends z.ZodDiscriminatedUnion<infer _T>\n` +
    `                    ? Schema\n` +
    `                    : Schema extends z.ZodUnion<infer T>\n` +
    `                      ? z.ZodUnion<[z.ZodString, ...InterpolatableTuple<T>]>\n` +
    `                      : Schema\n\n` +
    `const applyArrayChecks = (schema: z.ZodArray<z.ZodTypeAny>, checks: unknown): z.ZodArray<z.ZodTypeAny> => {\n` +
    `  if (!Array.isArray(checks)) return schema\n` +
    `  let next = schema\n` +
    `  for (const check of checks) {\n` +
    `    const def = (check as { _zod?: { def?: { check?: string; minimum?: number; maximum?: number; length?: number } } })?._zod?.def\n` +
    `    if (!def) continue\n` +
    `    if (def.check === 'min_length' && typeof def.minimum === 'number') {\n` +
    `      next = next.min(def.minimum)\n` +
    `    }\n` +
    `    if (def.check === 'max_length' && typeof def.maximum === 'number') {\n` +
    `      next = next.max(def.maximum)\n` +
    `    }\n` +
    `    if (def.check === 'length_equals' && typeof def.length === 'number') {\n` +
    `      next = next.length(def.length)\n` +
    `    }\n` +
    `  }\n` +
    `  return next\n` +
    `}\n\n` +
    `export function interpolateRecursive<Schema extends z.core.SomeType>(\n` +
    `  schema: Schema,\n` +
    `): InterpolatableSchema<Schema> {\n` +
    `  const def = (schema as z.core.SomeType)._zod.def as unknown\n\n` +
    `  switch ((def as { type?: string }).type) {\n` +
    `    case 'boolean':\n` +
    `      return z.union([\n` +
    `        interpolationSchemaFull,\n` +
    `        z\n` +
    `          .union([schema, booleanStringSchema])\n` +
    `          .transform((value) => value === true || value === false),\n` +
    `      ]) as unknown as InterpolatableSchema<Schema>\n` +
    `    case 'array': {\n` +
    `      const arrayDef = def as { element: z.ZodTypeAny; checks?: unknown }\n` +
    `      let replacement = z.array(interpolateRecursive(arrayDef.element))\n` +
    `      replacement = applyArrayChecks(replacement, arrayDef.checks)\n` +
    `      return z.union([interpolationSchemaFull, replacement]) as unknown as InterpolatableSchema<Schema>\n` +
    `    }\n` +
    `    case 'default': {\n` +
    `      const defaultDef = def as { innerType: z.ZodTypeAny; defaultValue: unknown }\n` +
    `      const replacement = interpolateRecursive(defaultDef.innerType).default(defaultDef.defaultValue as never)\n` +
    `      const description = (schema as { description?: string }).description\n` +
    `      return (description ? replacement.describe(description) : replacement) as unknown as InterpolatableSchema<Schema>\n` +
    `    }\n` +
    `    case 'enum':\n` +
    `    case 'literal':\n` +
    `      return z.union([interpolationSchemaFull, schema]) as unknown as InterpolatableSchema<Schema>\n` +
    `    case 'number':\n` +
    `      return z.union([\n` +
    `        z\n` +
    `          .string()\n` +
    `          .regex(/^\\d+(\\.\\d+)?$/)\n` +
    `          .transform((value) => Number(value)),\n` +
    `        interpolationSchemaFull,\n` +
    `        schema,\n` +
    `      ]) as unknown as InterpolatableSchema<Schema>\n` +
    `    case 'nullable': {\n` +
    `      const nullableDef = def as { innerType: z.ZodTypeAny }\n` +
    `      const replacement = interpolateRecursive(nullableDef.innerType).nullable()\n` +
    `      const description = (schema as { description?: string }).description\n` +
    `      return (description ? replacement.describe(description) : replacement) as unknown as InterpolatableSchema<Schema>\n` +
    `    }\n` +
    `    case 'object': {\n` +
    `      const objectDef = def as { shape: Record<string, z.ZodTypeAny> | (() => Record<string, z.ZodTypeAny>); catchall?: z.ZodTypeAny }\n` +
    `      const shape = typeof objectDef.shape === 'function' ? objectDef.shape() : objectDef.shape\n` +
    `      let replacement = z.object(\n` +
    `        Object.fromEntries(\n` +
    `          Object.entries(shape).map(([key, nested]) => [\n` +
    `            key,\n` +
    `            interpolateRecursive(nested as z.ZodTypeAny),\n` +
    `          ]),\n` +
    `        ),\n` +
    `      )\n` +
    `      if (objectDef.catchall) {\n` +
    `        const catchallType = objectDef.catchall._zod.def.type\n` +
    `        if (catchallType === 'never') {\n` +
    `          replacement = replacement.strict()\n` +
    `        } else {\n` +
    `          replacement = replacement.catchall(objectDef.catchall)\n` +
    `        }\n` +
    `      }\n` +
    `      return z.union([interpolationSchemaFull, replacement]) as unknown as InterpolatableSchema<Schema>\n` +
    `    }\n` +
    `    case 'optional': {\n` +
    `      const optionalDef = def as { innerType: z.ZodTypeAny }\n` +
    `      return interpolateRecursive(optionalDef.innerType).optional() as unknown as InterpolatableSchema<Schema>\n` +
    `    }\n` +
    `    case 'record': {\n` +
    `      const recordDef = def as { keyType?: z.ZodTypeAny; valueType: z.ZodTypeAny }\n` +
    `      const keyType = (recordDef.keyType ?? z.string()) as z.core.$ZodRecordKey\n` +
    `      return z.record(keyType, interpolateRecursive(recordDef.valueType)) as unknown as InterpolatableSchema<Schema>\n` +
    `    }\n` +
    `    case 'string':\n` +
    `      return z.union([interpolationSchemaPartial, schema]) as unknown as InterpolatableSchema<Schema>\n` +
    `    case 'tuple': {\n` +
    `      const tupleDef = def as { items: z.ZodTypeAny[]; rest?: z.ZodTypeAny }\n` +
    `      const items = tupleDef.items.map(interpolateRecursive)\n` +
    `      const tuple = items.length === 0 ? z.tuple([]) : z.tuple(items as [z.ZodTypeAny, ...z.ZodTypeAny[]])\n` +
    `      return z.union([\n` +
    `        interpolationSchemaFull,\n` +
    `        tupleDef.rest ? tuple.rest(tupleDef.rest) : tuple,\n` +
    `      ]) as unknown as InterpolatableSchema<Schema>\n` +
    `    }\n` +
    `    case 'union': {\n` +
    `      const unionDef = def as { options: z.ZodTypeAny[]; discriminator?: string }\n` +
    `      if (unionDef.discriminator) {\n` +
    `        return schema as unknown as InterpolatableSchema<Schema>\n` +
    `      }\n` +
    `      return z.union([interpolationSchemaFull, ...unionDef.options.map(interpolateRecursive)]) as unknown as InterpolatableSchema<Schema>\n` +
    `    }\n` +
    `    case 'pipe':\n` +
    `      return z.union([interpolationSchemaFull, schema]) as unknown as InterpolatableSchema<Schema>\n` +
    `    default:\n` +
    `      return schema as unknown as InterpolatableSchema<Schema>\n` +
    `  }\n` +
    `}\n\n`

  return `${contents.slice(0, start)}${replacement}${contents.slice(end)}`
}

const patchInterpolatableRobot = (contents: string): string => {
  const start = contents.indexOf('type InterpolatableRobot')
  const marker = '/**\n * Fields that are shared by all Transloadit robots.'
  const end = contents.indexOf(marker)
  if (start === -1 || end === -1) {
    return contents
  }

  const replacement = `type InterpolatableRobot<Schema extends z.ZodObject> =\n` +
    `  Schema extends z.ZodObject<infer T, infer Config>\n` +
    `    ? z.ZodObject<\n` +
    `        {\n` +
    `          [Key in keyof T]: Key extends (typeof uninterpolatableKeys)[number]\n` +
    `            ? T[Key]\n` +
    `            : InterpolatableSchema<T[Key]>\n` +
    `        },\n` +
    `        Config\n` +
    `      >\n` +
    `    : never\n\n` +
    `export function interpolateRobot<Schema extends z.ZodObject>(\n` +
    `  schema: Schema,\n` +
    `): InterpolatableRobot<Schema> {\n` +
    `  const def = (schema as z.core.SomeType)._zod.def as unknown\n` +
    `  const shape = typeof (def as { shape: Record<string, z.ZodTypeAny> | (() => Record<string, z.ZodTypeAny>) }).shape === 'function'\n` +
    `    ? (def as { shape: () => Record<string, z.ZodTypeAny> }).shape()\n` +
    `    : (def as { shape: Record<string, z.ZodTypeAny> }).shape\n` +
    `  return z\n` +
    `    .object(\n` +
    `      Object.fromEntries(\n` +
    `        Object.entries(shape).map(([key, nested]) => [\n` +
    `          key,\n` +
    `          (uninterpolatableKeys as readonly string[]).includes(key)\n` +
    `            ? nested\n` +
    `            : interpolateRecursive(nested as z.ZodTypeAny),\n` +
    `        ]),\n` +
    `      ),\n` +
    `    )\n` +
    `    .strict() as InterpolatableRobot<Schema>\n` +
    `}\n\n`

  return `${contents.slice(0, start)}${replacement}${contents.slice(end)}`
}

const patchAiChatSchema = (contents: string): string =>
  contents
    .replace(
      'const jsonValueSchema: z.ZodType =',
      'const jsonValueSchema: z.ZodType<any> =',
    )
    .replace('result: z.unknown(),', 'result: z.unknown().optional(),')

const patchFile = (filePath: string, contents: string): string => {
  let next = contents
  if (filePath.endsWith(`${sep}robots${sep}_instructions-primitives.ts`)) {
    next = patchInterpolatableHelpers(next)
    next = patchInterpolatableRobot(next)
  }
  if (filePath.endsWith(`${sep}robots${sep}ai-chat.ts`)) {
    next = patchAiChatSchema(next)
  }
  return next
}

const main = async () => {
  await rm(destRoot, { recursive: true, force: true })
  await mkdir(destRoot, { recursive: true })
  await cp(sourceRoot, destRoot, { recursive: true })

  const files = await collectFiles(destRoot)
  for (const file of files) {
    const contents = await readFile(file, 'utf8')
    const patched = patchFile(
      file,
      rewritePassthroughCalls(rewriteRecordCalls(rewriteZodImports(contents))),
    )
    if (patched !== contents) {
      await writeFile(file, patched, 'utf8')
    }
  }
}

await main()
