import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 4,
  description: `/file/verify is a simple Robot that helps ensure that the files you upload are of the type you initially intended. This is especially useful when handling user-generated content, where you may not want to run certain Steps in your Template if the user hasn’t uploaded a file of the correct type. Another use case for /file/verify is when a user uploads a ZIP file, but we find that it has a few damaged files inside when we extract it. Perhaps you don’t want to error out, but only send the good files to a next processing step. With /file/verify, you can do exactly that (assuming the default of \`error_on_decline\`: \`true\`).`,
  discount_factor: 0.25,
  discount_pct: 75,
  example_code: {
    steps: {
      scanned: {
        robot: '/file/verify',
        use: ':original',
        error_on_decline: true,
        error_msg: 'At least one of the uploaded files was not the desired type',
        verify_to_be: 'image',
      },
    },
  },
  example_code_description: 'Scan the uploaded files and throw an error if they are not images:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Filtering',
  purpose_sentence: 'verifies your files are the type that you want',
  purpose_verb: 'verify',
  purpose_word: 'verify the file type',
  purpose_words: 'Verify the file type',
  service_slug: 'file-filtering',
  slot_count: 10,
  title: 'Verify the file type',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'FileVerifyRobot',
  priceFactor: 4,
  queueSlotCount: 10,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotFileVerifyInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/verify'),
    error_on_decline: z
      .boolean()
      .default(false)
      .describe(`
If this is set to \`true\` and one or more files are declined, the Assembly will be stopped and marked with an error.
`),
    error_msg: z
      .string()
      .default('One of your files was declined')
      .describe(`
The error message shown to your users (such as by Uppy) when a file is declined and \`error_on_decline\` is set to \`true\`.
`),
    verify_to_be: z
      .string()
      .default('pdf')
      .describe(`
The type that you want to match against to ensure your file is of this type. For example, \`image\` will verify whether uploaded files are images. This also works against file media types, in this case \`image/png\` would also work to match against specifically \`png\` files.
`),
  })
  .strict()

export const robotFileVerifyInstructionsWithHiddenFieldsSchema =
  robotFileVerifyInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotFileVerifyInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotFileVerifyInstructions = z.infer<typeof robotFileVerifyInstructionsSchema>
export type RobotFileVerifyInstructionsWithHiddenFields = z.infer<
  typeof robotFileVerifyInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFileVerifyInstructionsSchema = interpolateRobot(
  robotFileVerifyInstructionsSchema,
)
export type InterpolatableRobotFileVerifyInstructions =
  InterpolatableRobotFileVerifyInstructionsInput

export type InterpolatableRobotFileVerifyInstructionsInput = z.input<
  typeof interpolatableRobotFileVerifyInstructionsSchema
>

export const interpolatableRobotFileVerifyInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFileVerifyInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFileVerifyInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFileVerifyInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFileVerifyInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFileVerifyInstructionsWithHiddenFieldsSchema
>
