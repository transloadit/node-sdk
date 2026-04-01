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

import type { RobotMetaInput } from '../src/alphalib/types/robots/_instructions-primitives.ts'
import type {
  IntentDefinition,
  IntentInputMode,
  IntentOutputMode,
  RobotIntentDefinition,
} from '../src/cli/intentCommandSpecs.ts'
import {
  getIntentPaths,
  getIntentResultStepName,
  intentCatalog,
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

type ResolvedIntentInput = ResolvedIntentLocalFilesInput | ResolvedIntentNoneInput

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

type ResolvedIntentExecution = ResolvedIntentSingleStepExecution | ResolvedIntentTemplateExecution

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

function inferClassName(paths: string[]): string {
  return `${toPascalCase(paths)}Command`
}

function inferInputMode(definition: RobotIntentDefinition): IntentInputMode {
  if (definition.inputMode != null) {
    return definition.inputMode
  }

  const shape = (definition.schema as ZodObject<Record<string, unknown>>).shape
  if ('prompt' in shape) {
    const promptSchema = shape.prompt
    const { required } = unwrapSchema(promptSchema)
    return required ? 'none' : 'local-files'
  }

  return 'local-files'
}

function inferOutputMode(definition: IntentDefinition): IntentOutputMode {
  return definition.outputMode ?? 'file'
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
      description: 'Provide one or more input paths, directories, URLs, or - for stdin',
      recursive: true,
      deleteAfterProcessing: true,
      reprocessStale: true,
      defaultSingleAssembly: true,
      requiredFieldForInputless,
    }
  }

  return {
    kind: 'local-files',
    description: 'Provide an input path, directory, URL, or - for stdin',
    recursive: true,
    allowWatch: true,
    deleteAfterProcessing: true,
    reprocessStale: true,
    allowSingleAssembly: true,
    allowConcurrency: true,
    requiredFieldForInputless,
  }
}

function inferInputSpec(definition: RobotIntentDefinition): ResolvedIntentInput {
  const inputMode = inferInputMode(definition)
  if (inputMode === 'none') {
    return { kind: 'none' }
  }

  const shape = (definition.schema as ZodObject<Record<string, unknown>>).shape
  const requiredFieldForInputless =
    'prompt' in shape && !unwrapSchema(shape.prompt).required ? 'prompt' : undefined

  return inferLocalFilesInput({
    defaultSingleAssembly: definition.defaultSingleAssembly,
    requiredFieldForInputless,
  })
}

