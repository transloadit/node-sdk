import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import type { ZodObject } from 'zod'
import {
  ZodBoolean,
  ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodLiteral,
  ZodNullable,
  ZodNumber,
  ZodOptional,
  ZodString,
  ZodUnion,
} from 'zod'

import type {
  IntentCatalogEntry,
  IntentInputMode,
  IntentOutputMode,
  RobotIntentCatalogEntry,
  RobotIntentDefinition,
} from '../src/cli/intentCommandSpecs.ts'
import {
  intentCatalog,
  intentRecipeDefinitions,
  robotIntentDefinitions,
} from '../src/cli/intentCommandSpecs.ts'

type GeneratedFieldKind = 'auto' | 'boolean' | 'number' | 'string'

interface GeneratedSchemaField {
  description?: string
  kind: GeneratedFieldKind
  name: string
  optionFlags: string
  propertyName: string
  required: boolean
}

interface ResolvedIntentLocalFilesInput {
  allowConcurrency?: boolean
  allowSingleAssembly?: boolean
  allowWatch?: boolean
  defaultSingleAssembly?: boolean
  deleteAfterProcessing?: boolean
  description: string
  kind: 'local-files'
  requiredFieldForInputless?: string
  recursive?: boolean
  reprocessStale?: boolean
}

interface ResolvedIntentNoneInput {
  kind: 'none'
}

interface ResolvedIntentRemoteUrlInput {
  description: string
  kind: 'remote-url'
}

type ResolvedIntentInput =
  | ResolvedIntentLocalFilesInput
  | ResolvedIntentNoneInput
  | ResolvedIntentRemoteUrlInput

interface ResolvedIntentSchemaSpec {
  importName: string
  importPath: string
  schema: ZodObject<Record<string, unknown>>
}

interface ResolvedIntentSingleStepExecution {
  fixedValues: Record<string, unknown>
  kind: 'single-step'
  resultStepName: string
}

interface ResolvedIntentTemplateExecution {
  kind: 'template'
  templateId: string
}

interface ResolvedIntentRemotePreviewExecution {
  fixedValues: Record<string, unknown>
  importStepName: string
  kind: 'remote-preview'
  previewStepName: string
}

type ResolvedIntentExecution =
  | ResolvedIntentRemotePreviewExecution
  | ResolvedIntentSingleStepExecution
  | ResolvedIntentTemplateExecution

interface ResolvedIntentCommandSpec {
  className: string
  description: string
  details: string
  examples: Array<[string, string]>
  execution: ResolvedIntentExecution
  input: ResolvedIntentInput
  outputDescription: string
  outputMode?: IntentOutputMode
  outputRequired: boolean
  paths: string[]
  schemaSpec?: ResolvedIntentSchemaSpec
}

const hiddenFieldNames = new Set([
  'ffmpeg_stack',
  'force_accept',
  'ignore_errors',
  'imagemagick_stack',
  'output_meta',
  'queue',
  'result',
  'robot',
  'stack',
  'use',
])

const pathAliases = new Map([
  ['autorotate', 'auto-rotate'],
  ['bgremove', 'remove-background'],
])

const resultStepNameAliases = new Map([
  ['/audio/waveform', 'waveformed'],
  ['/document/autorotate', 'autorotated'],
  ['/document/convert', 'converted'],
  ['/document/optimize', 'optimized'],
  ['/document/thumbs', 'thumbnailed'],
  ['/file/compress', 'compressed'],
  ['/file/decompress', 'decompressed'],
  ['/image/bgremove', 'removed_background'],
  ['/image/generate', 'generated_image'],
  ['/image/optimize', 'optimized'],
  ['/image/resize', 'resized'],
  ['/text/speak', 'synthesized'],
  ['/video/thumbs', 'thumbnailed'],
])

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const outputPath = path.resolve(__dirname, '../src/cli/commands/generated-intents.ts')

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase())
}

function toKebabCase(value: string): string {
  return value.replaceAll('_', '-')
}

function toPascalCase(parts: string[]): string {
  return parts
    .flatMap((part) => part.split('-'))
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('')
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[.:]+$/, '').trim()
}

function unwrapSchema(input: unknown): { required: boolean; schema: unknown } {
  let schema = input
  let required = true

  while (true) {
    if (schema instanceof ZodEffects) {
      schema = schema._def.schema
      continue
    }

    if (schema instanceof ZodOptional) {
      required = false
      schema = schema.unwrap()
      continue
    }

    if (schema instanceof ZodDefault) {
      required = false
      schema = schema.removeDefault()
      continue
    }

    if (schema instanceof ZodNullable) {
      required = false
      schema = schema.unwrap()
      continue
    }

    return { required, schema }
  }
}

