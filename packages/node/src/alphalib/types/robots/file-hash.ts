import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
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
  name: 'FileHashRobot',
  priceFactor: 5,
  queueSlotCount: 60,
  isAllowedForUrlTransform: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'ga',
}

export const robotFileHashInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/hash').describe(`
This <dfn>Robot</dfn> allows you to hash any file as part of the <dfn>Assembly</dfn> execution process. This can be useful for verifying the integrity of a file for example.
`),
    algorithm: z
      .enum(['b2', 'md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'])
      .default('sha256')
      .describe(`
The hashing algorithm to use.

The file hash is exported as \`file.meta.hash\`.
`),
    partial: z
      .enum(['full', 'first', 'last', 'both'])
      .default('full')
      .describe(`
Specifies which portion of the file to hash. This is useful for fast fingerprinting of large files.

- \`"full"\` (default): Hash the entire file.
- \`"first"\`: Hash only the first N bytes (specified by \`partial_size\`).
- \`"last"\`: Hash only the last N bytes (specified by \`partial_size\`).
- \`"both"\`: Hash the first N bytes concatenated with the last N bytes.

When using partial hashing, \`file.meta.hash_partial\` indicates the mode used, and \`file.meta.hash_partial_size\` indicates the number of bytes hashed from each portion.
`),
    partial_size: z
      .number()
      .int()
      .positive()
      .default(1048576)
      .describe(`
The number of bytes to hash when using partial hashing. Defaults to \`1048576\` (1 MB).

This parameter is only used when \`partial\` is set to \`"first"\`, \`"last"\`, or \`"both"\`.
`),
  })
  .strict()

export const robotFileHashInstructionsWithHiddenFieldsSchema =
  robotFileHashInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotFileHashInstructionsSchema.shape.result]).optional(),
  })

export type RobotFileHashInstructions = z.infer<typeof robotFileHashInstructionsSchema>
export type RobotFileHashInstructionsWithHiddenFields = z.infer<
  typeof robotFileHashInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFileHashInstructionsSchema = interpolateRobot(
  robotFileHashInstructionsSchema,
)
export type InterpolatableRobotFileHashInstructions = InterpolatableRobotFileHashInstructionsInput

export type InterpolatableRobotFileHashInstructionsInput = z.input<
  typeof interpolatableRobotFileHashInstructionsSchema
>

export const interpolatableRobotFileHashInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFileHashInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFileHashInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFileHashInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFileHashInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFileHashInstructionsWithHiddenFieldsSchema
>
