import type {
  RobotDefinition,
  RobotMetaInput,
  RobotSchemaVariantTypes,
} from './_instructions-primitives.ts'

import { z } from 'zod'

import {
  createProcessingExample,
  defineRobot,
  httpUrlSchema,
  robotBase,
  robotStoreMeta,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotStoreMeta,
  example_code: createProcessingExample('exported', '/tus/store', {
    endpoint: 'https://tusd.tusdemo.net/files/',
  }),
  example_code_description: 'Export uploaded files to the Tus live demo server:',
  purpose_sentence: 'exports encoding results to any Tus-compatible server',
  purpose_word: 'Tus servers',
  purpose_words: 'Export files to Tus-compatible servers',
  title: 'Export files to Tus-compatible servers',
  name: 'TusStoreRobot',
  priceFactor: 10,
}

export const robotTusStoreInstructionsSchema = robotBase
  .merge(robotUse)
  .extend({
    robot: z.literal('/tus/store'),
    endpoint: httpUrlSchema.describe('The URL of the destination Tus server').describe(`
The URL of the Tus-compatible server, which you're uploading files to.
`),
    credentials: z
      .string()
      .optional()
      .describe(`
Create <dfn>Template Credentials</dfn> for this <dfn>Robot</dfn> in your [Transloadit account](/c/template-credentials/) and use the name of the <dfn>Template Credentials</dfn> as this parameter's value. For this <dfn>Robot</dfn>, use the HTTP template, which allows request headers to be passed along to the destination server.
`),
    headers: z
      .record(z.string())
      .default({})
      .describe('Headers to pass along to destination')
      .describe(`
Optional extra headers outside of the <dfn>Template Credentials</dfn> can be passed along within this parameter.

Although, we recommend to exclusively use <dfn>Template Credentials</dfn>, this may be necessary if you're looking to use dynamic credentials, which isn't a feature supported by <dfn>Template Credentials</dfn>.
`),
    metadata: z
      .record(z.string())
      .default({ filename: 'example.png', basename: 'example', extension: 'png' })
      .describe(`
Metadata to pass along to destination. Includes some file info by default.
`),
    url_template: z
      .string()
      .optional()
      .describe(`
The URL of the file in the <dfn>Assembly Status JSON</dfn>. The following [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables) are supported. If this is not specified, the upload URL specified by the destination server will be used instead.
`),
    ssl_url_template: z
      .string()
      .optional()
      .describe(`
The SSL URL of the file in the <dfn>Assembly Status JSON</dfn>. The following [Assembly Variables](/docs/topics/assembly-instructions/#assembly-variables) are supported. If this is not specified, the upload URL specified by the destination server will be used instead, as long as it starts with \`https\`.
`),
  })
  .strict()

export const robotDefinition: RobotDefinition<typeof robotTusStoreInstructionsSchema.shape> =
  defineRobot(meta, robotTusStoreInstructionsSchema)

export const {
  withHiddenFields: robotTusStoreInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotTusStoreInstructionsSchema,
  interpolatableWithHiddenFields: interpolatableRobotTusStoreInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotTusStoreInstructions = Instructions['output']
export type RobotTusStoreInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotTusStoreInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotTusStoreInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotTusStoreInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotTusStoreInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
