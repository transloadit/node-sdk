import { z } from 'zod'

import { useParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 0,
  discount_factor: 0,
  discount_pct: 100,
  example_code: {
    steps: {
      filtered: {
        robot: '/file/filter',
        use: ':original',
        declines: [['${file.size}', '&gt;', '20971520']],
        error_on_decline: true,
        error_msg: 'File size must not exceed 20 MB',
      },
    },
  },
  example_code_description: 'Reject files that are larger than 20 MB:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Filtering',
  purpose_sentence: 'directs files to different encoding Steps based on your conditions',
  purpose_verb: 'filter',
  purpose_word: 'filter',
  purpose_words: 'Filter files',
  service_slug: 'file-filtering',
  slot_count: 0,
  title: 'Filter files',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotFileFilterInstructionsSchema = z
  .object({
    result: z
      .boolean()
      .optional()
      .describe(`Whether the results of this Step should be present in the Assembly Status JSON`),
    robot: z.literal('/file/filter'),
    use: useParamSchema,
    accepts: z
      .array(
        z.union([z.string(), z.tuple([z.string(), z.string(), z.union([z.string(), z.number()])])]),
      )
      .default([]).describe(`
Files that match at least one requirement will be accepted, or declined otherwise. If the array is empty, all files will be accepted. Example:

\`[["\${file.mime}", "==", "image/gif"]]\`.

If the \`condition_type\` parameter is set to \`"and"\`, then all requirements must match for the file to be accepted.
`),
    declines: z
      .array(
        z.union([z.string(), z.tuple([z.string(), z.string(), z.union([z.string(), z.number()])])]),
      )
      .default([]).describe(`
Files that match at least one requirement will be declined, or accepted otherwise. Example:

\`[["\${file.size}",">","1024"]]\`.

If the \`condition_type\` parameter is set to \`"and"\`, then all requirements must match for the file to be declined.
`),
    condition_type: z.enum(['and', 'or']).default('or').describe(`
Specifies the condition type according to which the members of the \`accepts\` or \`declines\` arrays should be evaluated. Can be \`"or"\` or \`"and"\`.
`),
    error_on_decline: z.boolean().default(false).describe(`
If this is set to \`true\` and one or more files are declined, the Assembly will be stopped and marked with an error.
`),
    error_msg: z.string().default('One of your files was declined').describe(`
The error message shown to your users (such as by Uppy) when a file is declined and \`error_on_decline\` is set to \`true\`.
`),
  })
  .strict()

export type RobotFileFilterInstructions = z.infer<typeof robotFileFilterInstructionsSchema>
export type RobotFileFilterInstructionsInput = z.input<typeof robotFileFilterInstructionsSchema>
