import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createProcessingExample,
  defineRobot,
  filterCondition,
  robotBase,
  robotFileFilteringMeta,
  robotParameterDocs,
  robotUse,
} from './_instructions-primitives.ts'

export type {
  FilterCondition,
  FilterConditionOperator,
  FilterConditionPart,
} from './_instructions-primitives.ts'

export {
  filterConditionOperatorSchema,
  filterConditionPartSchema,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotFileFilteringMeta,
  example_code: createProcessingExample('filtered', '/file/filter', {
    declines: [['${file.size}', '>', '20mb']],
    error_on_decline: true,
    error_msg: 'File size must not exceed 20 MB',
  }),
  example_code_description: 'Reject files that are larger than 20 MB:',
  purpose_sentence: 'directs files to different encoding Steps based on your conditions',
  purpose_verb: 'filter',
  purpose_word: 'filter',
  purpose_words: 'Filter files',
  title: 'Filter files',
  name: 'FileFilterRobot',
  priceFactor: 100,
  queueSlotCount: 0,
  downloadInputFiles: false,
  preserveInputFileUrls: true,
}

export const robotFileFilterInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/file/filter').describe(`
Think of this <dfn>Robot</dfn> as an \`if/else\` condition for building advanced file conversion workflows. With it, you can filter and direct certain uploaded files depending on their metadata.

The <dfn>Robot</dfn> has two modes of operation:

- Constructing conditions out of arrays with 3 members each. For example, \`["\${file.size}", "<=", "720"]\`
- Writing conditions in JavaScript. For example, \`\${file.size <= 720}\`. See also [Dynamic Evaluation](/docs/topics/dynamic-evaluation/).

If you want a \`/file/filter\` Step to pass every input file through unchanged, leave \`accepts\` and
\`declines\` unset, or set them to \`null\`. Do not use \`"accepts": "true"\` for this: plain strings
are treated as JavaScript expressions only when they use the \`\${...}\` form, such as \`"\${true}"\`.

Passing JavaScript allows you to implement logic as complex as you wish, however it’s slower than combining arrays of conditions, and will be charged for per invocation via [🤖/script/run](/docs/robots/script-run/).

### Conditions as arrays

The \`accepts\` and \`declines\` parameters can each be set to an array of arrays with three members:

1. A value or job variable, such as \`\${file.mime}\`
2. One of the following operators: \`=\`, \`==\`, \`===\`, \`<\`, \`>\`, \`<=\`, \`>=\`, \`!=\`, \`!==\`, \`regex\`, \`!regex\`, \`includes\`, \`!includes\`, \`empty\`, \`!empty\`
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
Files that match at least one requirement will be accepted, or declined otherwise. If the value is \`null\`, all files will be accepted. If the array is empty, no files will be accepted. Omit this parameter or set it to \`null\` when you want the Step to pass every file through. Examples:

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
      .describe(robotParameterDocs.error_on_decline.description),
    error_msg: z
      .string()
      .default('One of your files was declined')
      .describe(robotParameterDocs.error_msg.description),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotFileFilterInstructionsSchema.shape> =
  defineRobot(meta, robotFileFilterInstructionsSchema)

export const {
  withHiddenFields: robotFileFilterInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotFileFilterInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotFileFilterInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotFileFilterInstructions = Instructions['output']
export type RobotFileFilterInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotFileFilterInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotFileFilterInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotFileFilterInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotFileFilterInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
