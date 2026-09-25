import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { defineRobot, robotBase, robotProcessingMeta } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotProcessingMeta,
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
  override_lvl1: 'Handling Uploads',
  purpose_sentence:
    'receives uploads that your users throw at you from browser or apps, or that you throw at us programmatically',
  purpose_verb: 'handle',
  purpose_word: 'handle uploads',
  purpose_words: 'Handle uploads',
  service_slug: 'handling-uploads',
  title: 'Handle uploads',
  name: 'UploadHandleRobot',
  priceFactor: 10,
  queueSlotCount: 0,
  downloadInputFiles: false,
  preserveInputFileUrls: true,
  isAllowedForUrlTransform: false,
  trackOutputFileSize: false,
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

export const robotDefinition: RobotDefinition<typeof robotUploadHandleInstructionsSchema.shape> =
  defineRobot(meta, robotUploadHandleInstructionsSchema)

export const {
  withHiddenFields: robotUploadHandleInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotUploadHandleInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotUploadHandleInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotUploadHandleInstructions = Instructions['output']
export type RobotUploadHandleInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotUploadHandleInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotUploadHandleInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotUploadHandleInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotUploadHandleInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
