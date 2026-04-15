import type { IntentOptionDefinition } from '../intentRuntime.ts'
import type { SemanticIntentDescriptor, SemanticIntentPresentation } from './index.ts'
import { parseOptionalEnumValue } from './parsing.ts'

const defaultMarkdownFormat = 'gfm'
const defaultMarkdownTheme = 'github'
const markdownFormats = ['commonmark', 'gfm'] as const
const markdownThemes = ['bare', 'github'] as const

function resolveMarkdownFormat(value: unknown): 'commonmark' | 'gfm' {
  return (
    parseOptionalEnumValue({
      flagName: '--markdown-format',
      supportedValues: markdownFormats,
      value,
    }) ?? defaultMarkdownFormat
  )
}

function resolveMarkdownTheme(value: unknown): 'bare' | 'github' {
  return (
    parseOptionalEnumValue({
      flagName: '--markdown-theme',
      supportedValues: markdownThemes,
      value,
    }) ?? defaultMarkdownTheme
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
}): SemanticIntentDescriptor {
  const formatLabel = format.toUpperCase()
  const presentation = {
    description,
    details,
    examples: [
      [
        `Render a Markdown file as a ${formatLabel} file`,
        `transloadit markdown ${format} --input README.md --output ${exampleOutput}`,
      ],
      [
        'Print a temporary result URL without downloading locally',
        `transloadit markdown ${format} --input README.md --print-urls`,
      ],
    ],
  } satisfies SemanticIntentPresentation

  return {
    createStep(rawValues, _context) {
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
    defaultOutputPath: exampleOutput,
    inputPolicy: { kind: 'required' },
    outputDescription: `Write the rendered ${formatLabel} to this path or directory`,
    presentation,
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
