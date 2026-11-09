import type {
  RobotDefinitionWithHiddenFields,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createProcessingExample,
  defineRobotWithHiddenFields,
  robotBase,
  robotCodeEvaluationMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotCodeEvaluationMeta,
  example_code: createProcessingExample('evaluate', '/script/run', {
    script:
      '({ width: file.meta.width, height: file.meta.height, area: file.meta.width * file.meta.height })',
  }),
  example_code_description: 'Run JavaScript against uploaded file metadata:',
  purpose_sentence: 'runs scripts in Assemblies',
  purpose_verb: 'run',
  purpose_word: 'script',
  purpose_words: 'Run scripts in Assemblies',
  title: 'Run Scripts',
  typical_file_size_mb: 0.0001,
  name: 'ScriptRunRobot',
  priceFactor: 10,
  queueSlotCount: 5,
  isAllowedForUrlTransform: true,
  trackOutputFileSize: false,
}

export const robotScriptRunInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/script/run').describe(`
This <dfn>Robot</dfn> allows you to run arbitrary \`JavaScript\` as part of the <dfn>Assembly</dfn>
execution process. The <dfn>Robot</dfn> is invoked automatically when there are <dfn>Assembly
Instructions</dfn> containing \`\${...}\`:

\`\`\`json
{
  "robot": "/image/resize",
  "width": "\${Math.max(file.meta.width, file.meta.height)}"
}
\`\`\`

You can also invoke this <dfn>Robot</dfn> directly, leaving out the \`\${...}\`:

\`\`\`json
{
  "robot": "/script/run",
  "script": "Math.max(file.meta.width, file.meta.height)"
}
\`\`\`

When accessing arrays, the syntax is the same as in any JavaScript program:

\`\`\`json
{
  "robot": "/image/resize",
  "width": "\${file.meta.faces[0].width * 2}"
}
\`\`\`

Compared to only accessing an <dfn>Assembly Variable</dfn>:

\`\`\`json
{
  "robot": "/image/resize",
  "width": "\${file.meta.faces[0].width}"
}
\`\`\`

For more information, see [Dynamic Evaluation](/docs/topics/dynamic-evaluation/).
`),
    script: z.string().describe(`
A string of JavaScript to evaluate. It has access to all JavaScript features available in a modern browser environment.

The script is expected to return a \`JSON.stringify\`-able value in the same tick, so no \`await\` or callbacks are allowed (yet).

If the script does not finish within 1000ms it times out with an error. The return value or error is exported as \`file.meta.result\`. If there was an error, \`file.meta.isError\` is \`true\`. Note that the <dfn>Assembly</dfn> will not crash in this case. If you need it to crash, you can check this value with a [🤖/file/filter](/docs/robots/file-filter/) <dfn>Step</dfn>, setting \`error_on_decline\` to \`true\`.

You can check whether evaluating this script was free by inspecting \`file.meta.isFree\`. It is recommended to do this during development as to not see sudden unexpected costs in production.
`),
  })
  .strict()

const hiddenFields = {
  contextJSON: z
    .string()
    .optional()
    .describe(`
A JSON string that provides additional context data to the script. This will be parsed and made available to the script as a \`context\` variable. For example, if you pass \`'{"foo":{"bar":"baz"}}'\`, the script can access \`context.foo.bar\` to get the value \`"baz"\`.
`),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotScriptRunInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotScriptRunInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotScriptRunInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotScriptRunInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotScriptRunInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotScriptRunInstructions = Instructions['output']
export type RobotScriptRunInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotScriptRunInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotScriptRunInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotScriptRunInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotScriptRunInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
