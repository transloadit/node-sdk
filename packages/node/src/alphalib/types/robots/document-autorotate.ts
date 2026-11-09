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
  example_code: createProcessingExample('rotated', '/document/autorotate'),
  example_code_description:
    'Auto-rotate individual pages of a documents to the correction orientation:',
  purpose_sentence: 'corrects the orientation of documents',
  purpose_verb: 'auto-rotate',
  purpose_word: 'auto-rotate documents',
  purpose_words: 'Auto-rotate documents',
  title: 'Auto-rotate documents to the correct orientation',
  name: 'DocumentAutorotateRobot',
  minimumCharge: 2097152,
  trackOutputFileSize: true,
}

export const robotDocumentAutorotateInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/document/autorotate'),
  })
  .strict()

export const robotDefinition: RobotDefinition<
  typeof robotDocumentAutorotateInstructionsSchema.shape
> = defineRobot(meta, robotDocumentAutorotateInstructionsSchema)

export const {
  withHiddenFields: robotDocumentAutorotateInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotDocumentAutorotateInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotDocumentAutorotateInstructions = Instructions['output']
export type RobotDocumentAutorotateInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotDocumentAutorotateInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotDocumentAutorotateInstructionsInput =
  Instructions['interpolatableInput']
export type InterpolatableRobotDocumentAutorotateInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
