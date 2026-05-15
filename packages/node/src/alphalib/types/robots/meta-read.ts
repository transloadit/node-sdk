import { z } from 'zod'
import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  // api2 tracks /meta/read as a special 1% metadata fee while keeping runtime priceFactor at 0.
  bytescount: 100,
  discount_factor: 0.01,
  discount_pct: 99,
  example_code: {
    steps: {
      metadata: {
        robot: '/meta/read',
      },
    },
  },
  example_code_description: 'Read metadata from uploaded files:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'Media Cataloging',
  purpose_sentence: 'reads metadata from uploaded files',
  purpose_verb: 'read',
  purpose_word: 'metadata',
  purpose_words: 'Read file metadata',
  service_slug: 'media-cataloging',
  slot_count: 15,
  title: 'Read file metadata',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'MetaReadRobot',
  priceFactor: 0,
  queueSlotCount: 15,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: true,
  stage: 'ga',
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotMetaReadInstructionsSchema = robotBase
  .extend({
    robot: z.literal('/meta/read').describe('Reads metadata from a file.'),
  })
  .strict()

export type RobotMetaReadInstructions = z.infer<typeof robotMetaReadInstructionsSchema>

export const robotMetaReadInstructionsWithHiddenFieldsSchema =
  robotMetaReadInstructionsSchema.extend({
    result: z.union([z.literal('debug'), robotMetaReadInstructionsSchema.shape.result]).optional(),
  })

export const interpolatableRobotMetaReadInstructionsSchema = interpolateRobot(
  robotMetaReadInstructionsSchema,
)
export type InterpolatableRobotMetaReadInstructions = InterpolatableRobotMetaReadInstructionsInput

export type InterpolatableRobotMetaReadInstructionsInput = z.input<
  typeof interpolatableRobotMetaReadInstructionsSchema
>

export const interpolatableRobotMetaReadInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotMetaReadInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotMetaReadInstructionsWithHiddenFields = z.input<
  typeof interpolatableRobotMetaReadInstructionsWithHiddenFieldsSchema
>
