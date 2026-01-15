import z from 'zod'

import { assemblyAuthInstructionsSchema } from './template.ts'

export const assembliesGetSchema = z
  .object({
    auth: assemblyAuthInstructionsSchema,
    page: z
      .number()
      .int()
      .default(1)
      .describe('Specifies the current page, within the current pagination'),
    pagesize: z
      .number()
      .int()
      .min(1)
      .max(5000)
      .default(50)
      .describe(
        'Specifies how many Assemblies to be received per API request, which is useful for pagination.',
      ),
    type: z
      .enum(['all', 'uploading', 'executing', 'canceled', 'completed', 'failed', 'request_aborted'])
      .describe('Specifies the types of Assemblies to be retrieved.'),
    fromdate: z
      .string()
      .describe(
        'Specifies the minimum Assembly UTC creation date/time. Only Assemblies after this time will be retrieved. Use the format `Y-m-d H:i:s`.',
      ),
    todate: z
      .string()
      .default('NOW()')
      .describe(
        'Specifies the maximum Assembly UTC creation date/time. Only Assemblies before this time will be retrieved. Use the format `Y-m-d H:i:s`.',
      ),
    keywords: z
      .array(z.string())
      .describe(
        'Specifies keywords to be matched in the Assembly Status. The Assembly fields checked include the `id`, `redirect_url`, `fields`, and `notify_url`, as well as error messages and files used.',
      ),
  })
  .strict()
