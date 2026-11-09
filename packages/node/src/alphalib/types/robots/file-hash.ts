import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import { fileHashOptionsSchema } from '../fileHash.ts'
import {
  createProcessingExample,
  defineRobot,
  robotBase,
  robotMediaCatalogingMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotMediaCatalogingMeta,
  example_code: createProcessingExample('hashed', '/file/hash', {
    algorithm: 'sha1',
  }),
  example_code_description: 'Hash each uploaded file using the SHA-1 algorithm:',
  purpose_sentence: 'hashes files in Assemblies',
  purpose_verb: 'hash',
  purpose_word: 'file',
  purpose_words: 'Hash files',
  title: 'Hash Files',
  name: 'FileHashRobot',
  priceFactor: 5,
  queueSlotCount: 60,
  isAllowedForUrlTransform: false,
}

export const robotFileHashInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/hash').describe(`
This <dfn>Robot</dfn> allows you to hash any file as part of the <dfn>Assembly</dfn> execution process. This can be useful for verifying the integrity of a file for example.
`),
    algorithm: fileHashOptionsSchema.shape.algorithm.describe(`
The hashing algorithm to use.

The file hash is exported as \`file.meta.hash\`.
`),
    partial: fileHashOptionsSchema.shape.partial.describe(`
Specifies which portion of the file to hash. This is useful for fast fingerprinting of large files.

- \`"full"\` (default): Hash the entire file.
- \`"first"\`: Hash only the first N bytes (specified by \`partial_size\`).
- \`"last"\`: Hash only the last N bytes (specified by \`partial_size\`).
- \`"both"\`: Hash the first N bytes concatenated with the last N bytes.

When using partial hashing, \`file.meta.hash_partial\` indicates the mode used, and \`file.meta.hash_partial_size\` indicates the number of bytes hashed from each portion.
`),
    partial_size: fileHashOptionsSchema.shape.partialSize.describe(`
The number of bytes to hash when using partial hashing. Defaults to \`${fileHashOptionsSchema.shape.partialSize.parse(undefined)}\` (1 MB).

This parameter is only used when \`partial\` is set to \`"first"\`, \`"last"\`, or \`"both"\`.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotFileHashInstructionsSchema.shape> =
  defineRobot(meta, robotFileHashInstructionsSchema)

export const {
  withHiddenFields: robotFileHashInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotFileHashInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotFileHashInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotFileHashInstructions = Instructions['output']
export type RobotFileHashInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotFileHashInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotFileHashInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotFileHashInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotFileHashInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