function getFieldKind(schema: unknown): GeneratedFieldKind {
  if (schema instanceof ZodEffects) {
    return getFieldKind(schema._def.schema)
  }

  if (schema instanceof ZodString || schema instanceof ZodEnum) {
    return 'string'
  }

  if (schema instanceof ZodNumber) {
    return 'number'
  }

  if (schema instanceof ZodBoolean) {
    return 'boolean'
  }

  if (schema instanceof ZodLiteral) {
    if (typeof schema.value === 'number') return 'number'
    if (typeof schema.value === 'boolean') return 'boolean'
    return 'string'
  }

  if (schema instanceof ZodUnion) {
    const optionKinds = new Set(schema._def.options.map((option) => getFieldKind(option)))
    if (optionKinds.size === 1) {
      const [kind] = optionKinds
      if (kind != null) return kind
    }
    return 'auto'
  }

  throw new Error('Unsupported schema type')
}

function inferCommandPathsFromRobot(robot: string): string[] {
  const segments = robot.split('/').filter(Boolean)
  const [group, action] = segments
  if (group == null || action == null) {
    throw new Error(`Could not infer command path from robot "${robot}"`)
  }

  return [group, pathAliases.get(action) ?? action]
}

function inferClassName(paths: string[]): string {
  return `${toPascalCase(paths)}Command`
}

function inferInputMode(
  entry: RobotIntentCatalogEntry,
  definition: RobotIntentDefinition,
): Exclude<IntentInputMode, 'remote-url'> {
  if (entry.inputMode != null) {
    return entry.inputMode
  }

  const shape = (definition.schema as ZodObject<Record<string, unknown>>).shape
  if ('prompt' in shape) {
    const promptSchema = shape.prompt
    const { required } = unwrapSchema(promptSchema)
    return required ? 'none' : 'local-files'
  }

  return 'local-files'
}

function inferOutputMode(entry: IntentCatalogEntry): IntentOutputMode {
  return entry.outputMode ?? 'file'
}

function inferDescription(definition: RobotIntentDefinition): string {
  return stripTrailingPunctuation(definition.meta.title)
}

function inferOutputDescription(inputMode: IntentInputMode, outputMode: IntentOutputMode): string {
  if (outputMode === 'directory') {
    return 'Write the results to this directory'
  }

  if (inputMode === 'local-files') {
    return 'Write the result to this path or directory'
  }

  return 'Write the result to this path'
}

function inferDetails(
  definition: RobotIntentDefinition,
  inputMode: IntentInputMode,
  outputMode: IntentOutputMode,
  defaultSingleAssembly: boolean,
): string {
  if (inputMode === 'none') {
    return `Runs \`${definition.robot}\` and writes the result to \`--out\`.`
  }

  if (defaultSingleAssembly) {
    return `Runs \`${definition.robot}\` for the provided inputs and writes the result to \`--out\`.`
  }

  if (outputMode === 'directory') {
    return `Runs \`${definition.robot}\` on each input file and writes the results to \`--out\`.`
  }

  return `Runs \`${definition.robot}\` on each input file and writes the result to \`--out\`.`
}

function inferLocalFilesInput({
  defaultSingleAssembly = false,
  requiredFieldForInputless,
}: {
  defaultSingleAssembly?: boolean
  requiredFieldForInputless?: string
}): ResolvedIntentLocalFilesInput {
  if (defaultSingleAssembly) {
    return {
      kind: 'local-files',
      description: 'Provide one or more input files or directories',
      recursive: true,
      deleteAfterProcessing: true,
      reprocessStale: true,
      defaultSingleAssembly: true,
      requiredFieldForInputless,
    }
  }

  return {
    kind: 'local-files',
    description: 'Provide an input file or a directory',
    recursive: true,
    allowWatch: true,
    deleteAfterProcessing: true,
    reprocessStale: true,
    allowSingleAssembly: true,
    allowConcurrency: true,
    requiredFieldForInputless,
  }
}

