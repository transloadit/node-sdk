import { z } from 'zod'

import type { RobotMetaInput } from './_instructions-primitives.ts'
import {
  filterCondition,
  interpolateRobot,
  robotBase,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  bytescount: 0,
  discount_factor: 0,
  discount_pct: 100,
  example_code: {
    steps: {
      filtered: {
        robot: '/file/filter',
        use: ':original',
        declines: [['${file.size}', '>', '20mb']],
        error_on_decline: true,
        error_msg: 'File size must not exceed 20 MB',
      },
    },
  },
  example_code_description: 'Reject files that are larger than 20 MB:',
  minimum_charge: 0,
  output_factor: 1,
  override_lvl1: 'File Filtering',
  purpose_sentence: 'directs files to different encoding Steps based on your conditions',
  purpose_verb: 'filter',
  purpose_word: 'filter',
  purpose_words: 'Filter files',
  service_slug: 'file-filtering',
  slot_count: 0,
  title: 'Filter files',
  typical_file_size_mb: 1.2,
  typical_file_type: 'file',
  name: 'FileFilterRobot',
  priceFactor: 100,
  queueSlotCount: 0,
  downloadInputFiles: false,
  preserveInputFileUrls: true,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: true,
  isInternal: false,
  removeJobResultFilesFromDiskRightAfterStoringOnS3: false,
  stage: 'ga',
}

