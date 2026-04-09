import type { IntentInputPolicy } from '../intentInputPolicy.ts'
import type {
  IntentDynamicStepExecutionDefinition,
  IntentRunnerKind,
  PreparedIntentInputs,
} from '../intentRuntime.ts'
import { imageDescribeSemanticIntentDescriptor } from './imageDescribe.ts'
import {
  markdownDocxSemanticIntentDescriptor,
  markdownPdfSemanticIntentDescriptor,
} from './markdownPdf.ts'

export interface SemanticIntentPresentation {
  description: string
  details: string
  examples: Array<[string, string]>
}

export interface SemanticIntentDescriptor {
  createStep: (rawValues: Record<string, unknown>) => Record<string, unknown>
  execution: IntentDynamicStepExecutionDefinition
  inputPolicy: IntentInputPolicy
  outputDescription: string
  prepareInputs?: (
    preparedInputs: PreparedIntentInputs,
    rawValues: Record<string, unknown>,
  ) => Promise<PreparedIntentInputs>
  presentation: SemanticIntentPresentation
  runnerKind: IntentRunnerKind
}

const semanticIntentDescriptors: Record<string, SemanticIntentDescriptor> = {
  'image-describe': imageDescribeSemanticIntentDescriptor,
  'markdown-pdf': {
    ...markdownPdfSemanticIntentDescriptor,
  },
  'markdown-docx': {
    ...markdownDocxSemanticIntentDescriptor,
  },
}

export function getSemanticIntentDescriptor(name: string): SemanticIntentDescriptor {
  if (!(name in semanticIntentDescriptors)) {
    throw new Error(`Semantic intent descriptor does not exist for "${name}"`)
  }

  return semanticIntentDescriptors[name]
}
