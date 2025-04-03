import { z } from 'zod'

import { robotBase, robotUse } from './_instructions-primitives.ts'

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
    result: z.union([z.literal('debug'), robotImageGenerateInstructionsSchema.shape.result]),
    provider: z.string().optional().describe('Provider for generating the image.'),
  })

export type RobotImageGenerateInstructions = z.infer<typeof robotImageGenerateInstructionsSchema>
export type RobotImageGenerateInstructionsWithHiddenFields = z.infer<
  typeof robotImageGenerateInstructionsWithHiddenFieldsSchema
>