function inferInputSpec(
  entry: RobotIntentCatalogEntry,
  definition: RobotIntentDefinition,
): ResolvedIntentInput {
  const inputMode = inferInputMode(entry, definition)
  if (inputMode === 'none') {
    return { kind: 'none' }
  }

  const shape = (definition.schema as ZodObject<Record<string, unknown>>).shape
  const requiredFieldForInputless =
    'prompt' in shape && !unwrapSchema(shape.prompt).required ? 'prompt' : undefined

  return inferLocalFilesInput({
    defaultSingleAssembly: entry.defaultSingleAssembly,
    requiredFieldForInputless,
  })
}

function inferFixedValues(
  entry: RobotIntentCatalogEntry,
  definition: RobotIntentDefinition,
  inputMode: Exclude<IntentInputMode, 'remote-url'>,
): Record<string, unknown> {
  const shape = (definition.schema as ZodObject<Record<string, unknown>>).shape
  const promptIsOptional = 'prompt' in shape && !unwrapSchema(shape.prompt).required

  if (entry.defaultSingleAssembly) {
    return {
      robot: definition.robot,
      result: true,
      use: {
        steps: [':original'],
        bundle_steps: true,
      },
    }
  }

  if (inputMode === 'local-files') {
    if (promptIsOptional) {
      return {
        robot: definition.robot,
        result: true,
      }
    }

    return {
      robot: definition.robot,
      result: true,
      use: ':original',
    }
  }

  return {
    robot: definition.robot,
    result: true,
  }
}

function inferResultStepName(robot: string): string {
  return resultStepNameAliases.get(robot) ?? inferCommandPathsFromRobot(robot)[1]
}

function guessInputFile(meta: RobotMetaInput): string {
  switch (meta.typical_file_type) {
    case 'audio file':
      return 'input.mp3'
    case 'document':
      return 'input.pdf'
    case 'image':
      return 'input.png'
    case 'video':
      return 'input.mp4'
    default:
      return 'input.file'
  }
}

function guessOutputPath(
  definition: RobotIntentDefinition | null,
  paths: string[],
  outputMode: IntentOutputMode,
): string {
  if (outputMode === 'directory') {
    return 'output/'
  }

  const [group] = paths
  if (definition?.robot === '/file/compress') {
    return 'archive.zip'
  }

  if (group === 'audio') {
    return 'output.png'
  }

  if (group === 'document') {
    return 'output.pdf'
  }

  if (group === 'image') {
    return 'output.png'
  }

  if (group === 'text') {
    return 'output.mp3'
  }

  return 'output.file'
}

function guessPromptExample(robot: string): string {
  if (robot === '/image/generate') {
    return 'A red bicycle in a studio'
  }

  return 'Hello world'
}

function inferExamples(
  definition: RobotIntentDefinition | null,
  paths: string[],
  inputMode: IntentInputMode,
  outputMode: IntentOutputMode,
  fieldSpecs: GeneratedSchemaField[],
): Array<[string, string]> {
  const parts = ['transloadit', ...paths]

  if (inputMode === 'local-files' && definition != null) {
    parts.push('--input', guessInputFile(definition.meta))
  }

  if (inputMode === 'none' && definition != null) {
    parts.push('--prompt', JSON.stringify(guessPromptExample(definition.robot)))
  }

  if (inputMode === 'remote-url') {
    parts.push('--input', 'https://example.com/file.pdf')
  }

  if (definition != null) {
    for (const fieldSpec of fieldSpecs) {
      if (!fieldSpec.required) continue
      if (fieldSpec.name === 'prompt' && inputMode === 'none') continue

      const exampleValue = inferExampleValue(definition, fieldSpec)
      if (exampleValue == null) continue
      parts.push(fieldSpec.optionFlags, exampleValue)
    }
  }

  parts.push('--out', guessOutputPath(definition, paths, outputMode))

  return [['Run the command', parts.join(' ')]]
}

function inferExampleValue(
  definition: RobotIntentDefinition,
  fieldSpec: GeneratedSchemaField,
): string | null {
  if (fieldSpec.name === 'aspect_ratio') return '1:1'
  if (fieldSpec.name === 'format') {
    if (definition.robot === '/document/convert') return 'pdf'
    if (definition.robot === '/file/compress') return 'zip'
    if (definition.robot === '/video/thumbs') return 'jpg'
    return 'png'
  }
  if (fieldSpec.name === 'model') return 'flux-schnell'
  if (fieldSpec.name === 'prompt') return JSON.stringify(guessPromptExample(definition.robot))
  if (fieldSpec.name === 'provider') return 'aws'
  if (fieldSpec.name === 'target_language') return 'en-US'
  if (fieldSpec.name === 'voice') return 'female-1'

  if (fieldSpec.kind === 'boolean') return 'true'
  if (fieldSpec.kind === 'number') return '1'

  return 'value'
}

