import type { z } from 'zod'

/** Portable copy paired with the publisher's richer glossary rendering. */
export interface ApiParameterDescriptionSource {
  readonly commonMark: string
  readonly referenceMarkdown: string
}

export type ApiParameterDescription = string | ApiParameterDescriptionSource

/** Keep useful parameter help without importing API2's translation identity registry. */
export function describeApiParameter<Schema extends z.ZodTypeAny>(
  _descriptionId: string,
  schema: Schema,
  description: ApiParameterDescription,
): Schema {
  return schema.describe(typeof description === 'string' ? description : description.commonMark)
}

/** Preserve portable help when rebuilding a schema, without publication-only metadata. */
export function inheritApiParameterDescription<Schema extends z.ZodTypeAny>(
  source: z.ZodTypeAny,
  target: Schema,
): Schema {
  return source.description === undefined ? target : target.describe(source.description)
}

/** Attach available field help while retaining the original shape's types and runtime behavior. */
export function describeApiParameterFields<Shape extends Record<string, z.ZodTypeAny>>(
  scope: string,
  shape: Shape,
  descriptions: Readonly<Partial<Record<string, ApiParameterDescription>>>,
): Shape {
  const describedShape = { ...shape }
  for (const field in describedShape) {
    const description = Object.hasOwn(descriptions, field) ? descriptions[field] : undefined
    if (description === undefined) continue
    describedShape[field] = describeApiParameter(scope, describedShape[field], description)
  }
  return describedShape
}
