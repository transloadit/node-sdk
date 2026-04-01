import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod'
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

import type { RobotMetaInput } from '../alphalib/types/robots/_instructions-primitives.ts'
import type {
  IntentDefinition,
  IntentInputMode,
  IntentOutputMode,
  RobotIntentDefinition,
} from './intentCommandSpecs.ts'
import { getIntentPaths, getIntentResultStepName, intentCatalog } from './intentCommandSpecs.ts'

export type GeneratedFieldKind = 'auto' | 'boolean' | 'number' | 'string'

export interface GeneratedSchemaField {
  description?: string
  kind: GeneratedFieldKind
  name: string
  optionFlags: string
  propertyName: string
  required: boolean
}

export interface ResolvedIntentLocalFilesInput {
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

export interface ResolvedIntentNoneInput {
  kind: 'none'
}

export type ResolvedIntentInput = ResolvedIntentLocalFilesInput | ResolvedIntentNoneInput

export interface ResolvedIntentSchemaSpec {
  importName: string
  importPath: string
  schema: ZodObject<ZodRawShape>
}

export interface ResolvedIntentSingleStepExecution {
  fixedValues: Record<string, unknown>
  kind: 'single-step'
  resultStepName: string
}

export interface ResolvedIntentTemplateExecution {
  kind: 'template'
  templateId: string
}

export type ResolvedIntentExecution =
  | ResolvedIntentSingleStepExecution
  | ResolvedIntentTemplateExecution

export interface ResolvedIntentCommandSpec {
  className: string
  commandLabel: string
  description: string
  details: string
  examples: Array<[string, string]>
  execution: ResolvedIntentExecution
  fieldSpecs: GeneratedSchemaField[]
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
    const optionKinds = Array.from(
      new Set(schema._def.options.map((option: unknown) => getFieldKind(option))),
    ) as GeneratedFieldKind[]
    if (optionKinds.length === 1) {
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

  const shape = (definition.schema as ZodObject<ZodRawShape>).shape
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

  const shape = (definition.schema as ZodObject<ZodRawShape>).shape
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
  const shape = (definition.schema as ZodObject<ZodRawShape>).shape
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

function collectSchemaFields(
  schemaSpec: ResolvedIntentSchemaSpec,
  fixedValues: Record<string, unknown>,
  input: ResolvedIntentInput,
): GeneratedSchemaField[] {
  const shape = (schemaSpec.schema as ZodObject<ZodRawShape>).shape as Record<string, ZodTypeAny>

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
    schema: definition.schema as ZodObject<ZodRawShape>,
  } satisfies ResolvedIntentSchemaSpec
  const execution = {
    kind: 'single-step',
    resultStepName: inferResultStepName(definition.robot),
    fixedValues: inferFixedValues(definition, inputMode),
  } satisfies ResolvedIntentSingleStepExecution
  const fieldSpecs = collectSchemaFields(schemaSpec, execution.fixedValues, input)

  return {
    className: inferClassName(paths),
    commandLabel: paths.join(' '),
    description: inferDescription(definition),
    details: inferDetails(
      definition,
      inputMode,
      outputMode,
      definition.defaultSingleAssembly === true,
    ),
    examples: inferExamples(definition, paths, inputMode, outputMode, fieldSpecs),
    execution,
    fieldSpecs,
    input,
    outputDescription: inferOutputDescription(inputMode, outputMode),
    outputMode,
    outputRequired: true,
    paths,
    schemaSpec,
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
    commandLabel: paths.join(' '),
    description: `Run ${stripTrailingPunctuation(definition.templateId)}`,
    details: `Runs the \`${definition.templateId}\` template and writes the outputs to \`--out\`.`,
    examples: [
      ['Run the command', `transloadit ${paths.join(' ')} --input input.mp4 --out output/`],
    ],
    execution: {
      kind: 'template',
      templateId: definition.templateId,
    },
    fieldSpecs: [],
    input,
    outputDescription: inferOutputDescription('local-files', outputMode),
    outputMode,
    outputRequired: true,
    paths,
  }
}

export function resolveIntentCommandSpec(definition: IntentDefinition): ResolvedIntentCommandSpec {
  if (definition.kind === 'robot') {
    return resolveRobotIntentSpec(definition)
  }

  return resolveTemplateIntentSpec(definition)
}

export function resolveIntentCommandSpecs(): ResolvedIntentCommandSpec[] {
  return intentCatalog.map(resolveIntentCommandSpec)
}