export const robotFileFilterInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/filter').describe(`
Think of this <dfn>Robot</dfn> as an \`if/else\` condition for building advanced file conversion workflows. With it, you can filter and direct certain uploaded files depending on their metadata.

The <dfn>Robot</dfn> has two modes of operation:

- Constructing conditions out of arrays with 3 members each. For example, \`["\${file.size}", "<=", "720"]\`
- Writing conditions in JavaScript. For example, \`\${file.size <= 720}\`. See also [Dynamic Evaluation](/docs/topics/dynamic-evaluation/).

Passing JavaScript allows you to implement logic as complex as you wish, however it’s slower than combining arrays of conditions, and will be charged for per invocation via [🤖/script/run](/docs/robots/script-run/).

### Conditions as arrays

The \`accepts\` and \`declines\` parameters can each be set to an array of arrays with three members:

1. A value or job variable, such as \`\${file.mime}\`
2. One of the following operators: \`==\`, \`===\`, \`<\`, \`>\`, \`<=\`, \`>=\`, \`!=\`, \`!==\`, \`regex\`, \`!regex\`, \`includes\`, \`!includes\`
3. A value or job variable, such as \`50\` or \`"foo"\`

Examples:

- \`[["\${file.meta.width}", ">", "\${file.meta.height}"]]\`
- \`[["\${file.size}", "<=", "720"]]\`
- \`[["\${file.size}", ">", "20mb"]]\`
- \`[["720", ">=", "\${file.size}"]]\`
- \`[["\${file.mime}", "regex", "image"]]\`

When you match against \`\${file.mime}\`, the value is typically based on Transloadit’s
server-side metadata extraction in the normal upload flow, rather than only the MIME type reported
by the client or browser. This makes \`/file/filter\` suitable for rejecting mislabeled files.
Depending on the file container and the detection tools involved, some formats may be reported under
closely related MIME types such as \`image/heic\` or \`image/heif\`.

If you only want formats that browsers consistently render, prefer an explicit allowlist such as
\`^(image/jpeg|image/png|image/gif|image/webp|image/avif)$\` over a broad \`^image/\` rule.

For numeric comparisons (\`<\`, \`>\`, \`<=\`, \`>=\`), you can use human-readable byte values such as \`"20mb"\`, \`"1gb"\`, or \`"512kb"\`. These use binary (1024-based) multipliers. Supported units: \`b\`, \`kb\`, \`mb\`, \`gb\`, \`tb\`, \`pb\` (and their IEC equivalents \`kib\`, \`mib\`, \`gib\`, \`tib\`, \`pib\`).

The \`includes\` and \`!includes\` operators work with arrays or strings (strings use substring checks).

> [!Warning]
> If you would like to match against a \`null\` value or a value that is not present (like an audio file does not have a \`video_codec\` property in its metadata), match against \`""\` (an empty string) instead. We’ll support proper matching against \`null\` in the future, but we cannot easily do so right now without breaking backwards compatibility.

### Conditions as JavaScript

The \`accepts\` and \`declines\` parameters can each be set to strings of JavaScript, which return a boolean value.

Examples:

- \`\${file.meta.width > file.meta.height}\`
- \`\${file.size <= 720}\`
- \`\${/image/.test(file.mime)}\`
- \`\${Math.max(file.meta.width, file.meta.height) > 100}\`

As indicated, we charge for this via [🤖/script/run](/docs/robots/script-run/). See also [Dynamic Evaluation](/docs/topics/dynamic-evaluation/) for more details on allowed syntax and behavior.
`),
    accepts: filterCondition
      .describe(
        `
Files that match at least one requirement will be accepted, or declined otherwise. If the value is \`null\`, all files will be accepted. If the array is empty, no files will be accepted. Examples:

\`[["\${file.mime}", "==", "image/gif"]]\`
\`[["\${file.size}", "<", "5kb"]]\`

For numeric comparisons (\`<\`, \`>\`, \`<=\`, \`>=\`), human-readable byte values such as \`"20mb"\`, \`"1gb"\`, or \`"512kb"\` are supported.

If the \`condition_type\` parameter is set to \`"and"\`, then all requirements must match for the file to be accepted.

If \`accepts\` and \`declines\` are both provided, the requirements in \`accepts\` will be evaluated first, before the conditions in \`declines\`.
`,
      )
      .optional(),
    declines: filterCondition
      .describe(
        `
Files that match at least one requirement will be declined, or accepted otherwise. If the value is \`null\` or an empty array, no files will be declined. Examples:

\`[["\${file.size}", ">", "1024"]]\`
\`[["\${file.size}", ">", "20mb"]]\`

For numeric comparisons (\`<\`, \`>\`, \`<=\`, \`>=\`), human-readable byte values such as \`"20mb"\`, \`"1gb"\`, or \`"512kb"\` are supported.

If the \`condition_type\` parameter is set to \`"and"\`, then all requirements must match for the file to be declined.

If \`accepts\` and \`declines\` are both provided, the requirements in \`accepts\` will be evaluated first, before the conditions in \`declines\`.
`,
      )
      .optional(),
    condition_type: z
      .enum(['and', 'or'])
      .default('or')
      .describe(`
Specifies the condition type according to which the members of the \`accepts\` or \`declines\` arrays should be evaluated. Can be \`"or"\` or \`"and"\`.
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

export const robotFileFilterInstructionsWithHiddenFieldsSchema =
  robotFileFilterInstructionsSchema.extend({
    result: z
      .union([z.literal('debug'), robotFileFilterInstructionsSchema.shape.result])
      .optional(),
  })

export type RobotFileFilterInstructions = z.infer<typeof robotFileFilterInstructionsSchema>
export type RobotFileFilterInstructionsWithHiddenFields = z.infer<
  typeof robotFileFilterInstructionsWithHiddenFieldsSchema
>

export const interpolatableRobotFileFilterInstructionsSchema = interpolateRobot(
  robotFileFilterInstructionsSchema,
)
export type InterpolatableRobotFileFilterInstructions =
  InterpolatableRobotFileFilterInstructionsInput

export type InterpolatableRobotFileFilterInstructionsInput = z.input<
  typeof interpolatableRobotFileFilterInstructionsSchema
>

export const interpolatableRobotFileFilterInstructionsWithHiddenFieldsSchema = interpolateRobot(
  robotFileFilterInstructionsWithHiddenFieldsSchema,
)
export type InterpolatableRobotFileFilterInstructionsWithHiddenFields = z.infer<
  typeof interpolatableRobotFileFilterInstructionsWithHiddenFieldsSchema
>
export type InterpolatableRobotFileFilterInstructionsWithHiddenFieldsInput = z.input<
  typeof interpolatableRobotFileFilterInstructionsWithHiddenFieldsSchema
>
