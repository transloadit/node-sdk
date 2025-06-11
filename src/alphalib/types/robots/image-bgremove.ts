import { z } from 'zod'

import type { RobotMeta } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  discount_factor: 1,
  bytescount: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      remove_background: {
        robot: '/image/bgremove',
        use: ':original',
      },
    },
  },
  example_code_description: 'Remove the background from the uploaded image:',
  minimum_charge: 0,
  output_factor: 0.6,
  override_lvl1: 'Image Manipulation',
  purpose_sentence: 'removes the background from images',
  purpose_verb: 'remove',
  purpose_word: 'remove',
  purpose_words: 'Remove the background from images',
  service_slug: 'image-manipulation',
  slot_count: 10,
  title: 'Remove the background from images',
  typical_file_size_mb: 0.8,
  typical_file_type: 'image',
}

export const robotImageBgremoveInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/image/bgremove'),
    select: z
      .enum(['foreground', 'background'])
      .optional()
      .describe('Region to select and keep in the image. The other region is removed.'),
    format: z.enum(['png', 'gif', 'webp']).optional().describe('Format of the generated image.'),
    provider: z
      .enum(['transloadit', 'replicate', 'fal'])
      .optional()
      .describe('Provider to use for removing the background.'),
  })
  .strict()

export type RobotImageBgremoveInstructions = z.infer<typeof robotImageBgremoveInstructionsSchema>

export const interpolatableRobotImageBgremoveInstructionsSchema = interpolateRobot(
  robotImageBgremoveInstructionsSchema,
)
export type InterpolatableRobotImageBgremoveInstructions = z.input<
  typeof interpolatableRobotImageBgremoveInstructionsSchema
>
