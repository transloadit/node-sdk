import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  defineRobot,
  httpHeaderSafetyDescription,
  httpUrlSchema,
  robotBase,
  robotCodeEvaluationMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotCodeEvaluationMeta,
  example_code: {
    steps: {
      request: {
        robot: '/http/request',
        method: 'POST',
        payload: 'metadata',
        url: 'https://example.com/transloadit/files',
        use: [],
      },
    },
  },
  example_code_description: 'Ask your application which input files should continue:',
  extended_description: `
Use this <dfn>Robot</dfn> when your application should inspect the current Assembly state or input
files during an Assembly and return which input files should continue to later, statically declared
Steps, or return new result-file URLs that Transloadit should download and emit from this Step.

Request format:

- \`payload: "none"\` sends no request body.
- \`payload: "metadata"\` sends \`application/json\` with \`assembly\`, \`fields\`,
  \`previous_step\`, \`file\`, and \`files\`.
- \`payload: "file"\` sends \`multipart/form-data\` with a \`payload\` JSON field and the first input
  file as form part \`file\`.
- \`payload: "files"\` sends \`multipart/form-data\` with a \`payload\` JSON field and all input files
  as repeated form parts named \`files[]\`.

Your endpoint must respond with a 2xx status. It can return an empty body, \`[]\`, a single file
object, an array of file objects, or an object with \`files\` as an array or object map. Returned
files must include either:

- \`path\`: Selects an input file path that was sent in the request payload.
- \`url\`: Downloads a new HTTP(S) result file and emits it from this Step.

The response never changes the Assembly flow. To process returned files, declare the following Steps
in the Assembly Template and use this Step as their input.
`,
  override_lvl1: 'Workflow Automation',
  purpose_sentence:
    'calls your application during an Assembly and emits returned input file references',
  purpose_verb: 'run',
  purpose_word: 'HTTP endpoint',
  purpose_words: 'Call HTTP endpoints',
  title: 'Call HTTP endpoints during Assemblies',
  name: 'HttpRequestRobot',
  queueSlotCount: 1,
  stage: 'alpha',
}

const headerValue = z.union([z.boolean(), z.number(), z.string(), z.null()])
export const robotHttpRequestInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/http/request').describe(`
Calls an HTTP endpoint during the Assembly and expects optional JSON describing zero or more input
files or result-file URLs to emit from this Step.

Your endpoint must return a 2xx response. An empty body, \`[]\`, or \`{ "files": [] }\` means this
Step emits no files. You can also return one file object, an array of file objects, or
\`{ "files": [...] }\` / \`{ "files": { "name": {...} } }\`. Returned file objects must include
either a \`path\` that matches one of the input file paths sent to your endpoint, or an HTTP(S)
\`url\` that Transloadit downloads and emits as a new result file.
`),
    url: httpUrlSchema.describe(`
The HTTP or HTTPS endpoint to call.
`),
    method: z
      .enum(['DELETE', 'GET', 'PATCH', 'POST', 'PUT'])
      .default('POST')
      .describe(`
HTTP method to use for the request.
`),
    payload: z
      .enum(['none', 'metadata', 'file', 'files'])
      .default('none')
      .describe(`
Controls what is sent to your endpoint.

- \`none\`: Send no request body.
- \`metadata\`: Send a JSON body with Assembly metadata, fields, the previous Step, and file metadata.
- \`file\`: Send multipart form data with a \`payload\` JSON field and the first input file as a
  \`file\` part.
- \`files\`: Send multipart form data with a \`payload\` JSON field and all input files as repeated
  \`files[]\` parts. Useful with \`bundle_steps\`.

The \`payload\` JSON object contains \`assembly\`, \`fields\`, \`previous_step\`, \`file\`, and
\`files\`. \`file\` is the first input file’s metadata or \`null\`; \`files\` is an array of input
file metadata.
`),
    headers: z
      .union([
        z.array(z.string()),
        z.array(z.record(headerValue)),
        z.record(headerValue),
        z.string(),
      ])
      .default([])
      .describe(`
Custom request headers.

Headers can be specified as an array of strings in the format \`"Header-Name: value"\`, an array
of objects, an object map, or a JSON string that will be parsed into an object/array.

${httpHeaderSafetyDescription}
`),
    timeout: z
      .number()
      .int()
      .positive()
      .max(300)
      .default(60)
      .describe(`
Maximum number of seconds to wait for the HTTP request.

The effective timeout is the lower of this value and Transloadit’s server-side cap. The cap is 30
seconds plus 1 second per MiB sent to your endpoint.
`),
    max_response_size: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024)
      .default(1024 * 1024)
      .describe(`
Maximum accepted response size in bytes. The response should normally be a small JSON document.
`),
    max_result_files: z
      .number()
      .int()
      .positive()
      .max(100)
      .default(10)
      .describe(`
Maximum number of files that the endpoint may return.
`),
    max_result_file_size: z
      .number()
      .int()
      .positive()
      .max(5 * 1024 * 1024 * 1024)
      .default(100 * 1024 * 1024)
      .describe(`
Maximum allowed size in bytes for each result file returned by URL. If the remote server reports a
larger file size, the result download is rejected before it starts. If the remote server does not
report a size upfront, the download is aborted once this limit is exceeded.
`),
    result_download_timeout: z
      .number()
      .int()
      .positive()
      .max(600)
      .default(120)
      .describe(`
Maximum number of seconds to spend downloading each result file returned by URL.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotHttpRequestInstructionsSchema.shape> =
  defineRobot(meta, robotHttpRequestInstructionsSchema)

export const {
  withHiddenFields: robotHttpRequestInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotHttpRequestInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotHttpRequestInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotHttpRequestInstructions = Instructions['output']
export type RobotHttpRequestInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotHttpRequestInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotHttpRequestInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotHttpRequestInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotHttpRequestInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
