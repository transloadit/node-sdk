import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  defineRobot,
  inputSortBySchema,
  robotBase,
  robotDocumentProcessingMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotDocumentProcessingMeta,
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
  purpose_sentence: 'concatenates several PDF documents into a single file',
  purpose_verb: 'convert',
  purpose_word: 'convert',
  purpose_words: 'Merge documents into one',
  title: 'Merge documents into one',
  name: 'DocumentMergeRobot',
  trackOutputFileSize: true,
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
    sort_by: inputSortBySchema,
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotDocumentMergeInstructionsSchema.shape> =
  defineRobot(meta, robotDocumentMergeInstructionsSchema)

export const {
  withHiddenFields: robotDocumentMergeInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotDocumentMergeInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotDocumentMergeInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotDocumentMergeInstructions = Instructions['output']
export type RobotDocumentMergeInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotDocumentMergeInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotDocumentMergeInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotDocumentMergeInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotDocumentMergeInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
