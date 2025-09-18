import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: true,
  bytescount: 1,
  discount_factor: 1,
  discount_pct: 0,
  example_code_description:
    'Auto-rotate individual pages of a documents to the correction orientation:',
  minimum_charge: 2097152,
  output_factor: 1,
  override_lvl1: 'Document Processing',
  purpose_sentence: 'corrects the orientation of documents',
  purpose_verb: 'auto-rotate',
  purpose_word: 'auto-rotate documents',
  purpose_words: 'Auto-rotate documents',
  service_slug: 'document-processing',
  slot_count: 10,
  title: 'Auto-rotate documents to the correct orientation',
  typical_file_size_mb: 0.8,
  typical_file_type: 'document',
  name: 'DocumentAutorotateRobot',
  priceFactor: 1,
  queueSlotCount: 10,
  minimumCharge: 2097152,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotDocumentAutorotateInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/document/autorotate'),
  })
  .strict()

export const robotDocumentAutorotateInstructionsWithHiddenFieldsSchema =
  robotDocumentAutorotateInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotDocumentAutorotateInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotDocumentAutorotateInstructions = z.infer<
  typeof robotDocumentAutorotateInstructionsSchema
>
export type RobotDocumentAutorotateInstructionsWithHiddenFields = z.infer<
  typeof robotDocumentAutorotateInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotDocumentAutorotateInstructionsSchema = interpolateRobot(
  robotDocumentAutorotateInstructionsSchema,
)
export type InterpolatableRobotDocumentAutorotateInstructions =
  InterpolatableRobotDocumentAutorotateInstructionsInput

export type InterpolatableRobotDocumentAutorotateInstructionsInput = z.input<
  typeof interpolatableRobotDocumentAutorotateInstructionsSchema
>

export const interpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotDocumentAutorotateInstructionsWithHiddenFieldsSchema)
export type InterpolatableRobotDocumentAutorotateInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotDocumentAutorotateInstructionsWithHiddenFieldsSchema
>
