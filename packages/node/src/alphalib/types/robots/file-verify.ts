import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createProcessingExample,
  defineRobot,
  robotBase,
  robotFileFilteringMeta,
  robotParameterDocs,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotFileFilteringMeta,
  description:
    '/file/verify is a simple Robot that helps ensure that the files you upload are of the type you initially intended. This is especially useful when handling user-generated content, where you may not want to run certain Steps in your Template if the user hasn’t uploaded a file of the correct type. Another use case for /file/verify is when a user uploads a ZIP file, but we find that it has a few damaged files inside when we extract it. Perhaps you don’t want to error out, but only send the good files to a next processing step. With /file/verify, you can do exactly that (assuming the default of `error_on_decline`: `true`).',
  example_code: createProcessingExample('scanned', '/file/verify', {
    error_on_decline: true,
    error_msg: 'At least one of the uploaded files was not the desired type',
    verify_to_be: 'image',
  }),
  example_code_description: 'Scan the uploaded files and throw an error if they are not images:',
  purpose_sentence: 'verifies your files are the type that you want',
  purpose_verb: 'verify',
  purpose_word: 'verify the file type',
  purpose_words: 'Verify the file type',
  title: 'Verify the file type',
  name: 'FileVerifyRobot',
  priceFactor: 4,
}

export const robotFileVerifyInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/verify'),
    error_on_decline: z
      .boolean()
      .default(false)
      .describe(robotParameterDocs.error_on_decline.description),
    error_msg: z
      .string()
      .default('One of your files was declined')
      .describe(robotParameterDocs.error_msg.description),
    repair_pdf: z
      .boolean()
      .default(false)
      .describe(`
Attempt to repair invalid PDFs with \`mutool clean\`. This is best-effort and only applies when \`verify_to_be\` is \`"pdf"\`.
`),
    verify_to_be: z
      .string()
      .default('pdf')
      .describe(`
The type that you want to match against to ensure your file is of this type. For example, \`image\` will verify whether uploaded files are images. This also works against file media types, in this case \`image/png\` would also work to match against specifically \`png\` files.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotFileVerifyInstructionsSchema.shape> =
  defineRobot(meta, robotFileVerifyInstructionsSchema)

export const {
  withHiddenFields: robotFileVerifyInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotFileVerifyInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotFileVerifyInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotFileVerifyInstructions = Instructions['output']
export type RobotFileVerifyInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotFileVerifyInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotFileVerifyInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotFileVerifyInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotFileVerifyInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
