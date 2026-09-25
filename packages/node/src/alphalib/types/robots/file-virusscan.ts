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
  robotFileFilteringMeta,
  robotParameterDocs,
  robotUse,
} from './_instructions-primitives.ts'

export const meta: RobotMetaInput = {
  ...robotFileFilteringMeta,
  description:
    'While 100% security is a myth, having /file/virusscan as a gatekeeper bot helps reject millions of trojans, viruses, malware & other malicious threats before they reach your platform.',
  example_code: createProcessingExample('scanned', '/file/virusscan', {
    error_on_decline: true,
    error_msg: 'At least one of the uploaded files is malicious and was declined',
  }),
  example_code_description:
    'Scan uploaded files and throw an error if a malicious file is detected:',
  ogimage: '/assets/images/robots/ogimages/file-virusscan.jpg',
  purpose_sentence:
    'rejects millions of trojans, viruses, malware & other malicious threats before they reach your platform',
  purpose_verb: 'scan',
  purpose_word: 'scan for viruses and reject malware',
  purpose_words: 'Scan files for viruses',
  title: 'Scan files for viruses',
  name: 'FileVirusscanRobot',
  queueSlotCount: 16,
  preserveInputFileUrls: true,
  minimumCharge: 1048576,
  lazyLoad: true,
  installVersionFile:
    typeof process !== 'undefined' && process.env.API2_CLAMD_INSTALL_VERSION_FILE
      ? process.env.API2_CLAMD_INSTALL_VERSION_FILE
      : '',
  isAllowedForUrlTransform: false,
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
      .describe(robotParameterDocs.error_on_decline.description),
    error_msg: z
      .string()
      .default('One of your files was declined')
      .describe(robotParameterDocs.error_msg.description),
  })
  .strict()

const hiddenFields = {
  can_use_daemon_fallback: z
    .boolean()
    .optional()
    .describe(`
Allow the robot to use a daemon fallback mechanism if the primary scanning method fails.
`),
}

export const robotDefinition: RobotDefinitionWithHiddenFields<
  typeof robotFileVirusscanInstructionsSchema.shape,
  typeof hiddenFields
> = defineRobotWithHiddenFields(meta, robotFileVirusscanInstructionsSchema, hiddenFields)

export const {
  withHiddenFields: robotFileVirusscanInstructionsWithHiddenFieldsSchema,
  interpolatable: interpolatableRobotFileVirusscanInstructionsSchema,
  interpolatableWithHiddenFields:
    interpolatableRobotFileVirusscanInstructionsWithHiddenFieldsSchema,
} = robotDefinition

type Instructions = RobotSchemaVariantTypes<typeof robotDefinition>

export type RobotFileVirusscanInstructions = Instructions['output']
export type RobotFileVirusscanInstructionsWithHiddenFields = Instructions['hiddenOutput']
export type InterpolatableRobotFileVirusscanInstructions = Instructions['interpolatableInput']
export type InterpolatableRobotFileVirusscanInstructionsInput = Instructions['interpolatableInput']
export type InterpolatableRobotFileVirusscanInstructionsWithHiddenFields =
  Instructions['interpolatableHiddenOutput']
export type InterpolatableRobotFileVirusscanInstructionsWithHiddenFieldsInput =
  Instructions['interpolatableHiddenInput']
