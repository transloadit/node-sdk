import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      upscaled: {
        robot: '/image/upscale',
        use: ':original',
        scale: 2,
        face_enhance: true,
      },
    },
  },
  example_code_description: 'Upscale uploaded images and enhance faces:',
  minimum_charge: 0,
  output_factor: 0.6,
  purpose_sentence: 'upscales images using AI',
  purpose_verb: 'generate',
  purpose_word: 'upscale',
  purpose_words: 'Upscale images',
  service_slug: 'artificial-intelligence',
  slot_count: 10,
  title: 'Upscale images',
  typical_file_size_mb: 1.2,
  typical_file_type: 'image',
  name: 'ImageUpscaleRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumChargeUsd: 0.06,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'beta',
}

export const robotImageUpscaleInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/upscale'),
    model: z
      .enum(['nightmareai/real-esrgan', 'tencentarc/gfpgan', 'sczhou/codeformer'])
      .optional()
      .describe('The AI model to use for image upscaling. Defaults to nightmareai/real-esrgan.'),
    scale: z
      .union([z.literal(2), z.literal(4)])
      .optional()
      .describe('Upscale factor. Defaults to 2.'),
    face_enhance: z
      .boolean()
      .optional()
      .describe('Enable face enhancement for better face restoration. Defaults to false.'),
  })
  .strict()

export const robotImageUpscaleInstructionsWithHiddenFieldsSchema =
  robotImageUpscaleInstructionsSchema.extend({
    provider: z.string().optional().describe('Provider for upscaling the image.'),
    result: z
      .union([z.literal('debug'), robotImageUpscaleInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotImageUpscaleInstructions = z.infer<typeof robotImageUpscaleInstructionsSchema>
export type RobotImageUpscaleInstructionsWithHiddenFields = z.infer<
  typeof robotImageUpscaleInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotImageUpscaleInstructionsSchema = interpolateRobot(
  robotImageUpscaleInstructionsSchema,
)
export type InterpolatableRobotImageUpscaleInstructions =
  InterpolatableRobotImageUpscaleInstructionsInput

export type InterpolatableRobotImageUpscaleInstructionsInput = z.input<
  typeof interpolatableRobotImageUpscaleInstructionsSchema
>

export const interpolatableRobotImageUpscaleInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotImageUpscaleInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotImageUpscaleInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotImageUpscaleInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotImageUpscaleInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotImageUpscaleInstructionsWithHiddenFieldsSchema
>
