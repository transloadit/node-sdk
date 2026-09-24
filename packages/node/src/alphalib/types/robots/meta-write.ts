import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { stackVersions } from '../stackVersions.ts'
import {
  createProcessingExample,
  defineRobot,
  robotBase,
  robotFFmpeg,
  robotMediaCatalogingMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotMediaCatalogingMeta,
  example_code: createProcessingExample('attributed', '/meta/write', {
    data_to_write: {
      copyright: '© Transloadit',
    },
    ffmpeg_stack: stackVersions.ffmpeg.recommendedVersion,
  }),
  example_code_description: 'Add a copyright notice to uploaded images:',
  purpose_sentence: 'writes metadata into files',
  purpose_verb: 'write',
  purpose_word: 'write metadata',
  purpose_words: 'Write metadata to media',
  title: 'Write metadata to media',
  uses_tools: ['ffmpeg'],
  name: 'MetaWriteRobot',
  queueSlotCount: 10,
  trackOutputFileSize: true,
}

export const robotMetaWriteInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(robotFFmpeg)
  .extend({
    robot: z.literal('/meta/write').describe(`
**Note:** This <dfn>Robot</dfn> currently accepts images, videos and audio files.
`),
    data_to_write: z
      .record(z.unknown())
      .default({})
      .describe(`
A key/value map defining the metadata to write into the file.

Valid metadata keys can be found [here](https://exiftool.org/TagNames/EXIF.html). For example: \`ProcessingSoftware\`.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotMetaWriteInstructionsSchema.shape> =
  defineRobot(meta, robotMetaWriteInstructionsSchema)

export const {
  withHiddenFields: robotMetaWriteInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotMetaWriteInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotMetaWriteInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotMetaWriteInstructions = Instructions['output']
export type RobotMetaWriteInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotMetaWriteInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotMetaWriteInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotMetaWriteInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotMetaWriteInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
