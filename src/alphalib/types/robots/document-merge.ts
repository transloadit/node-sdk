import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      merged: {
        robot: '/document/merge',
        use: {
          steps: [':original'],
          bundle_steps: true,
        },
      },
    },
  },
  example_code_description: 'Merge all uploaded PDF documents into one:',
  extended_description: `
> ![Note]
> This <dfn>Robot</dfn> can merge PDF files only at the moment.

Input files are sorted alphanumerically unless you provide the as-syntax in the "use" parameter. For example:

\`\`\`json
{
  "use": [
    { "name": "my_step_name", "as": "document_2" },
    { "name": "my_other_step_name", "as": "document_1" }
  ]
}
\`\`\`
`,
  minimum_charge: 1048576,
  output_factor: 1,
  override_lvl1: 'Document Processing',
  purpose_sentence: 'concatenates several PDF documents into a single file',
  purpose_verb: 'convert',
  purpose_word: 'convert',
  purpose_words: 'Merge documents into one',
  service_slug: 'document-processing',
  slot_count: 10,
  title: 'Merge documents into one',
  typical_file_size_mb: 0.8,
  typical_file_type: 'document',
  name: 'DocumentMergeRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumCharge: 1048576,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotDocumentMergeInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/document/merge'),
    input_passwords: z
      .array(z.string())
      .default([])
      .describe(`
An array of passwords for the input documents, in case they are encrypted. The order of passwords must match the order of the documents as they are passed to the /document/merge step.

This can be achieved via our as-syntax using "document_1", "document_2", etc if provided. See the demos below.

If the as-syntax is not used in the "use" parameter, the documents are sorted alphanumerically based on their filename, and in that order input passwords should be provided.
`),
    output_password: z
      .string()
      .optional()
      .describe(`
If not empty, encrypts the output file and makes it accessible only by typing in this password.
`),
  })
  .strict()

export const robotDocumentMergeInstructionsWithHiddenFieldsSchema =
  robotDocumentMergeInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotDocumentMergeInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotDocumentMergeInstructions = z.infer<typeof robotDocumentMergeInstructionsSchema>
export type RobotDocumentMergeInstructionsWithHiddenFields = z.infer<
  typeof robotDocumentMergeInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotDocumentMergeInstructionsSchema = interpolateRobot(
  robotDocumentMergeInstructionsSchema,
)
export type InterpolatableRobotDocumentMergeInstructions =
  InterpolatableRobotDocumentMergeInstructionsInput

export type InterpolatableRobotDocumentMergeInstructionsInput = z.input<
  typeof interpolatableRobotDocumentMergeInstructionsSchema
>

export const interpolatableRobotDocumentMergeInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotDocumentMergeInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotDocumentMergeInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotDocumentMergeInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotDocumentMergeInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotDocumentMergeInstructionsWithHiddenFieldsSchema
>
