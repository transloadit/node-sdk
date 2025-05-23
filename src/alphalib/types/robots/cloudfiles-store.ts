import { z } from 'zod'

import {
  cloudfilesBase,
  interpolateRobot,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
  allowed_for_url_transform: true,
  bytescount: 6,
  discount_factor: 0.15000150001500018,
  discount_pct: 84.99984999849998,
  docs_redirect_from: ['/docs/export-to-rackspace-cloudfiles/'],
  example_code: {
    steps: {
      exported: {
        robot: '/cloudfiles/store',
        use: ':original',
        credentials: 'YOUR_CLOUDFILES_CREDENTIALS',
        path: 'my_target_folder/${unique_prefix}/${file.url_name}',
      },
    },
  },
  example_code_description: 'Export uploaded files to `my_target_folder` on Rackspace Cloud Files:',
  extended_description: `
<a id="export-to-rackspace-cloudfiles" aria-hidden="true"></a>

## A note about URLs

If your container is CDN-enabled, the resulting \`file.url\` indicates the path to the file in your
CDN container, or is \`null\` otherwise.

The storage container URL for this file is always available via \`file.meta.storage_url\`.
`,
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Exporting',
  purpose_sentence: 'exports encoding results to Rackspace Cloud Files',
  purpose_verb: 'export',
  purpose_word: 'Rackspace Cloud Files',
  purpose_words: 'Export files to Rackspace Cloud Files',
  service_slug: 'file-exporting',
  slot_count: 10,
  title: 'Export files to Rackspace Cloud Files',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
}

export const robotCloudfilesStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .merge(cloudfilesBase)
  .extend({
    robot: z.literal('/cloudfiles/store'),
    path: z.string().default('${unique_prefix}/${file.url_name}').describe(`
The path at which to store the file. This value can also contain [Assembly variables](/docs/topics/assembly-instructions/#assembly-variables).
`),
  })
  .strict()

export type RobotCloudfilesStoreInstructions = z.infer<
  typeof robotCloudfilesStoreInstructionsSchema
>
export type RobotCloudfilesStoreInstructionsInput = z.input<
  typeof robotCloudfilesStoreInstructionsSchema
>

export const interpolatableRobotCloudfilesStoreInstructionsSchema = interpolateRobot(
  robotCloudfilesStoreInstructionsSchema,
)
export type InterpolatableRobotCloudfilesStoreInstructions = z.input<
  typeof interpolatableRobotCloudfilesStoreInstructionsSchema
>
