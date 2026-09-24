import type { z } from 'zod'

export interface ZodCodePointLengthOptions {
  readonly max?: number
  readonly min?: number
}

/** ECMAScript whitespace for the runtime regular expressions in shared Robot schemas. */
export const ecmaWhitespaceCharacterClass = String.raw`[\s]`

/** Apply the Robot's output transform using the public Zod API. */
export function zodInputPreservingTransform<Schema extends z.ZodTypeAny, Output>(
  schema: Schema,
  transform: (value: z.output<Schema>) => Output,
) {
  // Inference retains each Zod version's native effect/pipe type for generated schema consumers.
  return schema.transform(transform)
}

/** JSON input projections belong to API2's publisher; the SDK validates with the original schema. */
export function zodWithJsonInputSchema<Schema extends z.ZodTypeAny>(
  schema: Schema,
  _jsonInputSchema: z.ZodTypeAny,
): Schema {
  return schema
}

/** Conservative publication annotations likewise leave runtime validation and transforms intact. */
export function zodWithConservativeJsonInputSchema<Schema extends z.ZodTypeAny>(
  schema: Schema,
  _jsonInputSchema: z.ZodTypeAny,
): Schema {
  return schema
}

function isStableJsonValue(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'object' || ancestors.has(value)) return false

  ancestors.add(value)
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index) || !isStableJsonValue(value[index], ancestors)) return false
    }
    ancestors.delete(value)
    return true
  }

  const stable =
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) &&
    Object.values(value).every((entry) => isStableJsonValue(entry, ancestors))
  ancestors.delete(value)
  return stable
}

/** Snapshot a JSON default and parse a fresh copy for each omitted input. */
export function zodStableJsonDefault<Schema extends z.ZodTypeAny>(
  schema: Schema,
  defaultValue: Exclude<z.input<Schema>, undefined>,
) {
  if (!isStableJsonValue(defaultValue)) {
    throw new Error('A stable JSON default must contain only finite JSON values')
  }
  if (!schema.safeParse(defaultValue).success) {
    throw new Error('A stable JSON default must satisfy its schema')
  }

  const snapshot = structuredClone(defaultValue)
  // The Zod 4 generator must use prefault here so defaults still run validation and transforms.
  return schema.default(() => structuredClone(snapshot))
}

function assertLengthBoundary(name: 'max' | 'min', value: number | undefined): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
    throw new Error(`Zod code-point ${name} must be a nonnegative safe integer`)
  }
}

/** Validate Unicode code points, so supplementary characters count as one character. */
export function zodCodePointLength<Schema extends z.ZodString>(
  schema: Schema,
  { max, min }: ZodCodePointLengthOptions,
) {
  assertLengthBoundary('max', max)
  assertLengthBoundary('min', min)
  if (max === undefined && min === undefined) {
    throw new Error('Zod code-point length requires a minimum or maximum')
  }
  if (max !== undefined && min !== undefined && min > max) {
    throw new Error('Zod code-point minimum cannot exceed its maximum')
  }

  return schema.superRefine((value, context) => {
    let length = 0
    for (const _character of value) {
      length += 1
      if (max !== undefined && length > max) {
        context.addIssue({
          code: 'custom',
          message: `Must contain at most ${max} Unicode code points`,
        })
        return
      }
      if (max === undefined && min !== undefined && length >= min) return
    }
    if (min !== undefined && length < min) {
      context.addIssue({
        code: 'custom',
        message: `Must contain at least ${min} Unicode code points`,
      })
    }
  })
}