function inferFixedValues(
  definition: RobotIntentDefinition,
  inputMode: IntentInputMode,
): Record<string, unknown> {
  const shape = (definition.schema as ZodObject<Record<string, unknown>>).shape
  const promptIsOptional = 'prompt' in shape && !unwrapSchema(shape.prompt).required

  if (definition.defaultSingleAssembly) {
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
  const definition = intentCatalog.find(
    (intent): intent is RobotIntentDefinition => intent.kind === 'robot' && intent.robot === robot,
  )
  if (definition == null) {
    throw new Error(`No intent definition found for "${robot}"`)
  }

  const stepName = getIntentResultStepName(definition)
  if (stepName == null) {
    throw new Error(`Could not infer result step name for "${robot}"`)
  }

  return stepName
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

function resolveRobotIntentSpec(definition: RobotIntentDefinition): ResolvedIntentCommandSpec {
  const paths = getIntentPaths(definition)
  const inputMode = inferInputMode(definition)
  const outputMode = inferOutputMode(definition)
  const input = inferInputSpec(definition)
  const schemaSpec = {
    importName: definition.schemaImportName,
    importPath: definition.schemaImportPath,
    schema: definition.schema as ZodObject<Record<string, unknown>>,
  } satisfies ResolvedIntentSchemaSpec
  const execution = {
    kind: 'single-step',
    resultStepName: inferResultStepName(definition.robot),
    fixedValues: inferFixedValues(definition, inputMode),
  } satisfies ResolvedIntentSingleStepExecution
  const fieldSpecs = collectSchemaFields(schemaSpec, execution.fixedValues, input)

  return {
    className: inferClassName(paths),
    description: inferDescription(definition),
    details: inferDetails(
      definition,
      inputMode,
      outputMode,
      definition.defaultSingleAssembly === true,
    ),
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
  definition: IntentDefinition & { kind: 'template' },
): ResolvedIntentCommandSpec {
  const outputMode = inferOutputMode(definition)
  const input = inferLocalFilesInput({})
  const paths = getIntentPaths(definition)

  return {
    className: inferClassName(paths),
    description: `Run ${stripTrailingPunctuation(definition.templateId)}`,
    details: `Runs the \`${definition.templateId}\` template and writes the outputs to \`--out\`.`,
    examples: [
      ['Run the command', `transloadit ${paths.join(' ')} --input input.mp4 --out output/`],
    ],
    execution: {
      kind: 'template',
      templateId: definition.templateId,
    },
    input,
    outputDescription: inferOutputDescription('local-files', outputMode),
    outputMode,
    outputRequired: true,
    paths,
  }
}

function resolveIntentCommandSpec(definition: IntentDefinition): ResolvedIntentCommandSpec {
  if (definition.kind === 'robot') {
    return resolveRobotIntentSpec(definition)
  }

  return resolveTemplateIntentSpec(definition)
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

function resolveFixedValues(spec: ResolvedIntentCommandSpec): Record<string, unknown> {
  if (spec.execution.kind === 'single-step') {
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

function getCommandDefinitionName(spec: ResolvedIntentCommandSpec): string {
  return `${spec.className[0]?.toLowerCase() ?? ''}${spec.className.slice(1)}Definition`
}

function getBaseClassName(spec: ResolvedIntentCommandSpec): string {
  if (spec.input.kind === 'none') {
    return 'GeneratedNoInputIntentCommand'
  }

  if (spec.input.defaultSingleAssembly) {
    return 'GeneratedBundledFileIntentCommand'
  }

  return 'GeneratedStandardFileIntentCommand'
}

function formatIntentDefinition(spec: ResolvedIntentCommandSpec): string {
  const fieldSpecs =
    spec.schemaSpec == null
      ? []
      : collectSchemaFields(spec.schemaSpec, resolveFixedValues(spec), spec.input)
  const commandLabel = spec.paths.join(' ')

  if (spec.execution.kind === 'single-step') {
    const attachUseWhenInputsProvided =
      spec.input.kind === 'local-files' && spec.input.requiredFieldForInputless != null
        ? '\n      attachUseWhenInputsProvided: true,'
        : ''
    const commandLabelLine =
      spec.input.kind === 'local-files' ? `\n  commandLabel: ${JSON.stringify(commandLabel)},` : ''
    const requiredField =
      spec.input.kind === 'local-files' && spec.input.requiredFieldForInputless != null
        ? `\n  requiredFieldForInputless: ${JSON.stringify(spec.input.requiredFieldForInputless)},`
        : ''
    const outputMode =
      spec.outputMode == null ? '' : `\n  outputMode: ${JSON.stringify(spec.outputMode)},`

    return `const ${getCommandDefinitionName(spec)} = {${commandLabelLine}${requiredField}${outputMode}
  execution: {
    kind: 'single-step',
    schema: ${spec.schemaSpec?.importName},
    fieldSpecs: ${formatFieldSpecsLiteral(fieldSpecs)},
    fixedValues: ${JSON.stringify(spec.execution.fixedValues, null, 4).replace(/\n/g, '\n    ')},
    resultStepName: ${JSON.stringify(spec.execution.resultStepName)},${attachUseWhenInputsProvided}
  },
} as const`
  }

  const outputMode =
    spec.outputMode == null ? '' : `\n  outputMode: ${JSON.stringify(spec.outputMode)},`
  return `const ${getCommandDefinitionName(spec)} = {
  commandLabel: ${JSON.stringify(commandLabel)},${outputMode}
  execution: {
    kind: 'template',
    templateId: ${JSON.stringify(spec.execution.templateId)},
  },
} as const`
}

function formatRawValuesMethod(fieldSpecs: GeneratedSchemaField[]): string {
  return `  protected override getIntentRawValues(): Record<string, string | undefined> {
    return ${formatRawValues(fieldSpecs)}
  }`
}

function generateClass(spec: ResolvedIntentCommandSpec): string {
  const fixedValues = resolveFixedValues(spec)
  const fieldSpecs =
    spec.schemaSpec == null ? [] : collectSchemaFields(spec.schemaSpec, fixedValues, spec.input)
  const schemaFields = formatSchemaFields(fieldSpecs)
  const rawValuesMethod = formatRawValuesMethod(fieldSpecs)
  const baseClassName = getBaseClassName(spec)

  return `
class ${spec.className} extends ${baseClassName} {
  static override paths = ${JSON.stringify([spec.paths])}

  static override usage = Command.Usage({
    category: 'Intent Commands',
    description: ${JSON.stringify(spec.description)},
    details: ${JSON.stringify(spec.details)},
    examples: [
${formatUsageExamples(spec.examples)}
    ],
  })

  protected override readonly intentDefinition = ${getCommandDefinitionName(spec)}

  override outputPath = Option.String('--out,-o', {
    description: ${JSON.stringify(spec.outputDescription)},
    required: ${spec.outputRequired},
  })

${schemaFields}${schemaFields ? '\n\n' : ''}${rawValuesMethod}
}
`
}

function generateFile(specs: ResolvedIntentCommandSpec[]): string {
  const commandDefinitions = specs.map(formatIntentDefinition)
  const commandClasses = specs.map(generateClass)
  const commandNames = specs.map((spec) => spec.className)

  return `// DO NOT EDIT BY HAND.
// Generated by \`packages/node/scripts/generate-intent-commands.ts\`.

import { Command, Option } from 'clipanion'

${generateImports(specs)}
import {
  GeneratedBundledFileIntentCommand,
  GeneratedNoInputIntentCommand,
  GeneratedStandardFileIntentCommand,
} from '../intentRuntime.ts'
${commandDefinitions.join('\n\n')}
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
