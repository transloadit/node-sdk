import { z } from 'zod/v4'

/** Preserve Zod 3's undefined short circuit, including defaults inside an optional schema. */
export function optionalWithV3Semantics<Schema extends z.core.$ZodType>(
  innerType: Schema,
): z.ZodOptional<Schema> {
  // Use Zod's constructor hook so describe/clone retain this parser and unwrap retains Schema.
  // A union with undefined parses correctly but changes the public optional's inner schema.
  // Do not inspect innerType.optin here: lazy schemas may refer to not-yet-initialized bindings.
  const Optional = z.core.$constructor<z.ZodOptional<Schema>>(
    'ZodV3Optional',
    (schema, definition) => {
      z.ZodOptional.init(schema, definition)
      schema._zod.parse = (payload, context) =>
        payload.value === undefined ? payload : definition.innerType._zod.run(payload, context)
    },
  )
  return new Optional({ type: 'optional', innerType })
}
