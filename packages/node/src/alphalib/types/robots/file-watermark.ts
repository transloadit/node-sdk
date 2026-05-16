import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 4,
  discount_factor: 0.25,
  discount_pct: 75,
  example_code: {
    steps: {
      watermarked: {
        robot: '/file/watermark',
        use: ':original',
        randomize: true,
      },
    },
  },
  example_code_description: 'Apply randomized watermarking to uploaded files:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'Image Manipulation',
  purpose_sentence: 'applies randomized watermarks to uploaded media',
  purpose_verb: 'write',
  purpose_word: 'watermark files',
  purpose_words: 'Watermark files',
  service_slug: 'image-manipulation',
  slot_count: 20,
  title: 'Apply watermarks to files',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'FileWatermarkRobot',
  priceFactor: 4,
  queueSlotCount: 20,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'ga',
}

export const robotFileWatermarkInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/watermark'),
    randomize: z.boolean().optional(),
  })
  .strict()

export const robotFileWatermarkInstructionsWithHiddenFieldsSchema =
  robotFileWatermarkInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotFileWatermarkInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotFileWatermarkInstructions = z.infer<typeof robotFileWatermarkInstructionsSchema>
export type RobotFileWatermarkInstructionsWithHiddenFields = z.infer<
  typeof robotFileWatermarkInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFileWatermarkInstructionsSchema = interpolateRobot(
  robotFileWatermarkInstructionsSchema,
)
export type InterpolatableRobotFileWatermarkInstructions =
  InterpolatableRobotFileWatermarkInstructionsInput

export type InterpolatableRobotFileWatermarkInstructionsInput = z.input<
  typeof interpolatableRobotFileWatermarkInstructionsSchema
>

export const interpolatableRobotFileWatermarkInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFileWatermarkInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFileWatermarkInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFileWatermarkInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFileWatermarkInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFileWatermarkInstructionsWithHiddenFieldsSchema
>
