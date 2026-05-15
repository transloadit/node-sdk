import { parseArgs } from 'node:util'
import type { ZodRawShape, ZodTypeAny, z } from 'zod'

type ZodObjectSchema = z.ZodObject<ZodRawShape>

export interface ZodCliConfig<Schema extends ZodObjectSchema> {
  aliases?: Partial<Record<string, Extract<keyof z.input<Schema>, string>>>
  argv?: string[]
  description?: string
  examples?: string[]
  name: string
  schema: Schema
}

export type ZodCliParseResult<Schema extends ZodObjectSchema> =
  | {
      data: z.infer<Schema>
      helpRequested: false
      helpText: null
    }
  | {
      data: null
      helpRequested: true
      helpText: string
    }

interface UnwrappedSchemaMeta {
  defaultValue?: unknown
  description?: string
  isOptional: boolean
  schema: ZodTypeAny
}

interface OptionMeta {
  aliases: string[]
  defaultValue?: unknown
  description?: string
  isArray: boolean
  isBoolean: boolean
  isOptional: boolean
  key: string
  longName: string
  valueLabel: string
}

function getTypeName(schema: ZodTypeAny): string {
  return (schema._def as { typeName?: string }).typeName ?? 'unknown'
}

function camelToKebab(value: string): string {
  return value.replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function kebabToCamel(value: string): string {
  return value.replaceAll(/-([a-z0-9])/g, (_, chr: string) => chr.toUpperCase())
}

function unwrapSchema(schema: ZodTypeAny): UnwrappedSchemaMeta {
  let current = schema
  let isOptional = false
  let defaultValue: unknown
  let description = schema.description

  while (true) {
    if (getTypeName(current) === 'ZodDefault') {
      isOptional = true
      defaultValue ??= (current._def as { defaultValue: () => unknown }).defaultValue()
      description ??= current.description
      current = (current._def as { innerType: ZodTypeAny }).innerType
      continue
    }

    if (['ZodOptional', 'ZodNullable'].includes(getTypeName(current))) {
      isOptional = true
      description ??= current.description
      current = (current._def as { innerType: ZodTypeAny }).innerType
      continue
    }

    if (getTypeName(current) === 'ZodEffects') {
      description ??= current.description
      current = (current._def as { schema: ZodTypeAny }).schema
      continue
    }

    if (getTypeName(current) === 'ZodCatch') {
      isOptional = true
      description ??= current.description
      current = (current._def as { innerType: ZodTypeAny }).innerType
      continue
    }

    break
  }

  return {
    defaultValue,
    description,
    isOptional,
    schema: current,
  }
}

function booleanFromCli(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false
  }
  throw new Error(`invalid boolean value "${value}"`)
}

function inferValueLabel(schema: ZodTypeAny): string {
  if (getTypeName(schema) === 'ZodEnum') {
    return ((schema._def as { values: string[] }).values ?? []).join('|')
  }

  if (getTypeName(schema) === 'ZodLiteral') {
    return String((schema._def as { value: unknown }).value)
  }

  if (getTypeName(schema) === 'ZodNumber') {
    return 'number'
  }

  if (getTypeName(schema) === 'ZodBoolean') {
    return 'boolean'
  }

  if (getTypeName(schema) === 'ZodString') {
    return 'string'
  }

  return 'value'
}

function buildOptionMeta<Schema extends ZodObjectSchema>(
  schema: Schema,
  aliases: ZodCliConfig<Schema>['aliases'],
): Map<string, OptionMeta> {
  const optionMeta = new Map<string, OptionMeta>()
  const aliasLookup = new Map<string, string[]>()

  for (const [alias, key] of Object.entries(aliases ?? {})) {
    if (!aliasLookup.has(String(key))) {
      aliasLookup.set(String(key), [])
    }
    aliasLookup.get(String(key))?.push(alias)
  }

  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    const unwrapped = unwrapSchema(fieldSchema)
    const baseSchema = unwrapped.schema
    const isArray = getTypeName(baseSchema) === 'ZodArray'
    const valueSchema = isArray ? (baseSchema._def as { type: ZodTypeAny }).type : baseSchema
    optionMeta.set(key, {
      aliases: aliasLookup.get(key) ?? [],
      defaultValue: unwrapped.defaultValue,
      description: unwrapped.description,
      isArray,
      isBoolean: getTypeName(valueSchema) === 'ZodBoolean',
      isOptional: unwrapped.isOptional,
      key,
      longName: camelToKebab(key),
      valueLabel: inferValueLabel(valueSchema),
    })
  }

  return optionMeta
}

