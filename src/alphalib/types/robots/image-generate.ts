import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  minimum_charge: 0,
  output_factor: 0.6,
  purpose_sentence: 'generates images from text prompts using AI',
  purpose_verb: 'generate',
  purpose_word: 'generate',
  purpose_words: 'Generate images from text prompts',
  service_slug: 'artificial-intelligence',
  slot_count: 10,
  title: 'Generate images from text prompts',
  typical_file_size_mb: 1.2,
  typical_file_type: 'image',
  name: 'ImageGenerateRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumChargeUsd: 0.06,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotImageGenerateInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/generate'),
    model: z.string(),
    prompt: z.string().describe('The prompt describing the desired image content.'),
    format: z
      .enum(['jpeg', 'png', 'gif', 'webp', 'svg'])
      .optional()
      .describe('Format of the generated image.'),
    seed: z.number().optional().describe('Seed for the random number generator.'),
    aspect_ratio: z.string().optional().describe('Aspect ratio of the generated image.'),
    height: z.number().optional().describe('Height of the generated image.'),
    width: z.number().optional().describe('Width of the generated image.'),
    style: z.string().optional().describe('Style of the generated image.'),
  })
  .strict()

export const robotImageGenerateInstructionsWithHiddenFieldsSchema =
  robotImageGenerateInstructionsSchema.extend({
    provider: z.string().optional().describe('Provider for generating the image.'),
    result: z
      .union([z.literal('debug'), robotImageGenerateInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotImageGenerateInstructions = z.infer<typeof robotImageGenerateInstructionsSchema>
export type RobotImageGenerateInstructionsWithHiddenFields = z.infer<
  typeof robotImageGenerateInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotImageGenerateInstructionsSchema = interpolateRobot(
  robotImageGenerateInstructionsSchema,
)
export type InterpolatableRobotImageGenerateInstructions =
  InterpolatableRobotImageGenerateInstructionsInput

export type InterpolatableRobotImageGenerateInstructionsInput = z.input<
  typeof interpolatableRobotImageGenerateInstructionsSchema
>

export const interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotImageGenerateInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotImageGenerateInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotImageGenerateInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotImageGenerateInstructionsWithHiddenFieldsSchema
>
