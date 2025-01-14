import { z } from 'zod'

import { useParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: false,
  bytescount: 5,
  discount_factor: 0.2,
  discount_pct: 80,
  example_code: {
    steps: {
      hashed: {
        robot: '/file/hash',
        use: ':original',
        algorithm: 'sha1',
      },
    },
  },
  example_code_description: 'Hash each uploaded file using the SHA-1 algorithm:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'Media Cataloging',
  purpose_sentence: 'hashes files in Assemblies',
  purpose_verb: 'hash',
  purpose_word: 'file',
  purpose_words: 'Hash files',
  service_slug: 'media-cataloging',
  slot_count: 60,
  title: 'Hash Files',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotFileHashInstructionsSchema = z
  .object({
    robot: z.literal('/file/hash').describe(`
This <dfn>Robot</dfn> allows you to hash any file as part of the <dfn>Assembly</dfn> execution process. This can be useful for verifying the integrity of a file for example.
`),
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    use: useParamSchema,
    algorithm: z
      .enum(['b2', 'md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'])
      .default('sha256').describe(`
The hashing algorithm to use.

The file hash is exported as \`file.meta.hash\`.
`),
  })
  .strict()

export type RobotFileHashInstructions = z.infer<typeof robotFileHashInstructionsSchema>
