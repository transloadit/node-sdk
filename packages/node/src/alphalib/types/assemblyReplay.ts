import { z } from 'zod'

import {
  assemblyAuthInstructionsSchema,
  fieldsSchema,
  notifyUrlSchema,
  templateIdSchema,
} from './template.ts'

export const assemblyReplayStepSchema = z
  .object({
    field: z.unknown().optional(),
    force_name: z.unknown().optional(),
    force_original_id: z.unknown().optional(),
    key: z.unknown().optional(),
    output_meta: z.unknown().optional(),
    password: z.unknown().optional(),
    prompt: z.unknown().optional(),
    robot: z.string().optional(),
    secret: z.unknown().optional(),
    url: z.unknown().optional(),
    use: z.unknown().optional(),
  })
  .passthrough()
  .describe(
    'A full Assembly step or partial replay step override. Replay keeps this relaxed so credentials and missing robot properties can be merged back from the original Template before normal Assembly validation runs.',
  )

export const assemblyReplayStepsSchema = z
  .union([z.record(assemblyReplayStepSchema), z.array(assemblyReplayStepSchema)])
  .describe(
    'Replay step overrides. Object-form steps are the normal Assembly shape; array-form steps are accepted for legacy replay compatibility and normalized before execution.',
  )

export const optionalAssemblyReplayStepsSchema = assemblyReplayStepsSchema.optional()

export type AssemblyReplayStep = z.infer<typeof assemblyReplayStepSchema>
export type AssemblyReplaySteps = z.infer<typeof assemblyReplayStepsSchema>

export const assemblyReplaySchema = z
  .object({
    auth: assemblyAuthInstructionsSchema,
    steps: optionalAssemblyReplayStepsSchema,
    template_id: templateIdSchema,
    notify_url: notifyUrlSchema,
    fields: fieldsSchema,
    reparse_template: z
      .union([z.literal(0), z.literal(1)])
      .describe(
        'Specify `1` to reparse the Template used in your Assembly (useful if the Template changed in the meantime). Alternatively, `0` replays the identical Steps used in the Assembly.',
      ),
  })
  .strict()
