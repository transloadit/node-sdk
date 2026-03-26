import { basename } from 'node:path'
import type { z } from 'zod'

import { prepareInputFiles } from '../inputFiles.ts'

export type IntentFieldKind = 'auto' | 'boolean' | 'number' | 'string'

export interface IntentFieldSpec {
  kind: IntentFieldKind
  name: string
}

export interface PreparedIntentInputs {
  cleanup: Array<() => Promise<void>>
  hasTransientInputs: boolean
  inputs: string[]
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeBase64Value(value: string): string {
  const trimmed = value.trim()
  const marker = ';base64,'
  const markerIndex = trimmed.indexOf(marker)
  if (!trimmed.startsWith('data:') || markerIndex === -1) {
    return trimmed
  }

  return trimmed.slice(markerIndex + marker.length)
}

export async function prepareIntentInputs({
  inputBase64Values,
  inputValues,
}: {
  inputBase64Values: string[]
  inputValues: string[]
}): Promise<PreparedIntentInputs> {
  const preparedOrder: string[] = []
  const syntheticInputs: Array<
    | {
        base64: string
        field: string
        filename: string
        kind: 'base64'
      }
    | {
        field: string
        kind: 'url'
        url: string
      }
  > = []

  for (const value of inputValues) {
    if (!isHttpUrl(value)) {
      preparedOrder.push(value)
      continue
    }

    const field = `input_url_${syntheticInputs.length + 1}`
    syntheticInputs.push({
      kind: 'url',
      field,
      url: value,
    })
    preparedOrder.push(field)
  }

  for (const [index, value] of inputBase64Values.entries()) {
    const field = `input_base64_${index + 1}`
    const filename = `input-base64-${index + 1}.bin`
    syntheticInputs.push({
      kind: 'base64',
      field,
      filename,
      base64: normalizeBase64Value(value),
    })
    preparedOrder.push(field)
  }

  if (syntheticInputs.length === 0) {
    return {
      cleanup: [],
      hasTransientInputs: false,
      inputs: preparedOrder,
    }
  }

  const prepared = await prepareInputFiles({
    inputFiles: syntheticInputs.map((input) => {
      if (input.kind === 'url') {
        return {
          kind: 'url' as const,
          field: input.field,
          url: input.url,
          filename: basename(new URL(input.url).pathname) || undefined,
        }
      }

      return {
        kind: 'base64' as const,
        field: input.field,
        base64: input.base64,
        filename: input.filename,
      }
    }),
    base64Strategy: 'tempfile',
    urlStrategy: 'download',
  })

  const inputs = preparedOrder.map((value) => prepared.files[value] ?? value)

  return {
    cleanup: prepared.cleanup,
    hasTransientInputs: true,
    inputs,
  }
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
