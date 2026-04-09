import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { IntentDefinition } from './intentCommandSpecs.ts'
import type { ResolvedIntentCommandDefinition } from './intentCommands.ts'
import { resolveIntentCommandDefinitions } from './intentCommands.ts'
import type { IntentOptionDefinition } from './intentRuntime.ts'
import { getIntentOptionDefinitions } from './intentRuntime.ts'

interface DocOptionRow {
  description: string
  example: string
  flags: string
  required: string
  type: string
}

const MAX_OPTION_DESCRIPTION_LENGTH = 180

function inlineCode(value: string): string {
  return `\`${value.replaceAll('`', '\\`')}\``
}

function escapeTableCell(value: string): string {
  return value.replaceAll('\n', ' ').replaceAll('|', '\\|')
}

function renderTable(headers: string[], rows: string[][]): string {
  const renderedRows = rows.map((row) => `| ${row.map(escapeTableCell).join(' | ')} |`)
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...renderedRows,
  ].join('\n')
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripMarkdownLinks(value: string): string {
  return value.replace(/!?\[([^\]]+)\]\([^)]+\)/g, '$1')
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ')
}

function stripCodeBlocks(value: string): string {
  return value.replace(/```[\s\S]*?```/g, ' ')
}

function stripTemplateSyntax(value: string): string {
  return value.replace(/\{\{[\s\S]*?\}\}/g, ' ')
}

function stripInlineCode(value: string): string {
  return value.replaceAll('`', '')
}

function truncateAtSentenceBoundary(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  const sentenceMatch = value.match(/^(.{1,180}?[.!?])(?:\s|$)/)
  if (sentenceMatch?.[1] != null && sentenceMatch[1].length >= 60) {
    return sentenceMatch[1]
  }

  const truncated = value.slice(0, maxLength).trimEnd()
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 40) {
    return `${truncated.slice(0, lastSpace)}…`
  }

  return `${truncated}…`
}

function summarizeDescription(value: string | undefined): string {
  if (value == null || value.trim().length === 0) {
    return '—'
  }

  const sanitized = collapseWhitespace(
    stripInlineCode(stripTemplateSyntax(stripCodeBlocks(stripHtml(stripMarkdownLinks(value))))),
  )

  if (sanitized.length === 0) {
    return '—'
  }

  return truncateAtSentenceBoundary(sanitized, MAX_OPTION_DESCRIPTION_LENGTH)
}

function getInputSummary(definition: ResolvedIntentCommandDefinition): string {
  if (definition.runnerKind === 'no-input') {
    return 'none'
  }

  return 'file, dir, URL, base64'
}

function getOutputSummary(definition: ResolvedIntentCommandDefinition): string {
  return definition.intentDefinition.outputMode === 'directory' ? 'directory' : 'file'
}

function getExecutionSummary(definition: ResolvedIntentCommandDefinition): string {
  switch (definition.runnerKind) {
    case 'bundled':
      return 'single assembly'
    case 'no-input':
      return 'no input'
    case 'standard':
      return 'per-file; supports `--single-assembly` and `--watch`'
    case 'watchable':
      return 'per-file; supports `--watch`'
  }
}

function getBackendSummary(catalogDefinition: IntentDefinition): string {
  if (catalogDefinition.kind === 'robot') {
    return inlineCode(catalogDefinition.robot)
  }

  if (catalogDefinition.kind === 'template') {
    return inlineCode(catalogDefinition.templateId)
  }

  return `semantic alias ${inlineCode(catalogDefinition.semantic)}`
}

function getUsage(definition: ResolvedIntentCommandDefinition): string {
  const parts = ['npx transloadit', ...definition.paths]
  if (definition.runnerKind !== 'no-input') {
    parts.push('--input', '<path|dir|url|->')
  }
  parts.push('[options]')
  return parts.join(' ')
}

function formatOptionType(kind: IntentOptionDefinition['kind']): string {
  switch (kind) {
    case 'auto':
      return 'auto'
    case 'boolean':
      return 'boolean'
    case 'json':
      return 'json'
    case 'number':
      return 'number'
    case 'string':
      return 'string'
    case 'string-array':
      return 'string[]'
  }
}

