import type { z } from 'zod'
import {
  ZodArray,
  ZodBoolean,
  ZodEffects,
  ZodEnum,
  ZodLiteral,
  ZodNumber,
  ZodObject,
  ZodString,
  ZodUnion,
} from 'zod'

export type IntentFieldKind = 'auto' | 'boolean' | 'json' | 'number' | 'string'

export interface IntentFieldSpec {
  kind: IntentFieldKind
  name: string
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

  if (schema instanceof ZodArray || schema instanceof ZodObject) {
    return 'json'
  }

  if (schema instanceof ZodUnion) {
    const optionKinds = Array.from(
      new Set(schema._def.options.map((option: unknown) => inferIntentFieldKind(option))),
    ) as IntentFieldKind[]
    if (optionKinds.length === 1) {
      const [kind] = optionKinds
      if (kind != null) return kind
    }
    return 'auto'
  }

  throw new Error('Unsupported schema type')
}

export function coerceIntentFieldValue(
  kind: IntentFieldKind,
  raw: string,
  fieldSchema?: z.ZodTypeAny,
): unknown {
  if (kind === 'auto') {
    if (fieldSchema == null) {
      return raw
    }

    const trimmed = raw.trim()
    const candidates: unknown[] = []

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        candidates.push(JSON.parse(trimmed))
      } catch {}
    }

    candidates.push(raw)

    if (trimmed !== '' && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      try {
        candidates.push(JSON.parse(trimmed))
      } catch {}
    }

    if (raw === 'true' || raw === 'false') {
      candidates.push(raw === 'true')
    }

    const numericValue = Number(raw)
    if (raw.trim() !== '' && !Number.isNaN(numericValue)) {
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
    if (raw === 'true') return true
    if (raw === 'false') return false
    throw new Error(`Expected "true" or "false" but received "${raw}"`)
  }

  return raw
}
