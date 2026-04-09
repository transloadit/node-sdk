import type { IntentInputPolicy } from '../intentInputPolicy.ts'
import type {
  IntentDynamicStepExecutionDefinition,
  IntentOptionDefinition,
  IntentRunnerKind,
} from '../intentRuntime.ts'

const defaultMarkdownFormat = 'gfm'
const defaultMarkdownTheme = 'github'

function resolveMarkdownFormat(value: unknown): 'commonmark' | 'gfm' {
  if (value == null || value === '') {
    return defaultMarkdownFormat
  }

  if (value === 'commonmark' || value === 'gfm') {
    return value
  }

  throw new Error(
    `Unsupported --markdown-format value "${String(value)}". Supported values: commonmark, gfm`,
  )
}

function resolveMarkdownTheme(value: unknown): 'bare' | 'github' {
  if (value == null || value === '') {
    return defaultMarkdownTheme
  }

  if (value === 'bare' || value === 'github') {
    return value
  }

  throw new Error(
    `Unsupported --markdown-theme value "${String(value)}". Supported values: bare, github`,
  )
}

const markdownOptionDefinitions = [
  {
    name: 'markdownFormat',
    kind: 'string',
    propertyName: 'markdownFormat',
    optionFlags: '--markdown-format',
    description: 'Markdown variant to parse, either commonmark or gfm',
    required: false,
  },
  {
    name: 'markdownTheme',
    kind: 'string',
    propertyName: 'markdownTheme',
    optionFlags: '--markdown-theme',
    description: 'Markdown theme to render, either github or bare',
    required: false,
  },
] as const satisfies readonly IntentOptionDefinition[]

interface MarkdownConvertSemanticIntentDefinition {
  createStep: (rawValues: Record<string, unknown>) => Record<string, unknown>
  execution: IntentDynamicStepExecutionDefinition
  inputPolicy: IntentInputPolicy
  outputDescription: string
  presentation: {
    description: string
    details: string
    examples: Array<[string, string]>
  }
  runnerKind: IntentRunnerKind
}

function createMarkdownConvertSemanticIntent({
  description,
  details,
  exampleOutput,
  format,
  handler,
}: {
  description: string
  details: string
  exampleOutput: string
  format: 'docx' | 'pdf'
  handler: 'markdown-docx' | 'markdown-pdf'
}): MarkdownConvertSemanticIntentDefinition {
  const formatLabel = format.toUpperCase()

  return {
    createStep(rawValues) {
      return {
        robot: '/document/convert',
        use: ':original',
        result: true,
        format,
        markdown_format: resolveMarkdownFormat(rawValues.markdownFormat),
        markdown_theme: resolveMarkdownTheme(rawValues.markdownTheme),
        // @TODO Replace this semantic CLI alias with a builtin/api2-owned command surface if we later
        // want richer Markdown conversion semantics beyond `/document/convert`.
      }
    },
    execution: {
      kind: 'dynamic-step',
      handler,
      resultStepName: 'convert',
      fields: markdownOptionDefinitions,
    },
    inputPolicy: { kind: 'required' },
    outputDescription: `Write the rendered ${formatLabel} to this path or directory`,
    presentation: {
      description,
      details,
      examples: [
        [
          `Render a Markdown file as a ${formatLabel} file`,
          `transloadit markdown ${format} --input README.md --out ${exampleOutput}`,
        ],
        [
          'Print a temporary result URL without downloading locally',
          `transloadit markdown ${format} --input README.md --print-urls`,
        ],
      ],
    },
    runnerKind: 'watchable',
  }
}

export const markdownPdfSemanticIntentDescriptor = createMarkdownConvertSemanticIntent({
  description: 'Render Markdown files as PDFs',
  details:
    'Runs `/document/convert` with `format: pdf`, letting the backend render Markdown and preserve features such as internal heading links in the generated PDF.',
  exampleOutput: 'README.pdf',
  format: 'pdf',
  handler: 'markdown-pdf',
})

export const markdownDocxSemanticIntentDescriptor = createMarkdownConvertSemanticIntent({
  description: 'Render Markdown files as DOCX documents',
  details:
    'Runs `/document/convert` with `format: docx`, letting the backend render Markdown and convert it into a Word document.',
  exampleOutput: 'README.docx',
  format: 'docx',
  handler: 'markdown-docx',
})
