import { optionalWithV3Semantics } from '../lib/sdkZodOptional.ts'

import { z } from 'zod/v4'

import {
  assemblyAuthInstructionsSchema,
  fieldsSchema,
  notifyUrlSchema,
  templateIdSchema,
} from './template.ts'

export const assemblyReplayStepSchema = z
  .object({
    field: optionalWithV3Semantics(z.unknown()),
    force_name: optionalWithV3Semantics(z.unknown()),
    force_original_id: optionalWithV3Semantics(z.unknown()),
    key: optionalWithV3Semantics(z.unknown()),
    output_meta: optionalWithV3Semantics(z.unknown()),
    password: optionalWithV3Semantics(z.unknown()),
    prompt: optionalWithV3Semantics(z.unknown()),
    robot: optionalWithV3Semantics(z.string()),
    secret: optionalWithV3Semantics(z.unknown()),
    url: optionalWithV3Semantics(z.unknown()),
    use: optionalWithV3Semantics(z.unknown()),
  })
  .catchall(z.unknown())
  .describe(
    'A full Assembly step or partial replay step override. Replay keeps this relaxed so credentials and missing robot properties can be merged back from the original Template before normal Assembly validation runs.',
  )

export const assemblyReplayStepsSchema = z
  .union([z.record(z.string(), assemblyReplayStepSchema), z.array(assemblyReplayStepSchema)])
  .describe(
    'Replay step overrides. Object-form steps are the normal Assembly shape; array-form steps are accepted for legacy replay compatibility and normalized before execution.',
  )

export const optionalAssemblyReplayStepsSchema = optionalWithV3Semantics(assemblyReplayStepsSchema)

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
