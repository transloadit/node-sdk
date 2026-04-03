import { Option } from 'clipanion'
import * as t from 'typanion'
import type { z } from 'zod'
import {
  ZodArray,
  ZodBoolean,
  ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodLiteral,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodUnion,
} from 'zod'

export type IntentFieldKind = 'auto' | 'boolean' | 'json' | 'number' | 'string' | 'string-array'

export interface IntentFieldSpec {
  kind: IntentFieldKind
  name: string
}

export interface IntentOptionLike extends IntentFieldSpec {
  description?: string
  optionFlags: string
  required?: boolean
}

export function unwrapIntentSchema(input: unknown): { required: boolean; schema: unknown } {
  let schema = input
  let required = true

  while (true) {
    if (schema instanceof ZodEffects) {
      schema = schema._def.schema
      continue
    }

    if (schema instanceof ZodOptional) {
      required = false
      schema = schema.unwrap()
      continue
    }

    if (schema instanceof ZodDefault) {
      required = false
      schema = schema.removeDefault()
      continue
    }

    if (schema instanceof ZodNullable) {
      required = false
      schema = schema.unwrap()
      continue
    }

    return { required, schema }
  }
}

export function inferIntentFieldKind(schema: unknown): IntentFieldKind {
  const unwrappedSchema = unwrapIntentSchema(schema).schema

  if (unwrappedSchema instanceof ZodString || unwrappedSchema instanceof ZodEnum) {
    return 'string'
  }

  if (unwrappedSchema instanceof ZodNumber) {
    return 'number'
  }

  if (unwrappedSchema instanceof ZodBoolean) {
    return 'boolean'
  }

  if (unwrappedSchema instanceof ZodLiteral) {
    if (typeof unwrappedSchema.value === 'number') return 'number'
    if (typeof unwrappedSchema.value === 'boolean') return 'boolean'
    return 'string'
  }

  if (unwrappedSchema instanceof ZodArray) {
    const elementKind = inferIntentFieldKind(unwrappedSchema.element)
    if (elementKind === 'string') {
      return 'string-array'
    }

    return 'json'
  }

  if (unwrappedSchema instanceof ZodObject) {
    return 'json'
  }

  if (unwrappedSchema instanceof ZodUnion) {
    const optionKinds = Array.from(
      new Set(unwrappedSchema._def.options.map((option: unknown) => inferIntentFieldKind(option))),
    ) as IntentFieldKind[]
    if (
      optionKinds.length === 2 &&
      optionKinds.includes('string') &&
      optionKinds.includes('string-array')
    ) {
      return 'string-array'
    }
    if (optionKinds.length === 1) {
      const [kind] = optionKinds
      if (kind != null) return kind
    }
    return 'auto'
  }

  throw new Error('Unsupported schema type')
}

export function createIntentOption(fieldDefinition: IntentOptionLike): unknown {
  const { description, kind, optionFlags, required } = fieldDefinition

  if (kind === 'boolean') {
    return Option.Boolean(optionFlags, {
      description,
      required,
    })
  }

  if (kind === 'number') {
    return Option.String(optionFlags, {
      description,
      required,
      validator: t.isNumber(),
    })
  }

  if (kind === 'string-array') {
    return Option.Array(optionFlags, {
      description,
      required,
    })
  }

  return Option.String(optionFlags, {
    description,
    required,
  })
}

function inferSchemaExampleValue(schema: unknown): string | null {
  const unwrappedSchema = unwrapIntentSchema(schema).schema

  if (unwrappedSchema instanceof ZodLiteral) {
    return String(unwrappedSchema.value)
  }

  if (unwrappedSchema instanceof ZodEnum) {
    return unwrappedSchema.options[0] ?? null
  }

  if (unwrappedSchema instanceof ZodUnion) {
    for (const option of unwrappedSchema._def.options) {
      const exampleValue = inferSchemaExampleValue(option)
      if (exampleValue != null) {
        return exampleValue
      }
    }
  }

  return null
}

export function parseStringArrayValue(raw: unknown): string[] {
  const addNormalizedValues = (source: string[], value: string): void => {
    source.push(
      ...value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    )
  }

  const normalizeJsonArray = (value: string): string[] | null => {
    const trimmed = value.trim()
    if (!trimmed.startsWith('[')) {
      return null
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(trimmed)
    } catch {
      throw new Error(`Expected valid JSON but received "${value}"`)
    }

    if (!Array.isArray(parsedJson) || !parsedJson.every((item) => typeof item === 'string')) {
      throw new Error(`Expected an array of strings but received "${value}"`)
    }

    return parsedJson
  }

  const values = Array.isArray(raw) ? raw : [raw]
  const normalizedValues: string[] = []
  for (const value of values) {
    if (typeof value !== 'string') {
      normalizedValues.push(String(value))
      continue
    }

    const parsedJson = normalizeJsonArray(value)
    if (parsedJson != null) {
      normalizedValues.push(...parsedJson)
      continue
    }

    addNormalizedValues(normalizedValues, value)
  }

  return normalizedValues
}

