import type { RobotMetaInput } from './_instructions-primitives.ts'

import { z } from 'zod'

import { damIdSchema } from '../storageAsset.ts'
import { interpolateRobot, interpolationSchemaFull, recursive, robotBase, robotImport } from './_instructions-primitives.ts'

/** Cross-field validation runs after interpolation-aware parsing at the Assembly Step boundary. */
export function refineTransloaditImportSelector(
  step: { robot: string; path?: unknown; asset_id?: unknown; version_id?: unknown; recursive?: unknown },
  context: z.RefinementCtx,
): void {
  if (step.robot !== '/transloadit/import') return
  const hasPath = step.path !== undefined
  const hasAsset = step.asset_id !== undefined
  if (hasPath === hasAsset || (step.version_id !== undefined && !hasAsset)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [step.version_id !== undefined && !hasAsset ? 'version_id' : 'asset_id'],
      message: 'Select either path, or asset_id with an optional version_id.',
    })
  }
  if (hasAsset && step.recursive === true) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recursive'],
      message: 'Recursive imports require a path, not an asset_id.',
    })
  }
}

export const meta: RobotMetaInput = {
  bytescount: 10,
  discount_factor: 0.1,
  discount_pct: 90,
  example_code: {
    steps: {
      imported: {
        robot: '/transloadit/import',
        path: 'photos/cat.jpg',
      },
    },
  },
  example_code_description: 'Import a file from Transloadit Storage:',
  has_small_icon: true,
  isAllowedForUrlTransform: true,
  isInternal: false,
  minimum_charge: 0,
  name: 'TransloaditImportRobot',
  output_factor: 1,
  override_lvl1: 'File Importing',
  priceFactor: 10,
  purpose_sentence: 'imports files from Transloadit Storage',
  purpose_verb: 'import',
  purpose_word: 'Transloadit Storage',
  purpose_words: 'Import files from Transloadit Storage',
  queueSlotCount: 10,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: true,
  service_slug: 'file-importing',
  slot_count: 10,
  stage: 'beta',
  title: 'Import files from Transloadit Storage',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotTransloaditImportInstructionsSchema = robotBase
  .merge(robotImport)
  .extend({
    robot: z.literal('/transloadit/import').describe(`
Imports files from your Workspace's Transloadit Storage. Select a mutable location with
\`path\`, or a logical asset with \`asset_id\`. Add \`version_id\` to pin the exact stored bytes.
IDs remain subject to Workspace access and version retention.
`),
    path: z
      .string()
      .optional()
      .describe(`
The current file or folder location, for example \`photos/cat.jpg\`. Use either \`path\` or
\`asset_id\`, not both. Renaming makes an old path stale; overwriting changes what it imports.
`),
    asset_id: damIdSchema.optional().describe(`
The stored asset's stable ID. Without \`version_id\`, imports its current version even after
renaming or moving it. Cannot be combined with \`path\` or recursive folder imports.
`),
    version_id: damIdSchema.optional().describe(`
The exact retained version of \`asset_id\` to import. Requires \`asset_id\`; a missing or deleted
version never falls back to the current version.
`),
    recursive: recursive.describe(`
Whether to import files from subfolders and sub-subfolders when \`path\` is a folder. By default
only the folder's own files are imported.
`),
  })
  .strict()

export const robotTransloaditImportInstructionsWithHiddenFieldsSchema =
  robotTransloaditImportInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotTransloaditImportInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotTransloaditImportInstructions = z.infer<
  typeof robotTransloaditImportInstructionsSchema
>
export type RobotTransloaditImportInstructionsWithHiddenFields = z.infer<
  typeof robotTransloaditImportInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotTransloaditImportInstructionsSchema = interpolateRobot(
  robotTransloaditImportInstructionsSchema,
).extend({
  // The generic boolean interpolator changes literal false to true. Keep Storage's documented
  // false default intact; unresolved variables are validated after uploader interpolation.
  recursive: z.union([recursive, interpolationSchemaFull]),
})
export type InterpolatableRobotTransloaditImportInstructions =
  InterpolatableRobotTransloaditImportInstructionsInput

export type InterpolatableRobotTransloaditImportInstructionsInput = z.input<
  typeof interpolatableRobotTransloaditImportInstructionsSchema
>

export const interpolatableRobotTransloaditImportInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotTransloaditImportInstructionsWithHiddenFieldsSchema).extend({
    recursive: interpolatableRobotTransloaditImportInstructionsSchema.shape.recursive,
  })
export type InterpolatableRobotTransloaditImportInstructionsWithHiddenFields =
  InterpolatableRobotTransloaditImportInstructionsWithHiddenFieldsInput
export type InterpolatableRobotTransloaditImportInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotTransloaditImportInstructionsWithHiddenFieldsSchema
>
