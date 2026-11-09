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
  robotDocumentProcessingMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotDocumentProcessingMeta,
  example_code: createProcessingExample('read', '/file/read'),
  example_code_description: 'Read UTF-8 text content from an uploaded file:',
  purpose_sentence: 'reads file contents from supported file-types',
  purpose_verb: 'read',
  purpose_word: 'read files',
  purpose_words: 'Read file contents',
  title: 'Read file contents',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'FileReadRobot',
  priceFactor: 5,
  queueSlotCount: 5,
  minimumCharge: 512000,
}

export const robotFileReadInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/read').describe(`
This <dfn>Robot</dfn> accepts any file, and will read the file using UTF-8 encoding. The result is outputted to \`file.meta.content\` to be accessed in later <dfn>Steps</dfn>.

The <dfn>Robot</dfn> currently only accepts files under 500KB.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotFileReadInstructionsSchema.shape> =
  defineRobot(meta, robotFileReadInstructionsSchema)

export const {
  withHiddenFields: robotFileReadInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotFileReadInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotFileReadInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotFileReadInstructions = Instructions['output']
export type RobotFileReadInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotFileReadInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotFileReadInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotFileReadInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotFileReadInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