function getExampleValue(field: IntentOptionDefinition): string {
  const candidate = (field as IntentOptionDefinition & { exampleValue?: unknown }).exampleValue
  if (typeof candidate === 'string' && candidate.length > 0) {
    return candidate
  }

  return '—'
}

function getCommandOptionRows(definition: ResolvedIntentCommandDefinition): DocOptionRow[] {
  return getIntentOptionDefinitions(definition.intentDefinition).map((field) => ({
    flags: field.optionFlags,
    type: formatOptionType(field.kind),
    required: field.required ? 'yes' : 'no',
    example: getExampleValue(field),
    description: summarizeDescription(field.description),
  }))
}

function getInputOutputRows(definition: ResolvedIntentCommandDefinition): DocOptionRow[] {
  const outputType = definition.intentDefinition.outputMode === 'directory' ? 'directory' : 'path'

  if (definition.runnerKind === 'no-input') {
    return [
      {
        flags: '--out, -o',
        type: outputType,
        required: 'yes*',
        example: definition.intentDefinition.outputMode === 'directory' ? 'output/' : 'output.file',
        description: definition.intentDefinition.outputDescription,
      },
      {
        flags: '--print-urls',
        type: 'boolean',
        required: 'no',
        example: 'false',
        description: 'Print temporary result URLs after completion',
      },
    ]
  }

  return [
    {
      flags: '--input, -i',
      type: 'path | dir | url | -',
      required: 'varies',
      example: 'input.file',
      description: 'Provide an input path, directory, URL, or - for stdin',
    },
    {
      flags: '--input-base64',
      type: 'base64 | data URL',
      required: 'no',
      example: 'data:text/plain;base64,SGVsbG8=',
      description: 'Provide base64-encoded input content directly',
    },
    {
      flags: '--out, -o',
      type: outputType,
      required: 'yes*',
      example: definition.intentDefinition.outputMode === 'directory' ? 'output/' : 'output.file',
      description: definition.intentDefinition.outputDescription,
    },
    {
      flags: '--print-urls',
      type: 'boolean',
      required: 'no',
      example: 'false',
      description: 'Print temporary result URLs after completion',
    },
  ]
}

function getProcessingRows(definition: ResolvedIntentCommandDefinition): DocOptionRow[] {
  if (definition.runnerKind === 'no-input') {
    return []
  }

  const rows: DocOptionRow[] = [
    {
      flags: '--recursive, -r',
      type: 'boolean',
      required: 'no',
      example: 'false',
      description: 'Enumerate input directories recursively',
    },
    {
      flags: '--delete-after-processing, -d',
      type: 'boolean',
      required: 'no',
      example: 'false',
      description: 'Delete input files after they are processed',
    },
    {
      flags: '--reprocess-stale',
      type: 'boolean',
      required: 'no',
      example: 'false',
      description: 'Process inputs even if output is newer',
    },
  ]

  if (definition.runnerKind === 'standard' || definition.runnerKind === 'watchable') {
    rows.push(
      {
        flags: '--watch, -w',
        type: 'boolean',
        required: 'no',
        example: 'false',
        description: 'Watch inputs for changes',
      },
      {
        flags: '--concurrency, -c',
        type: 'number',
        required: 'no',
        example: '5',
        description: 'Maximum number of concurrent assemblies (default: 5)',
      },
    )
  }

  if (definition.runnerKind === 'standard') {
    rows.push({
      flags: '--single-assembly',
      type: 'boolean',
      required: 'no',
      example: 'false',
      description: 'Pass all input files to a single assembly instead of one assembly per file',
    })
  }

  return rows
}

function renderOptionSection(title: string, rows: DocOptionRow[]): string[] {
  if (rows.length === 0) {
    return []
  }

  return [
    `**${title}**`,
    '',
    renderTable(
      ['Flag', 'Type', 'Required', 'Example', 'Description'],
      rows.map((row) => [
        inlineCode(row.flags),
        inlineCode(row.type),
        row.required,
        row.example === '—' ? row.example : inlineCode(row.example),
        row.description,
      ]),
    ),
    '',
  ]
}

function renderExamples(examples: Array<[string, string]>): string {
  const lines: string[] = ['```bash']

  for (const [label, command] of examples) {
    if (examples.length > 1 || label !== 'Run the command') {
      lines.push(`# ${label}`)
    }
    lines.push(command)
  }

  lines.push('```')
  return lines.join('\n')
}

