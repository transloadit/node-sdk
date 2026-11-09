import type { RobotMetaInput, RobotSchemaVariantTypes } from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createRobotSchemaVariants,
  robotBase,
  robotMediaCatalogingMeta,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotMediaCatalogingMeta,
  // api2 tracks /meta/read as a special 1% metadata fee while keeping runtime priceFactor at 0.
  example_code: {
    steps: {
      metadata: {
        robot: '/meta/read',
      },
    },
  },
  example_code_description: 'Read metadata from uploaded files:',
  purpose_sentence: 'reads metadata from uploaded files',
  purpose_verb: 'read',
  purpose_word: 'metadata',
  purpose_words: 'Read file metadata',
  title: 'Read file metadata',
  name: 'MetaReadRobot',
  priceFactor: 0,
  trackOutputFileSize: false,
  isInternal: true,
}

export const robotMetaReadInstructionsSchema = robotBase
  .extend({
    robot: z.literal('/meta/read').describe('Reads metadata from a file.'),
  })
  .strict()

export type RobotMetaReadInstructions = z.infer<typeof robotMetaReadInstructionsSchema>

const schemaVariants: ReturnType<
  typeof createRobotSchemaVariants<typeof robotMetaReadInstructionsSchema.shape>
> = createRobotSchemaVariants(robotMetaReadInstructionsSchema)
export const {
  withHiddenFields: robotMetaReadInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotMetaReadInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotMetaReadInstructionsWithHiddenFieldsSchema,
} = schemaVariants
type Instructions = RobotSchemaVariantTypes<typeof schemaVariants>

export type InterpolatableRobotMetaReadInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotMetaReadInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotMetaReadInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenInput']