function pickPreferredExampleValue(name: string, candidates: readonly string[]): string | null {
  if (candidates.length === 0) {
    return null
  }

  if (name === 'format') {
    const preferredFormats = ['pdf', 'zip', 'jpg', 'png', 'mp3']
    for (const preferredFormat of preferredFormats) {
      if (candidates.includes(preferredFormat)) {
        return preferredFormat
      }
    }
  }

  return candidates[0] ?? null
}

export function inferIntentExampleValue({
  kind,
  name,
  schema,
}: {
  kind: IntentFieldKind
  name: string
  schema?: z.ZodTypeAny
}): string {
  if (name === 'prompt') {
    return JSON.stringify('A red bicycle in a studio')
  }

  if (name === 'provider') {
    return 'aws'
  }

  if (name === 'target_language') {
    return 'en-US'
  }

  if (name === 'voice') {
    return 'female-1'
  }

  const schemaExample =
    schema instanceof ZodEnum
      ? pickPreferredExampleValue(name, schema.options)
      : schema instanceof ZodUnion
        ? pickPreferredExampleValue(
            name,
            schema._def.options
              .map((option: unknown) => inferSchemaExampleValue(option))
              .filter((value: string | null): value is string => value != null),
          )
        : schema == null
          ? null
          : inferSchemaExampleValue(schema)
  if (schemaExample != null) {
    return schemaExample
  }

  if (kind === 'boolean') {
    return 'true'
  }

  if (kind === 'number') {
    return '1'
  }

  return 'value'
}

export function coerceIntentFieldValue(
  kind: IntentFieldKind,
  raw: unknown,
  fieldSchema?: z.ZodTypeAny,
): unknown {
  if (kind === 'number' && typeof raw === 'number') {
    return raw
  }

  if (kind === 'boolean' && typeof raw === 'boolean') {
    return raw
  }

  if (kind === 'auto') {
    if (fieldSchema == null) {
      return raw
    }

    const candidates: unknown[] = []

    if (typeof raw !== 'string') {
      candidates.push(raw)
    }

    const trimmed = typeof raw === 'string' ? raw.trim() : ''

    if (typeof raw === 'string' && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
      try {
        candidates.push(JSON.parse(trimmed))
      } catch {}
    }

    candidates.push(raw)

    if (
      typeof raw === 'string' &&
      trimmed !== '' &&
      !trimmed.startsWith('{') &&
      !trimmed.startsWith('[')
    ) {
      try {
        candidates.push(JSON.parse(trimmed))
      } catch {}
    }

    if (raw === 'true' || raw === 'false') {
      candidates.push(raw === 'true')
    }

    const numericValue = Number(raw)
    if ((typeof raw === 'number' || trimmed !== '') && !Number.isNaN(numericValue)) {
      candidates.push(numericValue)
    }

    for (const candidate of candidates) {
      const parsed = fieldSchema.safeParse(candidate)
      if (parsed.success) {
        return parsed.data as boolean | number | string
      }
    }

    return raw
  }

  if (kind === 'number') {
    if (typeof raw !== 'string') {
      throw new Error(`Expected a number but received "${String(raw)}"`)
    }
    if (raw.trim() === '') {
      throw new Error(`Expected a number but received "${raw}"`)
    }
    const value = Number(raw)
    if (Number.isNaN(value)) {
      throw new Error(`Expected a number but received "${raw}"`)
    }
    return value
  }

  if (kind === 'json') {
    if (typeof raw !== 'string') {
      return raw
    }
    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(raw)
    } catch {
      throw new Error(`Expected valid JSON but received "${raw}"`)
    }

    if (fieldSchema == null) {
      return parsedJson
    }

    const parsed = fieldSchema.safeParse(parsedJson)
    if (!parsed.success) {
      throw new Error(parsed.error.message)
    }

    return parsed.data
  }

  if (kind === 'boolean') {
    if (typeof raw !== 'string') {
      throw new Error(`Expected "true" or "false" but received "${String(raw)}"`)
    }
    if (raw === 'true') return true
    if (raw === 'false') return false
    throw new Error(`Expected "true" or "false" but received "${raw}"`)
  }

  if (kind === 'string-array') {
    return parseStringArrayValue(raw)
  }

  return raw
}