function formatDefaultValue(value: unknown): string {
  if (typeof value === 'string') {
    return `"${value}"`
  }

  return JSON.stringify(value)
}

function buildHelpText<Schema extends ZodObjectSchema>(config: ZodCliConfig<Schema>): string {
  const optionMeta = buildOptionMeta(config.schema, config.aliases)
  const lines = [`Usage: ${config.name} [options]`]

  if (config.description) {
    lines.push('', config.description)
  }

  lines.push('', 'Options:')
  lines.push('  -h, --help  Show this help message')

  for (const meta of optionMeta.values()) {
    const names = [...meta.aliases.map((alias) => `-${alias}`), `--${meta.longName}`]
    const valueSuffix = meta.isBoolean ? '' : ` <${meta.valueLabel}>`
    const qualifiers: string[] = []

    if (meta.isArray) {
      qualifiers.push('repeatable')
    }

    if (!meta.isOptional && meta.defaultValue === undefined) {
      qualifiers.push('required')
    }

    if (meta.defaultValue !== undefined) {
      qualifiers.push(`default: ${formatDefaultValue(meta.defaultValue)}`)
    }

    const details = [meta.description, qualifiers.join(', ')].filter(Boolean).join(' ')
    lines.push(`  ${names.join(', ')}${valueSuffix}${details ? `  ${details}` : ''}`)
  }

  if (config.examples && config.examples.length > 0) {
    lines.push('', 'Examples:')
    for (const example of config.examples) {
      lines.push(`  ${example}`)
    }
  }

  return lines.join('\n')
}

function parseArgv<Schema extends ZodObjectSchema>(
  config: ZodCliConfig<Schema>,
  optionMeta: Map<string, OptionMeta>,
): Record<string, unknown> {
  const options: Record<
    string,
    {
      multiple?: boolean
      short?: string
      type: 'boolean' | 'string'
    }
  > = {
    help: {
      short: 'h',
      type: 'boolean',
    },
  }

  for (const meta of optionMeta.values()) {
    const [shortAlias, ...restAliases] = meta.aliases
    if (restAliases.length > 0) {
      throw new Error(`option "${meta.key}" has multiple short aliases; only one is supported`)
    }
    if (shortAlias && shortAlias.length !== 1) {
      throw new Error(`option "${meta.key}" has invalid short alias "${shortAlias}"`)
    }

    const option: {
      multiple?: boolean
      short?: string
      type: 'boolean' | 'string'
    } = {
      type: meta.isBoolean ? 'boolean' : 'string',
    }
    if (meta.isArray) {
      option.multiple = true
    }
    if (shortAlias) {
      option.short = shortAlias
    }

    options[meta.longName] = option
  }

  const argv = (config.argv ?? process.argv.slice(2)).map((token) => {
    if (!token.startsWith('--') || token.startsWith('--no-')) {
      return token
    }

    const [namePart, explicitValue] = token.slice(2).split(/=(.*)/s, 2)
    if (explicitValue === undefined) {
      return token
    }

    const meta = optionMeta.get(kebabToCamel(namePart))
    if (!meta?.isBoolean) {
      return token
    }

    return booleanFromCli(explicitValue) ? `--${namePart}` : `--no-${namePart}`
  })

  const parsed = parseArgs({
    allowNegative: true,
    allowPositionals: false,
    args: argv,
    options,
    strict: true,
  })

  const values: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed.values)) {
    values[kebabToCamel(key)] = value
  }

  return values
}

function formatZodError(error: z.ZodError): string {
  return error.errors
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'value'
      return `${path}: ${issue.message}`
    })
    .join('\n')
}

export function parseZodCli<Schema extends ZodObjectSchema>(
  config: ZodCliConfig<Schema>,
): ZodCliParseResult<Schema> {
  const helpText = buildHelpText(config)
  const optionMeta = buildOptionMeta(config.schema, config.aliases)
  const rawValues = parseArgv(config, optionMeta)

  if (rawValues.help === true) {
    return {
      data: null,
      helpRequested: true,
      helpText,
    }
  }

  const parsed = config.schema.safeParse(rawValues)
  if (!parsed.success) {
    throw new Error(`${formatZodError(parsed.error)}\n\n${helpText}`)
  }

  return {
    data: parsed.data,
    helpRequested: false,
    helpText: null,
  }
}

export function renderZodCliHelp<Schema extends ZodObjectSchema>(
  config: ZodCliConfig<Schema>,
): string {
  return buildHelpText(config)
}
