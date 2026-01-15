import { z } from 'zod'

import { assemblyAuthInstructionsSchema, optionalStepsSchema } from './template.ts'

export const assemblyReplayNotificationSchema = z
  .object({
    auth: assemblyAuthInstructionsSchema,
    steps: optionalStepsSchema as typeof optionalStepsSchema,
    wait: z
      .boolean()
      .default(true)
      .describe(
        'If it is provided with the value `false`, then the API request will return immediately even though the Notification is still in progress. This can be useful if your server takes some time to respond, but you do not want the replay API request to hang.',
      ),
  })
  .strict()
