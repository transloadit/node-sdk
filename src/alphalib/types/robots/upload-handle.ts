import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      ':original': {
        robot: '/upload/handle',
      },
      exported: {
        robot: '/s3/store',
        use: ':original',
        credentials: 'YOUR_S3_CREDENTIALS',
      },
    },
  },
  example_code_description: 'Handle uploads and export the uploaded files to S3:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'Handling Uploads',
  purpose_sentence:
    'receives uploads that your users throw at you from browser or apps, or that you throw at us programmatically',
  purpose_verb: 'handle',
  purpose_word: 'handle uploads',
  purpose_words: 'Handle uploads',
  service_slug: 'handling-uploads',
  slot_count: 0,
  title: 'Handle uploads',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'UploadHandleRobot',
  priceFactor: 10,
  queueSlotCount: 0,
  downloadInputFiles: false,
  preserveInputFileUrls: true,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: false,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotUploadHandleInstructionsSchema = robotBase
  .extend({
    robot: z.literal('/upload/handle').describe(`
Transloadit handles file uploads by default, so specifying this <dfn>Robot</dfn> is optional.

It can still be a good idea to define this <dfn>Robot</dfn>, though. It makes your <dfn>Assembly Instructions</dfn> explicit, and allows you to configure exactly how uploads should be handled. For example, you can extract specific metadata from the uploaded files.

There are **3 important constraints** when using this <dfn>Robot</dfn>:

1. Don’t define a \`use\` parameter, unlike with other <dfn>Robots</dfn>.
2. Use it only once in a single set of <dfn>Assembly Instructions</dfn>.
3. Name the Step as \`:original\`.
`),
  })
  .strict()

export const robotUploadHandleInstructionsWithHiddenFieldsSchema =
  robotUploadHandleInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotUploadHandleInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotUploadHandleInstructions = z.infer<typeof robotUploadHandleInstructionsSchema>
export type RobotUploadHandleInstructionsWithHiddenFields = z.infer<
  typeof robotUploadHandleInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotUploadHandleInstructionsSchema = interpolateRobot(
  robotUploadHandleInstructionsSchema,
)
export type InterpolatableRobotUploadHandleInstructions =
  InterpolatableRobotUploadHandleInstructionsInput

export type InterpolatableRobotUploadHandleInstructionsInput = z.input<
  typeof interpolatableRobotUploadHandleInstructionsSchema
>

export const interpolatableRobotUploadHandleInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotUploadHandleInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotUploadHandleInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotUploadHandleInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotUploadHandleInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotUploadHandleInstructionsWithHiddenFieldsSchema
>
