import { z } from 'zod/v4'

import { assemblyAuthInstructionsSchema } from './template.ts'

export const billSchema = z
  .object({
    auth: assemblyAuthInstructionsSchema,
  })
  .strict()
