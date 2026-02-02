import type { z } from 'zod'
import { robotsMeta, robotsSchema } from './alphalib/types/robots/_index.ts'

export type RobotListOptions = {
  category?: string
  search?: string
  limit?: number
  cursor?: string
}

export type RobotListItem = {
  name: string
  title?: string
  summary: string
  category?: string
}

export type RobotListResult = {
  robots: RobotListItem[]
  nextCursor?: string
}

export type RobotParamHelp = {
  name: string
  type: string
  description?: string
}

export type RobotHelp = {
  name: string
  summary: string
  requiredParams: RobotParamHelp[]
  optionalParams: RobotParamHelp[]
  examples?: Array<{ description: string; snippet: Record<string, unknown> }>
}

export type RobotHelpOptions = {
  robotName: string
  detailLevel?: 'summary' | 'params' | 'examples'
}

type RobotsMetaMap = typeof robotsMeta
type RobotMeta = RobotsMetaMap[keyof RobotsMetaMap]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getDef = (schema: z.ZodTypeAny): Record<string, unknown> =>
  (schema as unknown as { _def?: Record<string, unknown>; def?: Record<string, unknown> })._def ??
  (schema as unknown as { def?: Record<string, unknown> }).def ??
  {}

const getDefType = (def: Record<string, unknown>): string | undefined =>
  (def.type as string | undefined) ?? (def.typeName as string | undefined)

const robotNameToPath = (name: string): string => {
  const base = name.replace(/Robot$/, '')
  const spaced = base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z0-9])/g, '$1 $2')
  const parts = spaced.split(/\s+/).filter(Boolean)
  return `/${parts.map((part) => part.toLowerCase()).join('/')}`
}

const selectSummary = (meta: RobotMeta): string =>
  meta.purpose_sentence ?? meta.purpose_words ?? meta.purpose_word ?? meta.title ?? meta.name

const resolveRobotPath = (robotName: string): string =>
  robotName.startsWith('/') ? robotName : robotNameToPath(robotName)

const unwrapSchema = (schema: z.ZodTypeAny): { base: z.ZodTypeAny; optional: boolean } => {
  let base = schema
  let optional = typeof base.isOptional === 'function' ? base.isOptional() : false

  while (true) {
    const def = getDef(base)
    const defType = getDefType(def)
    if (
      defType === 'optional' ||
      defType === 'default' ||
      defType === 'nullable' ||
      defType === 'catch' ||
      defType === 'ZodOptional' ||
      defType === 'ZodDefault' ||
      defType === 'ZodNullable' ||
      defType === 'ZodCatch'
    ) {
      const inner = def.innerType as z.ZodTypeAny | undefined
      if (inner) {
        base = inner
        if (defType !== 'nullable' && defType !== 'ZodNullable') {
          optional = true
        }
        continue
      }
    }
    break
  }

  return { base, optional }
}

const describeSchemaType = (schema: z.ZodTypeAny): string => {
  const { base } = unwrapSchema(schema)
  const def = getDef(base)
  const defType = getDefType(def)

  switch (defType) {
    case 'string':
    case 'ZodString':
      return 'string'
    case 'number':
    case 'ZodNumber':
      return 'number'
    case 'boolean':
    case 'ZodBoolean':
      return 'boolean'
    case 'bigint':
    case 'ZodBigInt':
      return 'bigint'
    case 'literal':
    case 'ZodLiteral': {
      const value = (def.values as unknown[] | undefined)?.[0] ?? def.value
      return value === undefined ? 'literal' : JSON.stringify(value)
    }
    case 'enum':
    case 'ZodEnum': {
      const values = Array.isArray(def.values) ? def.values : []
      return values.length ? `enum(${values.join(' | ')})` : 'enum'
    }
    case 'array':
    case 'ZodArray': {
      const element = def.element as z.ZodTypeAny | undefined
      const inner = element ? describeSchemaType(element) : 'unknown'
      return `array<${inner}>`
    }
    case 'object':
    case 'ZodObject':
      return 'object'
    case 'record':
    case 'ZodRecord':
      return 'record'
    case 'union':
    case 'ZodUnion': {
      const options = Array.isArray(def.options) ? def.options : []
      const rendered = options
        .map((option) => describeSchemaType(option as z.ZodTypeAny))
        .join(' | ')
      return rendered ? `union<${rendered}>` : 'union'
    }
    case 'ZodDiscriminatedUnion':
      return 'object'
    default:
      return defType ?? 'unknown'
  }
}

const getParamDescription = (schema: z.ZodTypeAny): string | undefined => {
  if (schema.description?.trim()) {
    return schema.description.trim()
  }
  const inner = unwrapSchema(schema).base
  return inner.description?.trim()
}

