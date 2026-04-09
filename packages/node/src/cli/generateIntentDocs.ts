import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  getConcurrencyOptionDocumentation,
  getDeleteAfterProcessingOptionDocumentation,
  getInputPathsOptionDocumentation,
  getPrintUrlsOptionDocumentation,
  getRecursiveOptionDocumentation,
  getReprocessStaleOptionDocumentation,
  getSingleAssemblyOptionDocumentation,
  getWatchOptionDocumentation,
} from './fileProcessingOptions.ts'
import type { IntentDefinition } from './intentCommandSpecs.ts'
import type { ResolvedIntentCommandDefinition } from './intentCommands.ts'
import { resolveIntentCommandDefinitions } from './intentCommands.ts'
import type { IntentOptionDefinition } from './intentRuntime.ts'
import { getInputBase64OptionDocumentation, getIntentOptionDefinitions } from './intentRuntime.ts'

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

function sanitizeDocsMarkdown(value: string): string {
  return value
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\{\{[\s\S]*?\}\}/g, ' ')
    .replaceAll('`', '')
    .replace(/\s+/g, ' ')
    .trim()
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

  const sanitized = sanitizeDocsMarkdown(value)

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
  const candidate = field.exampleValue
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

function getSharedFileInputOutputRows(): DocOptionRow[] {
  return [
    getInputPathsOptionDocumentation(),
    getInputBase64OptionDocumentation(),
    {
      flags: '--out, -o',
      type: 'path',
      required: 'yes*',
      example: 'output.file',
      description: 'Write the result to this path or directory',
    },
    getPrintUrlsOptionDocumentation(),
  ]
}

function getSharedNoInputOutputRows(): DocOptionRow[] {
  return [
    {
      flags: '--out, -o',
      type: 'path',
      required: 'yes*',
      example: 'output.file',
      description: 'Write the result to this path',
    },
    getPrintUrlsOptionDocumentation(),
  ]
}

function getSharedProcessingRows(): DocOptionRow[] {
  return [
    getRecursiveOptionDocumentation(),
    getDeleteAfterProcessingOptionDocumentation(),
    getReprocessStaleOptionDocumentation(),
  ]
}

function getSharedWatchRows(): DocOptionRow[] {
  return [getWatchOptionDocumentation(), getConcurrencyOptionDocumentation()]
}

function getSharedBundlingRows(): DocOptionRow[] {
  return [getSingleAssemblyOptionDocumentation()]
}

function getSharedFlagSupportNotes(definition: ResolvedIntentCommandDefinition): string[] {
  if (definition.runnerKind === 'no-input') {
    return ['Uses the shared output flags listed above.']
  }

  const notes = ['Uses the shared file input and output flags listed above.']
  const processingGroups = ['base processing flags']

  if (definition.runnerKind === 'standard' || definition.runnerKind === 'watchable') {
    processingGroups.push('watch flags')
  }

  if (definition.runnerKind === 'standard') {
    processingGroups.push('bundling flags')
  }

  notes.push(`Also supports the shared ${processingGroups.join(', ')} listed above.`)

  return notes
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
    '**Shared flags**',
    '',
    ...getSharedFlagSupportNotes(definition).map((note) => `- ${note}`),
    '',
    ...renderOptionSection('Command options', getCommandOptionRows(definition)),
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
    `${heading} Shared flags`,
    '',
    'These flags are available across many intent commands, so the per-command sections below focus on differences.',
    '',
    ...renderOptionSection('Shared file input & output flags', getSharedFileInputOutputRows()),
    ...renderOptionSection('Shared no-input output flags', getSharedNoInputOutputRows()),
    ...renderOptionSection('Shared processing flags', getSharedProcessingRows()),
    ...renderOptionSection('Shared watch flags', getSharedWatchRows()),
    ...renderOptionSection('Shared bundling flags', getSharedBundlingRows()),
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
