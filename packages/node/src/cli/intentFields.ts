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

export function inferIntentFieldKind(schema: unknown): IntentFieldKind {
  if (schema instanceof ZodEffects) {
    return inferIntentFieldKind(schema._def.schema)
  }

  if (schema instanceof ZodString || schema instanceof ZodEnum) {
    return 'string'
  }

  if (schema instanceof ZodNumber) {
    return 'number'
  }

  if (schema instanceof ZodBoolean) {
    return 'boolean'
  }

  if (schema instanceof ZodLiteral) {
    if (typeof schema.value === 'number') return 'number'
    if (typeof schema.value === 'boolean') return 'boolean'
    return 'string'
  }

  if (schema instanceof ZodArray) {
    const elementKind = inferIntentFieldKind(schema.element)
    if (elementKind === 'string') {
      return 'string-array'
    }

    return 'json'
  }

  if (schema instanceof ZodObject) {
    return 'json'
  }

  if (schema instanceof ZodUnion) {
    const optionKinds = Array.from(
      new Set(schema._def.options.map((option: unknown) => inferIntentFieldKind(option))),
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
  if (schema instanceof ZodEffects) {
    return inferSchemaExampleValue(schema._def.schema)
  }

  if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
    return inferSchemaExampleValue(schema.unwrap())
  }

  if (schema instanceof ZodDefault) {
    return inferSchemaExampleValue(schema.removeDefault())
  }

  if (schema instanceof ZodLiteral) {
    return String(schema.value)
  }

  if (schema instanceof ZodEnum) {
    return schema.options[0] ?? null
  }

  if (schema instanceof ZodUnion) {
    for (const option of schema._def.options) {
      const exampleValue = inferSchemaExampleValue(option)
      if (exampleValue != null) {
        return exampleValue
      }
    }
  }

  return null
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
    if (Array.isArray(raw)) {
      if (raw.length === 1 && typeof raw[0] === 'string') {
        const trimmed = raw[0].trim()
        if (trimmed.startsWith('[')) {
          let parsedJson: unknown
          try {
            parsedJson = JSON.parse(trimmed)
          } catch {
            throw new Error(`Expected valid JSON but received "${raw[0]}"`)
          }

          if (
            !Array.isArray(parsedJson) ||
            !parsedJson.every((value) => typeof value === 'string')
          ) {
            throw new Error(`Expected an array of strings but received "${raw[0]}"`)
          }

          return parsedJson
        }
      }

      return raw.map((value) => String(value))
    }

    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed.startsWith('[')) {
        let parsedJson: unknown
        try {
          parsedJson = JSON.parse(trimmed)
        } catch {
          throw new Error(`Expected valid JSON but received "${raw}"`)
        }

        if (!Array.isArray(parsedJson) || !parsedJson.every((value) => typeof value === 'string')) {
          throw new Error(`Expected an array of strings but received "${raw}"`)
        }

        return parsedJson
      }
    }

    return [String(raw)]
  }

  return raw
}
