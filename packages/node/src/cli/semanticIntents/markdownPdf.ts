import { mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { marked } from 'marked'
import type {
  IntentDynamicStepExecutionDefinition,
  IntentOptionDefinition,
  PreparedIntentInputs,
} from '../intentRuntime.ts'

const defaultMarkdownFormat = 'gfm'
const defaultMarkdownTheme = 'github'

const githubMarkdownCss = `
  :root {
    color-scheme: light;
  }

  body {
    box-sizing: border-box;
    color: #1f2328;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    margin: 0 auto;
    max-width: 860px;
    padding: 40px;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.25;
    margin-bottom: 16px;
    margin-top: 24px;
  }

  h1, h2 {
    border-bottom: 1px solid #d1d9e0;
    padding-bottom: 0.3em;
  }

  p, ul, ol, blockquote, pre, table {
    margin-bottom: 16px;
    margin-top: 0;
  }

  code, pre {
    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
  }

  code {
    background: rgba(175, 184, 193, 0.2);
    border-radius: 6px;
    font-size: 85%;
    padding: 0.2em 0.4em;
  }

  pre {
    background: #f6f8fa;
    border-radius: 6px;
    overflow: auto;
    padding: 16px;
    white-space: pre-wrap;
  }

  pre code {
    background: transparent;
    padding: 0;
  }

  blockquote {
    border-left: 0.25em solid #d1d9e0;
    color: #59636e;
    padding: 0 1em;
  }

  a {
    color: #0969da;
    text-decoration: none;
  }

  table {
    border-collapse: collapse;
    width: 100%;
  }

  table th,
  table td {
    border: 1px solid #d1d9e0;
    padding: 6px 13px;
  }
`

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
    'Renders Markdown to HTML locally, then runs `/html/convert` to produce a PDF with readable heading, list, and emphasis styling.',
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

function buildMarkdownHtml({
  html,
  title,
  theme,
}: {
  html: string
  title: string
  theme: 'bare' | 'github'
}): string {
  const styles = theme === 'github' ? `<style>${githubMarkdownCss}</style>` : ''

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    `<title>${title}</title>`,
    styles,
    '</head>',
    '<body>',
    html,
    '</body>',
    '</html>',
  ].join('\n')
}

export async function prepareMarkdownPdfInputs(
  preparedInputs: PreparedIntentInputs,
  rawValues: Record<string, unknown>,
): Promise<PreparedIntentInputs> {
  const markdownFormat = resolveMarkdownFormat(rawValues.markdownFormat)
  const markdownTheme = resolveMarkdownTheme(rawValues.markdownTheme)

  const tempDir = await mkdtemp(path.join(tmpdir(), 'transloadit-markdown-pdf-'))
  const renderedInputs = await Promise.all(
    preparedInputs.inputs.map(async (inputPath, index) => {
      const markdown = await readFile(inputPath, 'utf8')
      const title = path.parse(inputPath).name || `markdown-${index + 1}`
      const html = await marked.parse(markdown, {
        async: false,
        gfm: markdownFormat === 'gfm',
      })

      const renderedPath = path.join(tempDir, `${title}.html`)
      await writeFile(
        renderedPath,
        buildMarkdownHtml({
          html,
          title,
          theme: markdownTheme,
        }),
      )

      const inputStats = await stat(inputPath)
      await utimes(renderedPath, inputStats.atime, inputStats.mtime)
      return renderedPath
    }),
  )

  return {
    ...preparedInputs,
    cleanup: [
      ...preparedInputs.cleanup,
      async () => {
        await rm(tempDir, { recursive: true, force: true })
      },
    ],
    inputs: renderedInputs,
  }
}

export function createMarkdownPdfStep(rawValues: Record<string, unknown>): Record<string, unknown> {
  resolveMarkdownFormat(rawValues.markdownFormat)
  resolveMarkdownTheme(rawValues.markdownTheme)

  return {
    robot: '/html/convert',
    use: ':original',
    result: true,
    format: 'pdf',
    fullpage: true,
    wait_until: 'load',
  }
}
