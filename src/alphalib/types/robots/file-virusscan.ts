import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import { interpolateRobot, robotBase, robotUse } from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  allowed_for_url_transform: false,
  bytescount: 1,
  description:
    'While 100% security is a myth, having /file/virusscan as a gatekeeper bot helps reject millions of trojans, viruses, malware &amp; other malicious threats before they reach your platform.',
  discount_factor: 1,
  discount_pct: 0,
  example_code: {
    steps: {
      scanned: {
        robot: '/file/virusscan',
        use: ':original',
        error_on_decline: true,
        error_msg: 'At least one of the uploaded files is malicious and was declined',
      },
    },
  },
  example_code_description:
    'Scan uploaded files and throw an error if a malicious file is detected:',
  minimum_charge: 1048576,
  ogimage: '/assets/images/robots/ogimages/file-virusscan.jpg',
  output_factor: 1,
  override_lvl1: 'File Filtering',
  purpose_sentence:
    'rejects millions of trojans, viruses, malware &amp; other malicious threats before they reach your platform',
  purpose_verb: 'scan',
  purpose_word: 'scan for viruses and reject malware',
  purpose_words: 'Scan files for viruses',
  service_slug: 'file-filtering',
  slot_count: 38,
  title: 'Scan files for viruses',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'FileVirusscanRobot',
  priceFactor: 1,
  queueSlotCount: 38,
  minimumCharge: 1048576,
  lazyLoad: true,
  installVersionFile: process.env.API2_CLAMD_INSTALL_VERSION_FILE || '',
  isAllowedForUrlTransform: false,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
}

export const robotFileVirusscanInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/virusscan').describe(`
      This <dfn>Robot</dfn> is built on top of [ClamAV](https://www.clamav.net/), the best open source antivirus engine available. We update its signatures on a daily basis.

By default, this <dfn>Robot</dfn> excludes all malicious files from further processing without any additional notification. This behavior can be changed by setting \`error_on_decline\` to \`true\`, which will stop <dfn>Assemblies</dfn> as soon as malicious files are found. Such <dfn>Assemblies</dfn> will then be marked with an error.

We allow the use of industry standard [EICAR files](https://www.eicar.org/download-anti-malware-testfile/) for integration testing without needing to use potentially dangerous live virus samples.
`),
    error_on_decline: z
      .boolean()
      .default(false)
      .describe(`
If this is set to \`true\` and one or more files are declined, the Assembly will be stopped and marked with an error.
`),
    error_msg: z
      .string()
      .default('One of your files was declined')
      .describe(`
The error message shown to your users (such as by Uppy) when a file is declined and \`error_on_decline\` is set to \`true\`.
`),
  })
  .strict()

export const robotFileVirusscanInstructionsWithHiddenFieldsSchema =
  robotFileVirusscanInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotFileVirusscanInstructionsSchema.shape.result])
      .optional(),
    can_use_daemon_fallback: z
      .boolean()
      .optional()
      .describe(`
Allow the robot to use a daemon fallback mechanism if the primary scanning method fails.
`),
  })

export type RobotFileVirusscanInstructions = z.infer<typeof robotFileVirusscanInstructionsSchema>
export type RobotFileVirusscanInstructionsWithHiddenFields = z.infer<
  typeof robotFileVirusscanInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFileVirusscanInstructionsSchema = interpolateRobot(
  robotFileVirusscanInstructionsSchema,
)
export type InterpolatableRobotFileVirusscanInstructions =
  InterpolatableRobotFileVirusscanInstructionsInput

export type InterpolatableRobotFileVirusscanInstructionsInput = z.input<
  typeof interpolatableRobotFileVirusscanInstructionsSchema
>

export const interpolatableRobotFileVirusscanInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFileVirusscanInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFileVirusscanInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFileVirusscanInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFileVirusscanInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFileVirusscanInstructionsWithHiddenFieldsSchema
>