const getShape = (schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> => {
  const { base } = unwrapSchema(schema)
  const def = getDef(base)
  const shape = def.shape as
    | Record<string, z.ZodTypeAny>
    | (() => Record<string, z.ZodTypeAny>)
    | undefined
  if (typeof shape === 'function') {
    return shape()
  }
  return shape ?? {}
}

const getRobotParams = (
  schema: z.ZodTypeAny,
): { required: RobotParamHelp[]; optional: RobotParamHelp[] } => {
  const shape = getShape(schema)
  const required: RobotParamHelp[] = []
  const optional: RobotParamHelp[] = []

  for (const [key, value] of Object.entries(shape)) {
    if (key === 'robot') continue
    const { optional: isOptional } = unwrapSchema(value)
    const param: RobotParamHelp = {
      name: key,
      type: describeSchemaType(value),
      description: getParamDescription(value),
    }

    if (isOptional) {
      optional.push(param)
    } else {
      required.push(param)
    }
  }

  return { required, optional }
}

const getRobotsMetaIndex = (): {
  byName: Map<string, RobotMeta>
  byPath: Map<string, RobotMeta>
} => {
  const byName = new Map<string, RobotMeta>()
  const byPath = new Map<string, RobotMeta>()

  for (const meta of Object.values(robotsMeta)) {
    byName.set(meta.name, meta)
    byPath.set(robotNameToPath(meta.name), meta)
  }

  return { byName, byPath }
}

const getRobotSchemaIndex = (): Map<string, z.ZodTypeAny> => {
  const index = new Map<string, z.ZodTypeAny>()
  for (const option of robotsSchema.options) {
    const shape = getShape(option)
    const robotSchema = shape.robot
    if (!robotSchema) continue
    const robotDef = getDef(robotSchema)
    const robotLiteral = (robotDef.values as unknown[] | undefined)?.[0] ?? robotDef.value
    if (typeof robotLiteral === 'string') {
      index.set(robotLiteral, option)
    }
  }
  return index
}

let cachedMetaIndex: ReturnType<typeof getRobotsMetaIndex> | null = null
let cachedSchemaIndex: ReturnType<typeof getRobotSchemaIndex> | null = null

const getMetaIndex = (): ReturnType<typeof getRobotsMetaIndex> => {
  if (!cachedMetaIndex) {
    cachedMetaIndex = getRobotsMetaIndex()
  }
  return cachedMetaIndex
}

const getSchemaIndex = (): ReturnType<typeof getRobotSchemaIndex> => {
  if (!cachedSchemaIndex) {
    cachedSchemaIndex = getRobotSchemaIndex()
  }
  return cachedSchemaIndex
}

export const listRobots = (options: RobotListOptions = {}): RobotListResult => {
  const normalizedSearch = options.search?.toLowerCase()
  const normalizedCategory = options.category?.toLowerCase()
  const { byPath } = getMetaIndex()

  const allRobots: RobotListItem[] = Array.from(byPath.entries()).map(([path, meta]) => ({
    name: path,
    title: meta.title,
    summary: selectSummary(meta),
    category: meta.service_slug,
  }))

  const filtered = allRobots
    .filter((robot) => {
      if (normalizedCategory && robot.category?.toLowerCase() !== normalizedCategory) {
        return false
      }
      if (!normalizedSearch) return true
      const haystack = `${robot.name} ${robot.title ?? ''} ${robot.summary}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const start = options.cursor ? Number.parseInt(options.cursor, 10) : 0
  const safeStart = Number.isFinite(start) && start > 0 ? start : 0
  const safeLimit = options.limit && options.limit > 0 ? options.limit : 20
  const page = filtered.slice(safeStart, safeStart + safeLimit)
  const nextCursor =
    safeStart + safeLimit < filtered.length ? String(safeStart + safeLimit) : undefined

  return {
    robots: page,
    nextCursor,
  }
}

export const getRobotHelp = (options: RobotHelpOptions): RobotHelp => {
  const detailLevel = options.detailLevel ?? 'summary'
  const { byPath, byName } = getMetaIndex()
  const schemaIndex = getSchemaIndex()

  const path = resolveRobotPath(options.robotName)
  const meta = byPath.get(path) ?? byName.get(options.robotName) ?? null
  const summary = meta ? selectSummary(meta) : `Robot ${path}`
  const schema = schemaIndex.get(path)
  const params = schema ? getRobotParams(schema) : { required: [], optional: [] }

  const help: RobotHelp = {
    name: path,
    summary,
    requiredParams: detailLevel === 'params' ? params.required : [],
    optionalParams: detailLevel === 'params' ? params.optional : [],
  }

  if (detailLevel === 'examples' && meta?.example_code) {
    const snippet = isRecord(meta.example_code) ? meta.example_code : {}
    help.examples = [
      {
        description: meta.example_code_description ?? 'Example',
        snippet,
      },
    ]
  }

  return help
}