function collectSchemaFields(
  schemaSpec: ResolvedIntentSchemaSpec,
  fixedValues: Record<string, unknown>,
  input: ResolvedIntentInput,
): GeneratedSchemaField[] {
  const shape = (schemaSpec.schema as ZodObject<Record<string, unknown>>).shape

  return Object.entries(shape)
    .filter(([key]) => !hiddenFieldNames.has(key) && !Object.hasOwn(fixedValues, key))
    .flatMap(([key, fieldSchema]) => {
      const { required: schemaRequired, schema: unwrappedSchema } = unwrapSchema(fieldSchema)

      let kind: GeneratedFieldKind
      try {
        kind = getFieldKind(unwrappedSchema)
      } catch {
        return []
      }

      const required = (input.kind === 'none' && key === 'prompt') || schemaRequired

      return [
        {
          name: key,
          propertyName: toCamelCase(key),
          optionFlags: `--${toKebabCase(key)}`,
          required,
          description: fieldSchema.description,
          kind,
        },
      ]
    })
}

function resolveRobotIntentSpec(entry: RobotIntentCatalogEntry): ResolvedIntentCommandSpec {
  const definition = robotIntentDefinitions[entry.robot]
  if (definition == null) {
    throw new Error(`No robot intent definition found for "${entry.robot}"`)
  }

  const paths = inferCommandPathsFromRobot(definition.robot)
  const inputMode = inferInputMode(entry, definition)
  const outputMode = inferOutputMode(entry)
  const input = inferInputSpec(entry, definition)
  const schemaSpec = {
    importName: definition.schemaImportName,
    importPath: definition.schemaImportPath,
    schema: definition.schema as ZodObject<Record<string, unknown>>,
  } satisfies ResolvedIntentSchemaSpec
  const execution = {
    kind: 'single-step',
    resultStepName: inferResultStepName(definition.robot),
    fixedValues: inferFixedValues(entry, definition, inputMode),
  } satisfies ResolvedIntentSingleStepExecution
  const fieldSpecs = collectSchemaFields(schemaSpec, execution.fixedValues, input)

  return {
    className: inferClassName(paths),
    description: inferDescription(definition),
    details: inferDetails(definition, inputMode, outputMode, entry.defaultSingleAssembly === true),
    examples: inferExamples(definition, paths, inputMode, outputMode, fieldSpecs),
    input,
    outputDescription: inferOutputDescription(inputMode, outputMode),
    outputMode,
    outputRequired: true,
    paths,
    schemaSpec,
    execution,
  }
}

function resolveTemplateIntentSpec(
  entry: IntentCatalogEntry & { kind: 'template' },
): ResolvedIntentCommandSpec {
  const outputMode = inferOutputMode(entry)
  const input = inferLocalFilesInput({})

  return {
    className: inferClassName(entry.paths),
    description: `Run ${stripTrailingPunctuation(entry.templateId)}`,
    details: `Runs the \`${entry.templateId}\` template and writes the outputs to \`--out\`.`,
    examples: [
      ['Run the command', `transloadit ${entry.paths.join(' ')} --input input.mp4 --out output/`],
    ],
    execution: {
      kind: 'template',
      templateId: entry.templateId,
    },
    input,
    outputDescription: inferOutputDescription('local-files', outputMode),
    outputMode,
    outputRequired: true,
    paths: entry.paths,
  }
}

function resolveRecipeIntentSpec(
  entry: IntentCatalogEntry & { kind: 'recipe' },
): ResolvedIntentCommandSpec {
  const definition = intentRecipeDefinitions[entry.recipe]
  if (definition == null) {
    throw new Error(`No intent recipe definition found for "${entry.recipe}"`)
  }

  return {
    className: inferClassName(definition.paths),
    description: definition.description,
    details: definition.details,
    examples: definition.examples,
    execution: {
      kind: 'remote-preview',
      importStepName: 'imported',
      previewStepName: definition.resultStepName,
      fixedValues: {
        robot: '/file/preview',
        result: true,
      },
    },
    input: {
      kind: 'remote-url',
      description: 'Remote URL to preview',
    },
    outputDescription: definition.outputDescription,
    outputRequired: definition.outputRequired,
    paths: definition.paths,
    schemaSpec: {
      importName: definition.schemaImportName,
      importPath: definition.schemaImportPath,
      schema: definition.schema as ZodObject<Record<string, unknown>>,
    },
  }
}

