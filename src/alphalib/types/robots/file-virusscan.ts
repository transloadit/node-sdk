import { z } from 'zod'

import { useParamSchema } from './_instructions-primitives.ts'
import type { RobotMeta } from './_instructions-primitives.ts'

export const meta: RobotMeta = {
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
}

export const robotFileVirusscanInstructionsSchema = z
  .object({
    robot: z.literal('/file/virusscan'),
    use: useParamSchema,
    error_on_decline: z.boolean().default(false).describe(`
If this is set to \`true\` and one or more files are declined, the Assembly will be stopped and marked with an error.
`),
    error_msg: z.string().default('One of your files was declined').describe(`
The error message shown to your users (such as by Uppy) when a file is declined and \`error_on_decline\` is set to \`true\`.
`),
  })
  .strict()

export type RobotFileVirusscanInstructions = z.infer<typeof robotFileVirusscanInstructionsSchema>