function renderIntentSection(
  definition: ResolvedIntentCommandDefinition,
  headingLevel: number,
): string {
  const heading = '#'.repeat(headingLevel)
  const commandLabel = definition.paths.join(' ')
  const lines: string[] = [
    `${heading} ${inlineCode(commandLabel)}`,
    '',
    definition.description,
    '',
    definition.details,
    '',
    '**Usage**',
    '',
    '```bash',
    getUsage(definition),
    '```',
    '',
    '**Quick facts**',
    '',
    `- Input: ${getInputSummary(definition)}`,
    `- Output: ${getOutputSummary(definition)}`,
    `- Execution: ${getExecutionSummary(definition)}`,
    `- Backend: ${getBackendSummary(definition.catalogDefinition)}`,
    '',
    ...renderOptionSection('Command options', getCommandOptionRows(definition)),
    ...renderOptionSection('Input & output flags', getInputOutputRows(definition)),
    ...renderOptionSection('Processing flags', getProcessingRows(definition)),
    '**Examples**',
    '',
    renderExamples(definition.examples),
    '',
  ]

  return lines.join('\n')
}

function renderAtAGlanceTable(definitions: ResolvedIntentCommandDefinition[]): string {
  return renderTable(
    ['Command', 'What it does', 'Input', 'Output'],
    definitions.map((definition) => [
      inlineCode(definition.paths.join(' ')),
      definition.description,
      getInputSummary(definition),
      getOutputSummary(definition),
    ]),
  )
}

function renderIntentDocsBody({
  definitions,
  headingLevel,
}: {
  definitions: ResolvedIntentCommandDefinition[]
  headingLevel: number
}): string {
  const heading = '#'.repeat(headingLevel)
  const lines: string[] = [
    `${heading} At a glance`,
    '',
    'Intent commands are the fastest path to common one-off tasks from the CLI.',
    'Use `--print-urls` when you want temporary result URLs without downloading locally.',
    'All intent commands also support the global CLI flags `--json`, `--log-level`, `--endpoint`, and `--help`.',
    '',
    renderAtAGlanceTable(definitions),
    '',
    '> At least one of `--out` or `--print-urls` is required on every intent command.',
    '',
  ]

  for (const definition of definitions) {
    lines.push(renderIntentSection(definition, headingLevel))
  }

  return lines.join('\n').trim()
}

function replaceGeneratedBlock({
  endMarker,
  markdown,
  readme,
  startMarker,
}: {
  endMarker: string
  markdown: string
  readme: string
  startMarker: string
}): string {
  const startIndex = readme.indexOf(startMarker)
  const endIndex = readme.indexOf(endMarker)
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error('README intent docs markers are missing or malformed')
  }

  const before = readme.slice(0, startIndex + startMarker.length)
  const after = readme.slice(endIndex)
  return `${before}\n\n${markdown}\n\n${after}`
}

async function main(): Promise<void> {
  const definitions = resolveIntentCommandDefinitions()
  const readmeUrl = new URL('../../README.md', import.meta.url)
  const docsUrl = new URL('../../docs/intent-commands.md', import.meta.url)
  const startMarker = '<!-- GENERATED_INTENT_DOCS:START -->'
  const endMarker = '<!-- GENERATED_INTENT_DOCS:END -->'

  const readme = await readFile(readmeUrl, 'utf8')
  const readmeFragment = renderIntentDocsBody({ definitions, headingLevel: 4 })
  const fullDoc = [
    '# Intent Command Reference',
    '',
    '> Generated by `yarn workspace @transloadit/node sync:intent-docs`. Do not edit by hand.',
    '',
    renderIntentDocsBody({ definitions, headingLevel: 2 }),
  ].join('\n')

  const nextReadme = replaceGeneratedBlock({
    endMarker,
    markdown: readmeFragment,
    readme,
    startMarker,
  })

  await mkdir(dirname(docsUrl.pathname), { recursive: true })
  await writeFile(docsUrl, `${fullDoc}\n`)
  await writeFile(readmeUrl, `${nextReadme}\n`)
}

main().catch((error) => {
  if (!(error instanceof Error)) {
    throw new Error(`Was thrown a non-error: ${String(error)}`)
  }
  console.error(error)
  process.exit(1)
})