function resolveIntentCommandSpec(entry: IntentCatalogEntry): ResolvedIntentCommandSpec {
  if (entry.kind === 'robot') {
    return resolveRobotIntentSpec(entry)
  }

  if (entry.kind === 'template') {
    return resolveTemplateIntentSpec(entry)
  }

  return resolveRecipeIntentSpec(entry)
}

function formatDescription(description: string | undefined): string {
  return JSON.stringify((description ?? '').trim())
}

function formatUsageExamples(examples: Array<[string, string]>): string {
  return examples
    .map(([label, example]) => `      [${JSON.stringify(label)}, ${JSON.stringify(example)}],`)
    .join('\n')
}

function formatSchemaFields(fieldSpecs: GeneratedSchemaField[]): string {
  return fieldSpecs
    .map((fieldSpec) => {
      const requiredLine = fieldSpec.required ? '\n      required: true,' : ''
      return `  ${fieldSpec.propertyName} = Option.String('${fieldSpec.optionFlags}', {
    description: ${formatDescription(fieldSpec.description)},${requiredLine}
  })`
    })
    .join('\n\n')
}

function formatRawValues(fieldSpecs: GeneratedSchemaField[]): string {
  if (fieldSpecs.length === 0) {
    return '{}'
  }

  return `{
${fieldSpecs.map((fieldSpec) => `        ${JSON.stringify(fieldSpec.name)}: this.${fieldSpec.propertyName},`).join('\n')}
      }`
}

function formatFieldSpecsLiteral(fieldSpecs: GeneratedSchemaField[]): string {
  if (fieldSpecs.length === 0) return '[]'

  return `[
${fieldSpecs
  .map(
    (fieldSpec) =>
      `        { name: ${JSON.stringify(fieldSpec.name)}, kind: ${JSON.stringify(fieldSpec.kind)} },`,
  )
  .join('\n')}
      ]`
}

function formatLocalInputOptions(input: ResolvedIntentLocalFilesInput): string {
  const blocks = [
    `  inputs = Option.Array('--input,-i', {
    description: ${JSON.stringify(input.description)},
  })`,
  ]

  if (input.recursive !== false) {
    blocks.push(`  recursive = Option.Boolean('--recursive,-r', false, {
    description: 'Enumerate input directories recursively',
  })`)
  }

  if (input.allowWatch) {
    blocks.push(`  watch = Option.Boolean('--watch,-w', false, {
    description: 'Watch inputs for changes',
  })`)
  }

  if (input.deleteAfterProcessing !== false) {
    blocks.push(`  deleteAfterProcessing = Option.Boolean('--delete-after-processing,-d', false, {
    description: 'Delete input files after they are processed',
  })`)
  }

  if (input.reprocessStale !== false) {
    blocks.push(`  reprocessStale = Option.Boolean('--reprocess-stale', false, {
    description: 'Process inputs even if output is newer',
  })`)
  }

  if (input.allowSingleAssembly) {
    blocks.push(`  singleAssembly = Option.Boolean('--single-assembly', false, {
    description: 'Pass all input files to a single assembly instead of one assembly per file',
  })`)
  }

  if (input.allowConcurrency) {
    blocks.push(`  concurrency = Option.String('--concurrency,-c', {
    description: 'Maximum number of concurrent assemblies (default: 5)',
    validator: t.isNumber(),
  })`)
  }

  return blocks.join('\n\n')
}

function formatInputOptions(spec: ResolvedIntentCommandSpec): string {
  if (spec.input.kind === 'local-files') {
    return formatLocalInputOptions(spec.input)
  }

  if (spec.input.kind === 'remote-url') {
    return `  input = Option.String('--input,-i', {
    description: ${JSON.stringify(spec.input.description)},
    required: true,
  })`
  }

  return ''
}

