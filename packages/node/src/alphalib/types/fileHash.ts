import { z } from 'zod'

/** Hash-domain options shared by the command and public Robot, before wire-name adaptation. */
export const fileHashOptionsSchema = z.object({
  algorithm: z
    .enum(['b2', 'md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'])
    .default('sha256'),
  partial: z.enum(['full', 'first', 'last', 'both']).default('full'),
  partialSize: z.number().int().positive().default(1_048_576),
})
