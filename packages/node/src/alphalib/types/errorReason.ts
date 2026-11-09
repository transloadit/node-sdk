import { z } from 'zod'

/**
 * Opaque diagnostic values after JSON serialization, shared by HTTP and Assembly errors.
 * Nested values remain opaque; transport boundaries validate serialization separately.
 */
export const errorReasonSchema = z.union([
  z.null(),
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.array(z.unknown()),
  z.record(z.unknown()),
])