function formatLocalCreateOptions(spec: ResolvedIntentCommandSpec): string {
  if (spec.input.kind !== 'local-files') {
    throw new Error('Expected a local-files input spec')
  }

  const entries = ['      inputs: this.inputs ?? [],', '      output: this.outputPath,']

  if (spec.outputMode != null) {
    entries.push(`      outputMode: ${JSON.stringify(spec.outputMode)},`)
  }

  if (spec.input.recursive !== false) {
    entries.push('      recursive: this.recursive,')
  }

  if (spec.input.allowWatch) {
    entries.push('      watch: this.watch,')
  }

  if (spec.input.deleteAfterProcessing !== false) {
    entries.push('      del: this.deleteAfterProcessing,')
  }

  if (spec.input.reprocessStale !== false) {
    entries.push('      reprocessStale: this.reprocessStale,')
  }

  if (spec.input.allowSingleAssembly) {
    entries.push('      singleAssembly: this.singleAssembly,')
  } else if (spec.input.defaultSingleAssembly) {
    entries.push('      singleAssembly: true,')
  }

  if (spec.input.allowConcurrency) {
    entries.push(
      '      concurrency: this.concurrency == null ? undefined : Number(this.concurrency),',
    )
  }

  return entries.join('\n')
}

function formatLocalValidation(spec: ResolvedIntentCommandSpec, commandLabel: string): string {
  if (spec.input.kind !== 'local-files') {
    throw new Error('Expected a local-files input spec')
  }

  const lines =
    spec.input.requiredFieldForInputless == null
      ? [
          '    if ((this.inputs ?? []).length === 0) {',
          `      this.output.error('${commandLabel} requires at least one --input')`,
          '      return 1',
          '    }',
        ]
      : [
          `    if ((this.inputs ?? []).length === 0 && this.${toCamelCase(spec.input.requiredFieldForInputless)} == null) {`,
          `      this.output.error('${commandLabel} requires --input or --${toKebabCase(spec.input.requiredFieldForInputless)}')`,
          '      return 1',
          '    }',
        ]

  if (spec.input.allowWatch && spec.input.allowSingleAssembly) {
    lines.push(
      '',
      '    if (this.singleAssembly && this.watch) {',
      "      this.output.error('--single-assembly cannot be used with --watch')",
      '      return 1',
      '    }',
    )
  }

  if (spec.input.allowWatch && spec.input.defaultSingleAssembly) {
    lines.push(
      '',
      '    if (this.watch) {',
      "      this.output.error('--watch is not supported for this command')",
      '      return 1',
      '    }',
    )
  }

  return lines.join('\n')
}

function formatSingleStepFixedValues(spec: ResolvedIntentCommandSpec): string {
  if (spec.execution.kind !== 'single-step') {
    throw new Error('Expected a single-step execution spec')
  }

  if (spec.input.kind === 'local-files' && spec.input.requiredFieldForInputless != null) {
    const baseFixedValues = JSON.stringify(spec.execution.fixedValues, null, 6).replace(
      /\n/g,
      '\n      ',
    )

    return `(this.inputs ?? []).length > 0
      ? {
          ...${baseFixedValues},
          use: ':original',
        }
      : ${baseFixedValues}`
  }

  return JSON.stringify(spec.execution.fixedValues, null, 6).replace(/\n/g, '\n      ')
}

function formatRunBody(
  spec: ResolvedIntentCommandSpec,
  fieldSpecs: GeneratedSchemaField[],
): string {
  const schemaSpec = spec.schemaSpec
  if (spec.execution.kind === 'single-step') {
    const parseStep = `    const step = parseIntentStep({
      schema: ${schemaSpec?.importName},
      fixedValues: ${formatSingleStepFixedValues(spec)},
      fieldSpecs: ${formatFieldSpecsLiteral(fieldSpecs)},
      rawValues: ${formatRawValues(fieldSpecs)},
    })`

    if (spec.input.kind === 'local-files') {
      return `${formatLocalValidation(spec, spec.paths.join(' '))}

${parseStep}

    const { hasFailures } = await assembliesCommands.create(this.output, this.client, {
      stepsData: {
        ${JSON.stringify(spec.execution.resultStepName)}: step,
      },
${formatLocalCreateOptions(spec)}
    })

    return hasFailures ? 1 : undefined`
    }

    return `${parseStep}

    const { hasFailures } = await assembliesCommands.create(this.output, this.client, {
      stepsData: {
        ${JSON.stringify(spec.execution.resultStepName)}: step,
      },
      inputs: [],
      output: this.outputPath,
    })

    return hasFailures ? 1 : undefined`
  }

  if (spec.execution.kind === 'remote-preview') {
    const parseStep = `    const previewStep = parseIntentStep({
      schema: ${schemaSpec?.importName},
      fixedValues: ${JSON.stringify(spec.execution.fixedValues, null, 6).replace(/\n/g, '\n      ')},
      fieldSpecs: ${formatFieldSpecsLiteral(fieldSpecs)},
      rawValues: ${formatRawValues(fieldSpecs)},
    })`

    return `${parseStep}

    const { hasFailures } = await assembliesCommands.create(this.output, this.client, {
      stepsData: {
        ${JSON.stringify(spec.execution.importStepName)}: {
          robot: '/http/import',
          url: this.input,
        },
        ${JSON.stringify(spec.execution.previewStepName)}: {
          ...previewStep,
          use: ${JSON.stringify(spec.execution.importStepName)},
        },
      },
      inputs: [],
      output: this.outputPath,
    })

    return hasFailures ? 1 : undefined`
  }

  if (spec.input.kind !== 'local-files') {
    throw new Error(`Template command ${spec.className} requires local-files input`)
  }

  return `${formatLocalValidation(spec, spec.paths.join(' '))}

    const { hasFailures } = await assembliesCommands.create(this.output, this.client, {
      template: ${JSON.stringify(spec.execution.templateId)},
${formatLocalCreateOptions(spec)}
    })

    return hasFailures ? 1 : undefined`
}

