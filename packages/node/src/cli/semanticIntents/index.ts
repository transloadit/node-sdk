import type { IntentInputPolicy } from '../intentInputPolicy.ts'
import type {
  IntentDynamicStepExecutionDefinition,
  IntentRunnerKind,
  PreparedIntentInputs,
} from '../intentRuntime.ts'
import {
  createImageDescribeStep,
  imageDescribeCommandPresentation,
  imageDescribeExecutionDefinition,
} from './imageDescribe.ts'
import {
  createMarkdownDocxStep,
  createMarkdownPdfStep,
  markdownDocxCommandPresentation,
  markdownDocxExecutionDefinition,
  markdownPdfCommandPresentation,
  markdownPdfExecutionDefinition,
} from './markdownPdf.ts'

export interface SemanticIntentDescriptor {
  createStep: (rawValues: Record<string, unknown>) => Record<string, unknown>
  execution: IntentDynamicStepExecutionDefinition
  inputPolicy: IntentInputPolicy
  outputDescription: string
  prepareInputs?: (
    preparedInputs: PreparedIntentInputs,
    rawValues: Record<string, unknown>,
  ) => Promise<PreparedIntentInputs>
  presentation: {
    description: string
    details: string
    examples: Array<[string, string]>
  }
  runnerKind: IntentRunnerKind
}

export const semanticIntentDescriptors: Record<string, SemanticIntentDescriptor> = {
  'image-describe': {
    createStep: createImageDescribeStep,
    execution: imageDescribeExecutionDefinition,
    inputPolicy: { kind: 'required' },
    outputDescription: 'Write the JSON result to this path or directory',
    presentation: imageDescribeCommandPresentation,
    runnerKind: 'watchable',
  },
  'markdown-pdf': {
    createStep: createMarkdownPdfStep,
    execution: markdownPdfExecutionDefinition,
    inputPolicy: { kind: 'required' },
    outputDescription: 'Write the rendered PDF to this path or directory',
    presentation: markdownPdfCommandPresentation,
    runnerKind: 'watchable',
  },
  'markdown-docx': {
    createStep: createMarkdownDocxStep,
    execution: markdownDocxExecutionDefinition,
    inputPolicy: { kind: 'required' },
    outputDescription: 'Write the rendered DOCX to this path or directory',
    presentation: markdownDocxCommandPresentation,
    runnerKind: 'watchable',
  },
}

export function getSemanticIntentDescriptor(name: string): SemanticIntentDescriptor {
  if (!(name in semanticIntentDescriptors)) {
    throw new Error(`Semantic intent descriptor does not exist for "${name}"`)
  }

  return semanticIntentDescriptors[name]
}
