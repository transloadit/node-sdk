import { z } from 'zod'

import { assemblyAuthInstructionsSchema } from './template.ts'

export const billSchema = z
  .object({
    auth: assemblyAuthInstructionsSchema,
  })
  .strict()
