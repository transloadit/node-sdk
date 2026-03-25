import type { z } from 'zod'

export type IntentFieldKind = 'boolean' | 'number' | 'string'

export interface IntentFieldSpec {
  kind: IntentFieldKind
  name: string
}

export function coerceIntentFieldValue(
  kind: IntentFieldKind,
  raw: string,
): boolean | number | string {
  if (kind === 'number') {
    const value = Number(raw)
    if (Number.isNaN(value)) {
      throw new Error(`Expected a number but received "${raw}"`)
    }
    return value
  }

  if (kind === 'boolean') {
    if (raw === 'true') return true
    if (raw === 'false') return false
    throw new Error(`Expected "true" or "false" but received "${raw}"`)
  }

  return raw
}

export function parseIntentStep<TSchema extends z.AnyZodObject>({
  fieldSpecs,
  fixedValues,
  rawValues,
  schema,
}: {
  fieldSpecs: readonly IntentFieldSpec[]
  fixedValues: Record<string, unknown>
  rawValues: Record<string, string | undefined>
  schema: TSchema
}): z.input<TSchema> {
  const input: Record<string, unknown> = { ...fixedValues }

  for (const fieldSpec of fieldSpecs) {
    const rawValue = rawValues[fieldSpec.name]
    if (rawValue == null) continue
    input[fieldSpec.name] = coerceIntentFieldValue(fieldSpec.kind, rawValue)
  }

  schema.parse(input)

  const normalizedInput: Record<string, unknown> = { ...fixedValues }
  const shape = schema.shape as Record<string, z.ZodTypeAny>

  for (const fieldSpec of fieldSpecs) {
    const rawValue = rawValues[fieldSpec.name]
    if (rawValue == null) continue

    const fieldSchema = shape[fieldSpec.name]
    if (fieldSchema == null) {
      throw new Error(`Missing schema definition for intent field "${fieldSpec.name}"`)
    }

    normalizedInput[fieldSpec.name] = fieldSchema.parse(input[fieldSpec.name])
  }

  return normalizedInput as z.input<TSchema>
}
