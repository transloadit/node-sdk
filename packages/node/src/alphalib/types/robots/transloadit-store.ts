import type { RobotMetaInput, RobotSchemaPair } from './_instructions-primitives.ts'

import { z } from 'zod'

import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  example_code: {
    steps: {
      stored: {
        robot: '/transloadit/store',
        use: ':original',
      },
    },
  },
  example_code_description: 'Store uploaded files in Transloadit Storage:',
  has_small_icon: true,
  isAllowedForUrlTransform: false,
  isInternal: false,
  name: 'TransloaditStoreRobot',
  override_lvl1: 'File Exporting',
  priceFactor: 10,
  purpose_sentence: 'stores files privately in Transloadit Storage',
  purpose_verb: 'export',
  purpose_word: 'Transloadit Storage',
  purpose_words: 'Store files in Transloadit Storage',
  queueSlotCount: 2,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  service_slug: 'file-exporting',
  stage: 'beta',
  title: 'Store files in Transloadit Storage',
  trackOutputFileSize: true,
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotTransloaditStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/transloadit/store').describe(`
Stores each input privately in Transloadit Storage.

After \`ASSEMBLY_COMPLETED\`, save the stored result from \`results[producingStep][i]\` with
your application's owner or project record. Keep its \`workspace\`, \`asset_id\`, \`version_id\` and returned \`path\`.
A Step storing \`:original\` reports in \`results[':original']\`.

Collisions fail by default; explicit renaming can change the final path. Use the asset and version
IDs with 🤖/transloadit/import to reuse exact retained bytes after a native catalog rename or overwrite.
A path selects the current location; an asset ID without a version selects its current bytes.
Deleting an asset or removing a retained version makes that reference unavailable.
`),
    conflict_strategy: z
      .enum(['error', 'overwrite', 'rename'])
      .default('error')
      .describe(`
Chooses how to handle an existing destination. By default, an occupied path fails. Select
\`rename\` to allocate a different filename, or \`overwrite\` to create a new version of the
existing asset. Always save the returned asset identity, version and final path.
`),
    path: z
      .string()
      .default('${file.url_name}')
      .describe(`
Sets the destination path inside your Transloadit Storage workspace, relative to its root: a
filename, or folders and a filename such as \`website/hero.jpg\`. Folders that do not exist yet
are created.
`),
  })
  .strict()

export const robotTransloaditStoreInstructionsWithHiddenFieldsSchema =
  robotTransloaditStoreInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotTransloaditStoreInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotTransloaditStoreInstructions = z.infer<
  typeof robotTransloaditStoreInstructionsSchema
>
export type RobotTransloaditStoreInstructionsWithHiddenFields = z.infer<
  typeof robotTransloaditStoreInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotTransloaditStoreInstructionsSchema = interpolateRobot(
  robotTransloaditStoreInstructionsSchema,
)
export type InterpolatableRobotTransloaditStoreInstructions =
  InterpolatableRobotTransloaditStoreInstructionsInput

export type InterpolatableRobotTransloaditStoreInstructionsInput = z.input<
  typeof interpolatableRobotTransloaditStoreInstructionsSchema
>

export const interpolatableRobotTransloaditStoreInstructionsWithHiddenFieldsSchema =
  interpolateRobot(robotTransloaditStoreInstructionsWithHiddenFieldsSchema)
export type InterpolatableRobotTransloaditStoreInstructionsWithHiddenFields =
  InterpolatableRobotTransloaditStoreInstructionsWithHiddenFieldsInput
export type InterpolatableRobotTransloaditStoreInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotTransloaditStoreInstructionsWithHiddenFieldsSchema
>

export const robotDefinition: RobotSchemaPair<
  typeof interpolatableRobotTransloaditStoreInstructionsSchema,
  typeof interpolatableRobotTransloaditStoreInstructionsWithHiddenFieldsSchema
> = {
  meta,
  interpolatable: interpolatableRobotTransloaditStoreInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotTransloaditStoreInstructionsWithHiddenFieldsSchema,
}
