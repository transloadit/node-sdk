import type { z } from 'zod'

import type { RobotMetaInput } from '../alphalib/types/robots/_instructions-primitives.ts'
import {
  robotAudioWaveformInstructionsSchema,
  meta as robotAudioWaveformMeta,
} from '../alphalib/types/robots/audio-waveform.ts'
import {
  robotDocumentAutorotateInstructionsSchema,
  meta as robotDocumentAutorotateMeta,
} from '../alphalib/types/robots/document-autorotate.ts'
import {
  robotDocumentConvertInstructionsSchema,
  meta as robotDocumentConvertMeta,
} from '../alphalib/types/robots/document-convert.ts'
import {
  robotDocumentOptimizeInstructionsSchema,
  meta as robotDocumentOptimizeMeta,
} from '../alphalib/types/robots/document-optimize.ts'
import {
  robotDocumentThumbsInstructionsSchema,
  meta as robotDocumentThumbsMeta,
} from '../alphalib/types/robots/document-thumbs.ts'
import {
  robotFileCompressInstructionsSchema,
  meta as robotFileCompressMeta,
} from '../alphalib/types/robots/file-compress.ts'
import {
  robotFileDecompressInstructionsSchema,
  meta as robotFileDecompressMeta,
} from '../alphalib/types/robots/file-decompress.ts'
import {
  robotFilePreviewInstructionsSchema,
  meta as robotFilePreviewMeta,
} from '../alphalib/types/robots/file-preview.ts'
import {
  robotImageBgremoveInstructionsSchema,
  meta as robotImageBgremoveMeta,
} from '../alphalib/types/robots/image-bgremove.ts'
import {
  robotImageGenerateInstructionsSchema,
  meta as robotImageGenerateMeta,
} from '../alphalib/types/robots/image-generate.ts'
import {
  robotImageOptimizeInstructionsSchema,
  meta as robotImageOptimizeMeta,
} from '../alphalib/types/robots/image-optimize.ts'
import {
  robotImageResizeInstructionsSchema,
  meta as robotImageResizeMeta,
} from '../alphalib/types/robots/image-resize.ts'
import {
  robotTextSpeakInstructionsSchema,
  meta as robotTextSpeakMeta,
} from '../alphalib/types/robots/text-speak.ts'
import {
  robotVideoThumbsInstructionsSchema,
  meta as robotVideoThumbsMeta,
} from '../alphalib/types/robots/video-thumbs.ts'

export type IntentInputMode = 'local-files' | 'none'
export type IntentOutputMode = 'directory' | 'file'

interface IntentSchemaDefinition {
  meta: RobotMetaInput
  schema: z.AnyZodObject
}

interface IntentBaseDefinition {
  outputMode?: IntentOutputMode
  paths?: string[]
}

export interface RobotIntentDefinition extends IntentBaseDefinition, IntentSchemaDefinition {
  defaultSingleAssembly?: boolean
  inputMode?: IntentInputMode
  kind: 'robot'
  robot: string
}

export interface TemplateIntentDefinition extends IntentBaseDefinition {
  kind: 'template'
  paths: string[]
  templateId: string
}

export type IntentDefinition = RobotIntentDefinition | TemplateIntentDefinition

const commandPathAliases = new Map([
  ['autorotate', 'auto-rotate'],
  ['bgremove', 'remove-background'],
])

function defineRobotIntent(definition: RobotIntentDefinition): RobotIntentDefinition {
  return definition
}

function defineTemplateIntent(definition: TemplateIntentDefinition): TemplateIntentDefinition {
  return definition
}

export function getIntentCatalogKey(definition: IntentDefinition): string {
  if (definition.kind === 'robot') {
    return definition.robot
  }

  return definition.templateId
}

export function getIntentPaths(definition: IntentDefinition): string[] {
  if (definition.paths != null) {
    return definition.paths
  }

  if (definition.kind !== 'robot') {
    throw new Error(`Intent definition ${getIntentCatalogKey(definition)} is missing paths`)
  }

  const segments = definition.robot.split('/').filter(Boolean)
  const [group, action] = segments
  if (group == null || action == null) {
    throw new Error(`Could not infer command path from robot "${definition.robot}"`)
  }

  return [group, commandPathAliases.get(action) ?? action]
}

export function getIntentCommandLabel(definition: IntentDefinition): string {
  return getIntentPaths(definition).join(' ')
}

export function getIntentResultStepName(definition: IntentDefinition): string | null {
  if (definition.kind !== 'robot') {
    return null
  }

  const paths = getIntentPaths(definition)
  const action = paths[paths.length - 1]
  if (action == null) {
    throw new Error(`Intent definition ${definition.robot} has no action path`)
  }

  return action.replaceAll('-', '_')
}

export function findIntentDefinitionByPaths(
  paths: readonly string[],
): IntentDefinition | undefined {
  return intentCatalog.find((definition) => {
    const definitionPaths = getIntentPaths(definition)
    return (
      definitionPaths.length === paths.length &&
      definitionPaths.every((part, index) => part === paths[index])
    )
  })
}

export const intentCatalog = [
  defineRobotIntent({
    kind: 'robot',
    robot: '/image/generate',
    meta: robotImageGenerateMeta,
    schema: robotImageGenerateInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/file/preview',
    paths: ['preview', 'generate'],
    meta: robotFilePreviewMeta,
    schema: robotFilePreviewInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/image/bgremove',
    meta: robotImageBgremoveMeta,
    schema: robotImageBgremoveInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/image/optimize',
    meta: robotImageOptimizeMeta,
    schema: robotImageOptimizeInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/image/resize',
    meta: robotImageResizeMeta,
    schema: robotImageResizeInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/document/convert',
    meta: robotDocumentConvertMeta,
    schema: robotDocumentConvertInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/document/optimize',
    meta: robotDocumentOptimizeMeta,
    schema: robotDocumentOptimizeInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/document/autorotate',
    meta: robotDocumentAutorotateMeta,
    schema: robotDocumentAutorotateInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/document/thumbs',
    outputMode: 'directory',
    meta: robotDocumentThumbsMeta,
    schema: robotDocumentThumbsInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/audio/waveform',
    meta: robotAudioWaveformMeta,
    schema: robotAudioWaveformInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/text/speak',
    meta: robotTextSpeakMeta,
    schema: robotTextSpeakInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/video/thumbs',
    outputMode: 'directory',
    meta: robotVideoThumbsMeta,
    schema: robotVideoThumbsInstructionsSchema,
  }),
  defineTemplateIntent({
    kind: 'template',
    templateId: 'builtin/encode-hls-video@latest',
    paths: ['video', 'encode-hls'],
    outputMode: 'directory',
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/file/compress',
    defaultSingleAssembly: true,
    meta: robotFileCompressMeta,
    schema: robotFileCompressInstructionsSchema,
  }),
  defineRobotIntent({
    kind: 'robot',
    robot: '/file/decompress',
    outputMode: 'directory',
    meta: robotFileDecompressMeta,
    schema: robotFileDecompressInstructionsSchema,
  }),
] satisfies IntentDefinition[]
