import { z } from 'zod'

import {
  assemblyAuthInstructionsSchema,
  fieldsSchema,
  notifyUrlSchema,
  optionalStepsSchema,
  templateIdSchema,
} from './template.ts'

export const assemblyReplaySchema = z
  .object({
    auth: assemblyAuthInstructionsSchema,
    steps: optionalStepsSchema as typeof optionalStepsSchema,
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