function resolveFixedValues(spec: ResolvedIntentCommandSpec): Record<string, unknown> {
  if (spec.execution.kind === 'single-step') {
    return spec.execution.fixedValues
  }

  if (spec.execution.kind === 'remote-preview') {
    return spec.execution.fixedValues
  }

  return {}
}

function generateImports(specs: ResolvedIntentCommandSpec[]): string {
  const imports = new Map<string, string>()

  for (const spec of specs) {
    if (spec.schemaSpec == null) continue
    imports.set(spec.schemaSpec.importName, spec.schemaSpec.importPath)
  }

  return [...imports.entries()]
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
    .map(([importName, importPath]) => `import { ${importName} } from '${importPath}'`)
    .join('\n')
}

function generateClass(spec: ResolvedIntentCommandSpec): string {
  const fixedValues = resolveFixedValues(spec)
  const fieldSpecs =
    spec.schemaSpec == null ? [] : collectSchemaFields(spec.schemaSpec, fixedValues, spec.input)
  const schemaFields = formatSchemaFields(fieldSpecs)
  const inputOptions = formatInputOptions(spec)
  const runBody = formatRunBody(spec, fieldSpecs)

  return `
export class ${spec.className} extends AuthenticatedCommand {
  static override paths = ${JSON.stringify([spec.paths])}

  static override usage = Command.Usage({
    category: 'Intent Commands',
    description: ${JSON.stringify(spec.description)},
    details: ${JSON.stringify(spec.details)},
    examples: [
${formatUsageExamples(spec.examples)}
    ],
  })

${schemaFields}${schemaFields && inputOptions ? '\n\n' : ''}${inputOptions}

  outputPath = Option.String('--out,-o', {
    description: ${JSON.stringify(spec.outputDescription)},
    required: ${spec.outputRequired},
  })

  protected async run(): Promise<number | undefined> {
${runBody}
  }
}
`
}

function generateFile(specs: ResolvedIntentCommandSpec[]): string {
  const commandClasses = specs.map(generateClass)
  const commandNames = specs.map((spec) => spec.className)

  return `// DO NOT EDIT BY HAND.
// Generated by \`packages/node/scripts/generate-intent-commands.ts\`.

import { Command, Option } from 'clipanion'
import * as t from 'typanion'

${generateImports(specs)}
import { parseIntentStep } from '../intentRuntime.ts'
import * as assembliesCommands from './assemblies.ts'
import { AuthenticatedCommand } from './BaseCommand.ts'
${commandClasses.join('\n')}
export const intentCommands = [
${commandNames.map((name) => `  ${name},`).join('\n')}
] as const
`
}

async function main(): Promise<void> {
  const resolvedSpecs = intentCatalog.map(resolveIntentCommandSpec)

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, generateFile(resolvedSpecs))
  await execa(
    'yarn',
    ['exec', 'biome', 'check', '--write', path.relative(packageRoot, outputPath)],
    {
      cwd: packageRoot,
    },
  )
}

main().catch((error) => {
  if (!(error instanceof Error)) {
    throw new Error(`Was thrown a non-error: ${error}`)
  }

  console.error(error)
  process.exit(1)
})
