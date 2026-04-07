import type {
  IntentDynamicStepExecutionDefinition,
  IntentOptionDefinition,
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

export const markdownPdfExecutionDefinition = {
  kind: 'dynamic-step',
  handler: 'markdown-pdf',
  resultStepName: 'convert',
  fields: [
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
  ] as const satisfies readonly IntentOptionDefinition[],
} satisfies IntentDynamicStepExecutionDefinition

export const markdownPdfCommandPresentation = {
  description: 'Render Markdown files as PDFs',
  details:
    'Runs `/document/convert` with `format: pdf`, letting the backend render Markdown and preserve features such as internal heading links in the generated PDF.',
  examples: [
    [
      'Render a Markdown file as a PDF',
      'transloadit markdown pdf --input README.md --out README.pdf',
    ],
    [
      'Print a temporary result URL without downloading locally',
      'transloadit markdown pdf --input README.md --print-urls',
    ],
  ] as Array<[string, string]>,
} as const

export function createMarkdownPdfStep(rawValues: Record<string, unknown>): Record<string, unknown> {
  return {
    robot: '/document/convert',
    use: ':original',
    result: true,
    format: 'pdf',
    markdown_format: resolveMarkdownFormat(rawValues.markdownFormat),
    markdown_theme: resolveMarkdownTheme(rawValues.markdownTheme),
    // @TODO Replace this semantic CLI alias with a builtin/api2-owned command surface if we later
    // want richer Markdown->PDF product semantics beyond `/document/convert format=pdf`.
  }
}
