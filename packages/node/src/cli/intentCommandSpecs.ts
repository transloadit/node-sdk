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

export type IntentInputMode = 'local-files' | 'none' | 'remote-url'
export type IntentOutputMode = 'directory' | 'file'

export interface RobotIntentDefinition {
  meta: RobotMetaInput
  robot: string
  schema: z.AnyZodObject
  schemaImportName: string
  schemaImportPath: string
}

export interface RobotIntentCatalogEntry {
  kind: 'robot'
  defaultSingleAssembly?: boolean
  inputMode?: Exclude<IntentInputMode, 'remote-url'>
  outputMode?: IntentOutputMode
  paths?: string[]
  robot: keyof typeof robotIntentDefinitions
}

export interface TemplateIntentCatalogEntry {
  kind: 'template'
  outputMode?: IntentOutputMode
  paths: string[]
  templateId: string
}

export interface RecipeIntentCatalogEntry {
  kind: 'recipe'
  recipe: keyof typeof intentRecipeDefinitions
}

export type IntentCatalogEntry =
  | RecipeIntentCatalogEntry
  | RobotIntentCatalogEntry
  | TemplateIntentCatalogEntry

export interface IntentRecipeDefinition {
  description: string
  details: string
  examples: Array<[string, string]>
  inputMode: 'remote-url'
  outputDescription: string
  outputRequired: boolean
  paths: string[]
  resultStepName: string
  schema: z.AnyZodObject
  schemaImportName: string
  schemaImportPath: string
  summary: string
}

export const robotIntentDefinitions = {
  '/audio/waveform': {
    robot: '/audio/waveform',
    meta: robotAudioWaveformMeta,
    schema: robotAudioWaveformInstructionsSchema,
    schemaImportName: 'robotAudioWaveformInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/audio-waveform.ts',
  },
  '/document/autorotate': {
    robot: '/document/autorotate',
    meta: robotDocumentAutorotateMeta,
    schema: robotDocumentAutorotateInstructionsSchema,
    schemaImportName: 'robotDocumentAutorotateInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/document-autorotate.ts',
  },
  '/document/convert': {
    robot: '/document/convert',
    meta: robotDocumentConvertMeta,
    schema: robotDocumentConvertInstructionsSchema,
    schemaImportName: 'robotDocumentConvertInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/document-convert.ts',
  },
  '/document/optimize': {
    robot: '/document/optimize',
    meta: robotDocumentOptimizeMeta,
    schema: robotDocumentOptimizeInstructionsSchema,
    schemaImportName: 'robotDocumentOptimizeInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/document-optimize.ts',
  },
  '/document/thumbs': {
    robot: '/document/thumbs',
    meta: robotDocumentThumbsMeta,
    schema: robotDocumentThumbsInstructionsSchema,
    schemaImportName: 'robotDocumentThumbsInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/document-thumbs.ts',
  },
  '/file/compress': {
    robot: '/file/compress',
    meta: robotFileCompressMeta,
    schema: robotFileCompressInstructionsSchema,
    schemaImportName: 'robotFileCompressInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/file-compress.ts',
  },
  '/file/decompress': {
    robot: '/file/decompress',
    meta: robotFileDecompressMeta,
    schema: robotFileDecompressInstructionsSchema,
    schemaImportName: 'robotFileDecompressInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/file-decompress.ts',
  },
  '/file/preview': {
    robot: '/file/preview',
    meta: robotFilePreviewMeta,
    schema: robotFilePreviewInstructionsSchema,
    schemaImportName: 'robotFilePreviewInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/file-preview.ts',
  },
  '/image/bgremove': {
    robot: '/image/bgremove',
    meta: robotImageBgremoveMeta,
    schema: robotImageBgremoveInstructionsSchema,
    schemaImportName: 'robotImageBgremoveInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/image-bgremove.ts',
  },
  '/image/generate': {
    robot: '/image/generate',
    meta: robotImageGenerateMeta,
    schema: robotImageGenerateInstructionsSchema,
    schemaImportName: 'robotImageGenerateInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/image-generate.ts',
  },
  '/image/optimize': {
    robot: '/image/optimize',
    meta: robotImageOptimizeMeta,
    schema: robotImageOptimizeInstructionsSchema,
    schemaImportName: 'robotImageOptimizeInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/image-optimize.ts',
  },
  '/image/resize': {
    robot: '/image/resize',
    meta: robotImageResizeMeta,
    schema: robotImageResizeInstructionsSchema,
    schemaImportName: 'robotImageResizeInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/image-resize.ts',
  },
  '/text/speak': {
    robot: '/text/speak',
    meta: robotTextSpeakMeta,
    schema: robotTextSpeakInstructionsSchema,
    schemaImportName: 'robotTextSpeakInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/text-speak.ts',
  },
  '/video/thumbs': {
    robot: '/video/thumbs',
    meta: robotVideoThumbsMeta,
    schema: robotVideoThumbsInstructionsSchema,
    schemaImportName: 'robotVideoThumbsInstructionsSchema',
    schemaImportPath: '../../alphalib/types/robots/video-thumbs.ts',
  },
} satisfies Record<string, RobotIntentDefinition>

export const intentRecipeDefinitions = {} satisfies Record<string, IntentRecipeDefinition>

export const intentCatalog = [
  { kind: 'robot', robot: '/image/generate' },
  { kind: 'robot', robot: '/file/preview', paths: ['preview', 'generate'] },
  { kind: 'robot', robot: '/image/bgremove' },
  { kind: 'robot', robot: '/image/optimize' },
  { kind: 'robot', robot: '/image/resize' },
  { kind: 'robot', robot: '/document/convert' },
  { kind: 'robot', robot: '/document/optimize' },
  { kind: 'robot', robot: '/document/autorotate' },
  { kind: 'robot', robot: '/document/thumbs', outputMode: 'directory' },
  { kind: 'robot', robot: '/audio/waveform' },
  { kind: 'robot', robot: '/text/speak' },
  { kind: 'robot', robot: '/video/thumbs', outputMode: 'directory' },
  {
    kind: 'template',
    templateId: 'builtin/encode-hls-video@latest',
    paths: ['video', 'encode-hls'],
    outputMode: 'directory',
  },
  { kind: 'robot', robot: '/file/compress', defaultSingleAssembly: true },
  { kind: 'robot', robot: '/file/decompress', outputMode: 'directory' },
] satisfies IntentCatalogEntry[]
