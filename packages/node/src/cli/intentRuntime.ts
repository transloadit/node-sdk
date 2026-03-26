import type { z } from 'zod'

export type IntentFieldKind = 'auto' | 'boolean' | 'number' | 'string'

export interface IntentFieldSpec {
  kind: IntentFieldKind
  name: string
}

export function coerceIntentFieldValue(
  kind: IntentFieldKind,
  raw: string,
  fieldSchema?: z.ZodTypeAny,
): boolean | number | string {
  if (kind === 'auto') {
    if (fieldSchema == null) {
      return raw
    }

    const candidates: unknown[] = [raw]

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
    const fieldSchema = schema.shape[fieldSpec.name]
    input[fieldSpec.name] = coerceIntentFieldValue(fieldSpec.kind, rawValue, fieldSchema)
  }

  const parsed = schema.parse(input) as Record<string, unknown>
  const normalizedInput: Record<string, unknown> = { ...fixedValues }

  for (const fieldSpec of fieldSpecs) {
    const rawValue = rawValues[fieldSpec.name]
    if (rawValue == null) continue
    normalizedInput[fieldSpec.name] = parsed[fieldSpec.name]
  }

  return normalizedInput as z.input<TSchema>
}
