import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 5,
  discount_factor: 0.2,
  discount_pct: 80,
  minimum_charge: 512000,
  output_factor: 1,
  override_lvl1: 'Document Processing',
  purpose_sentence: 'reads file contents from supported file-types',
  purpose_verb: 'read',
  purpose_word: 'read files',
  purpose_words: 'Read file contents',
  service_slug: 'document-processing',
  slot_count: 5,
  title: 'Read file contents',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'FileReadRobot',
  priceFactor: 5,
  queueSlotCount: 5,
  minimumCharge: 512000,
  isAllowedForUrlTransform: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotFileReadInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/read').describe(`
This <dfn>Robot</dfn> accepts any file, and will read the file using UTF-8 encoding. The result is outputted to \`file.meta.content\` to be accessed in later <dfn>Steps</dfn>.

The <dfn>Robot</dfn> currently only accepts files under 500KB.
`),
  })
  .strict()

export const robotFileReadInstructionsWithHiddenFieldsSchema =
  robotFileReadInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotFileReadInstructionsSchema.shape.result]).optional(),
  })

export type RobotFileReadInstructions = z.infer<typeof robotFileReadInstructionsSchema>
export type RobotFileReadInstructionsWithHiddenFields = z.infer<
  typeof robotFileReadInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFileReadInstructionsSchema = interpolateRobot(
  robotFileReadInstructionsSchema,
)
export type InterpolatableRobotFileReadInstructions = InterpolatableRobotFileReadInstructionsInput

export type InterpolatableRobotFileReadInstructionsInput = z.input<
  typeof interpolatableRobotFileReadInstructionsSchema
>

export const interpolatableRobotFileReadInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFileReadInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFileReadInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFileReadInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFileReadInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFileReadInstructionsWithHiddenFieldsSchema
>
