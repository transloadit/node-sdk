import { z } from 'zod'

import { outputMetaParamSchema, useParamSchema } from './_instructions-primitives.ts'

export const robotImageGenerateInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/image/generate'),
    model: z.string(),
    prompt: z.string().describe('The prompt describing the desired image content.'),
    format: z
      .enum(['jpeg', 'png', 'gif', 'webp'])
      .optional()
      .describe('Format of the generated image.'),
    seed: z.number().optional().describe('Seed for the random number generator.'),
    aspectRatio: z.string().optional().describe('Aspect ratio of the generated image.'),
    height: z.number().optional().describe('Height of the generated image.'),
    width: z.number().optional().describe('Width of the generated image.'),
    style: z.string().optional().describe('Style of the generated image.'),
    output_meta: outputMetaParamSchema.optional(),
    use: useParamSchema,
  })
  .strict()

export const robotImageGenerateInstructionsWithHiddenFields =
  robotImageGenerateInstructionsSchema.extend({
    provider: z.string().optional().describe('Provider for generating the image.'),
  })

export type RobotImageGenerateInstructions = z.infer<typeof robotImageGenerateInstructionsSchema>
export type RobotImageGenerateInstructionsWithHiddenFields = z.infer<
  typeof robotImageGenerateInstructionsWithHiddenFields
>
