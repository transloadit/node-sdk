import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod'
import { ZodDefault, ZodEffects, ZodNullable, ZodOptional } from 'zod'

import type { RobotMetaInput } from '../alphalib/types/robots/_instructions-primitives.ts'
import type {
  IntentDefinition,
  IntentInputMode,
  IntentOutputMode,
  RobotIntentDefinition,
  SemanticIntentDefinition,
} from './intentCommandSpecs.ts'
import { getIntentPaths, getIntentResultStepName, intentCatalog } from './intentCommandSpecs.ts'
import type { IntentFieldKind, IntentFieldSpec } from './intentFields.ts'
import { inferIntentFieldKind } from './intentFields.ts'
import type { IntentInputPolicy } from './intentInputPolicy.ts'

export interface GeneratedSchemaField extends IntentFieldSpec {
  description?: string
  optionFlags: string
  propertyName: string
  required: boolean
}

export interface ResolvedIntentLocalFilesInput {
  defaultSingleAssembly?: boolean
  inputPolicy: IntentInputPolicy
  kind: 'local-files'
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

export interface ResolvedIntentDynamicExecution {
  fields: GeneratedSchemaField[]
  handler: 'image-describe'
  kind: 'dynamic-step'
  resultStepName: string
}

export interface ResolvedIntentTemplateExecution {
  kind: 'template'
  templateId: string
}

export type ResolvedIntentExecution =
  | ResolvedIntentDynamicExecution
  | ResolvedIntentSingleStepExecution
  | ResolvedIntentTemplateExecution

export type ResolvedIntentRunnerKind = 'bundled' | 'no-input' | 'standard' | 'watchable'

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
  paths: string[]
  runnerKind: ResolvedIntentRunnerKind
  schemaSpec?: ResolvedIntentSchemaSpec
}

interface RobotIntentPresentation {
  outputPath?: string
  promptExample?: string
  requiredExampleValues?: Partial<Record<string, string>>
}

interface RobotIntentAnalysis {
  className: string
  commandLabel: string
  definition: RobotIntentDefinition
  details: string
  description: string
  execution: ResolvedIntentSingleStepExecution
  fieldSpecs: GeneratedSchemaField[]
  input: ResolvedIntentInput
  inputMode: IntentInputMode
  outputDescription: string
  outputMode: IntentOutputMode
  paths: string[]
  presentation: RobotIntentPresentation
  schemaShape: Record<string, ZodTypeAny>
  schemaSpec: ResolvedIntentSchemaSpec
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

const robotIntentPresentationOverrides: Partial<Record<string, RobotIntentPresentation>> = {
  '/document/convert': {
    outputPath: 'output.pdf',
    requiredExampleValues: { format: 'pdf' },
  },
  '/file/compress': {
    outputPath: 'archive.zip',
    requiredExampleValues: { format: 'zip' },
  },
  '/image/generate': {
    promptExample: 'A red bicycle in a studio',
    requiredExampleValues: { model: 'flux-schnell' },
  },
  '/video/thumbs': {
    requiredExampleValues: { format: 'jpg' },
  },
}

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

function getSchemaImportName(robot: string): string {
  return `robot${toPascalCase(robot.split('/').filter(Boolean))}InstructionsSchema`
}

function getSchemaImportPath(robot: string): string {
  return `../../alphalib/types/robots/${robot.split('/').filter(Boolean).join('-')}.ts`
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

function getTypicalInputFile(meta: RobotMetaInput): string {
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

function getDefaultOutputPath(paths: string[], outputMode: IntentOutputMode): string {
  if (outputMode === 'directory') {
    return 'output/'
  }

  const [group] = paths
  if (group === 'audio') return 'output.png'
  if (group === 'document') return 'output.pdf'
  if (group === 'image') return 'output.png'
  if (group === 'text') return 'output.mp3'
  return 'output.file'
}

function getDefaultPromptExample(robot: string): string {
  return robotIntentPresentationOverrides[robot]?.promptExample ?? 'Hello world'
}

function getDefaultRequiredExampleValue(
  definition: RobotIntentDefinition,
  fieldSpec: GeneratedSchemaField,
): string | null {
  const override =
    robotIntentPresentationOverrides[definition.robot]?.requiredExampleValues?.[fieldSpec.name]
  if (override != null) {
    return override
  }

  if (fieldSpec.name === 'aspect_ratio') return '1:1'
  if (fieldSpec.name === 'prompt') return JSON.stringify(getDefaultPromptExample(definition.robot))
  if (fieldSpec.name === 'provider') return 'aws'
  if (fieldSpec.name === 'target_language') return 'en-US'
  if (fieldSpec.name === 'voice') return 'female-1'

  if (fieldSpec.kind === 'boolean') return 'true'
  if (fieldSpec.kind === 'number') return '1'

  return 'value'
}

function inferInputModeFromShape(shape: Record<string, ZodTypeAny>): IntentInputMode {
  if ('prompt' in shape) {
    return unwrapSchema(shape.prompt).required ? 'none' : 'local-files'
  }

  return 'local-files'
}

function inferInputSpecFromAnalysis({
  defaultSingleAssembly,
  inputMode,
  inputPolicy,
}: {
  defaultSingleAssembly?: boolean
  inputMode: IntentInputMode
  inputPolicy: IntentInputPolicy
}): ResolvedIntentInput {
  if (inputMode === 'none') {
    return { kind: 'none' }
  }

  if (defaultSingleAssembly) {
    return {
      kind: 'local-files',
      defaultSingleAssembly: true,
      inputPolicy,
    }
  }

  return {
    kind: 'local-files',
    inputPolicy,
  }
}

function inferFixedValuesFromAnalysis({
  defaultSingleAssembly,
  inputMode,
  inputPolicy,
  robot,
}: {
  defaultSingleAssembly?: boolean
  inputMode: IntentInputMode
  inputPolicy: IntentInputPolicy
  robot: string
}): Record<string, unknown> {
  if (defaultSingleAssembly) {
    return {
      robot,
      result: true,
      use: {
        steps: [':original'],
        bundle_steps: true,
      },
    }
  }

  if (inputMode === 'none') {
    return {
      robot,
      result: true,
    }
  }

  if (inputPolicy.kind === 'required') {
    return {
      robot,
      result: true,
      use: ':original',
    }
  }

  return {
    robot,
    result: true,
  }
}

function collectSchemaFields(
  schemaShape: Record<string, ZodTypeAny>,
  fixedValues: Record<string, unknown>,
  input: ResolvedIntentInput,
): GeneratedSchemaField[] {
  return Object.entries(schemaShape)
    .filter(([key]) => !hiddenFieldNames.has(key) && !Object.hasOwn(fixedValues, key))
    .flatMap(([key, fieldSchema]) => {
      const { required: schemaRequired, schema: unwrappedSchema } = unwrapSchema(fieldSchema)

      let kind: IntentFieldKind
      try {
        kind = inferIntentFieldKind(unwrappedSchema)
      } catch {
        return []
      }

      return [
        {
          name: key,
          propertyName: toCamelCase(key),
          optionFlags: `--${toKebabCase(key)}`,
          required: (input.kind === 'none' && key === 'prompt') || schemaRequired,
          description: fieldSchema.description,
          kind,
        },
      ]
    })
}

function analyzeRobotIntent(definition: RobotIntentDefinition): RobotIntentAnalysis {
  const paths = getIntentPaths(definition)
  const commandLabel = paths.join(' ')
  const className = `${toPascalCase(paths)}Command`
  const outputMode = definition.outputMode ?? 'file'
  const schemaSpec = {
    importName: getSchemaImportName(definition.robot),
    importPath: getSchemaImportPath(definition.robot),
    schema: definition.schema as ZodObject<ZodRawShape>,
  } satisfies ResolvedIntentSchemaSpec
  const schemaShape = schemaSpec.schema.shape as Record<string, ZodTypeAny>
  const inputMode = definition.inputMode ?? inferInputModeFromShape(schemaShape)
  const promptIsOptional = 'prompt' in schemaShape && !unwrapSchema(schemaShape.prompt).required
  const inputPolicy = promptIsOptional
    ? ({
        kind: 'optional',
        field: 'prompt',
        attachUseWhenInputsProvided: true,
      } satisfies IntentInputPolicy)
    : ({ kind: 'required' } satisfies IntentInputPolicy)
  const input = inferInputSpecFromAnalysis({
    defaultSingleAssembly: definition.defaultSingleAssembly,
    inputMode,
    inputPolicy,
  })
  const execution = {
    kind: 'single-step',
    resultStepName:
      getIntentResultStepName(definition) ??
      (() => {
        throw new Error(`Could not infer result step name for "${definition.robot}"`)
      })(),
    fixedValues: inferFixedValuesFromAnalysis({
      defaultSingleAssembly: definition.defaultSingleAssembly,
      inputMode,
      inputPolicy,
      robot: definition.robot,
    }),
  } satisfies ResolvedIntentSingleStepExecution
  const fieldSpecs = collectSchemaFields(schemaShape, execution.fixedValues, input)
  const description = stripTrailingPunctuation(definition.meta.title)
  const details =
    inputMode === 'none'
      ? `Runs \`${definition.robot}\` and writes the result to \`--out\`.`
      : definition.defaultSingleAssembly === true
        ? `Runs \`${definition.robot}\` for the provided inputs and writes the result to \`--out\`.`
        : outputMode === 'directory'
          ? `Runs \`${definition.robot}\` on each input file and writes the results to \`--out\`.`
          : `Runs \`${definition.robot}\` on each input file and writes the result to \`--out\`.`

  return {
    className,
    commandLabel,
    definition,
    details,
    description,
    execution,
    fieldSpecs,
    input,
    inputMode,
    outputDescription:
      outputMode === 'directory'
        ? 'Write the results to this directory'
        : inputMode === 'local-files'
          ? 'Write the result to this path or directory'
          : 'Write the result to this path',
    outputMode,
    paths,
    presentation: robotIntentPresentationOverrides[definition.robot] ?? {},
    schemaShape,
    schemaSpec,
  }
}

function inferExamples(analysis: RobotIntentAnalysis): Array<[string, string]> {
  const parts = ['transloadit', ...analysis.paths]

  if (analysis.inputMode === 'local-files') {
    parts.push('--input', getTypicalInputFile(analysis.definition.meta))
  }

  if (analysis.inputMode === 'none') {
    parts.push('--prompt', JSON.stringify(getDefaultPromptExample(analysis.definition.robot)))
  }

  for (const fieldSpec of analysis.fieldSpecs) {
    if (!fieldSpec.required) continue
    if (fieldSpec.name === 'prompt' && analysis.inputMode === 'none') continue

    const exampleValue = getDefaultRequiredExampleValue(analysis.definition, fieldSpec)
    if (exampleValue == null) continue
    parts.push(fieldSpec.optionFlags, exampleValue)
  }

  parts.push(
    '--out',
    analysis.presentation.outputPath ?? getDefaultOutputPath(analysis.paths, analysis.outputMode),
  )

  return [['Run the command', parts.join(' ')]]
}

function resolveRobotIntentSpec(definition: RobotIntentDefinition): ResolvedIntentCommandSpec {
  const analysis = analyzeRobotIntent(definition)

  return {
    className: analysis.className,
    commandLabel: analysis.commandLabel,
    description: analysis.description,
    details: analysis.details,
    examples: inferExamples(analysis),
    execution: analysis.execution,
    fieldSpecs: analysis.fieldSpecs,
    input: analysis.input,
    outputDescription: analysis.outputDescription,
    outputMode: analysis.outputMode,
    paths: analysis.paths,
    runnerKind:
      analysis.input.kind === 'none'
        ? 'no-input'
        : analysis.input.defaultSingleAssembly
          ? 'bundled'
          : 'standard',
    schemaSpec: analysis.schemaSpec,
  }
}

function resolveImageDescribeIntentSpec(
  definition: SemanticIntentDefinition,
): ResolvedIntentCommandSpec {
  const paths = getIntentPaths(definition)

  return {
    className: `${toPascalCase(paths)}Command`,
    commandLabel: paths.join(' '),
    description: 'Describe images as labels or publishable text fields',
    details:
      'Generates image labels through `/image/describe`, or structured altText/title/caption/description through `/ai/chat`, then writes the JSON result to `--out`.',
    examples: [
      [
        'Describe an image as labels',
        'transloadit image describe --input hero.jpg --out labels.json',
      ],
      [
        'Generate WordPress-ready fields',
        'transloadit image describe --input hero.jpg --for wordpress --out fields.json',
      ],
      [
        'Request a custom field set',
        'transloadit image describe --input hero.jpg --fields altText,title,caption --out fields.json',
      ],
    ],
    execution: {
      kind: 'dynamic-step',
      handler: 'image-describe',
      resultStepName: 'describe',
      fields: [
        {
          name: 'fields',
          kind: 'string-array',
          propertyName: 'fields',
          optionFlags: '--fields',
          description:
            'Describe output fields to generate, for example labels or altText,title,caption,description',
          required: false,
        },
        {
          name: 'forProfile',
          kind: 'string',
          propertyName: 'forProfile',
          optionFlags: '--for',
          description: 'Use a named output profile, currently: wordpress',
          required: false,
        },
        {
          name: 'model',
          kind: 'string',
          propertyName: 'model',
          optionFlags: '--model',
          description:
            'Model to use for generated text fields (default: anthropic/claude-sonnet-4-5)',
          required: false,
        },
      ],
    },
    fieldSpecs: [],
    input: inferInputSpecFromAnalysis({
      inputMode: 'local-files',
      inputPolicy: { kind: 'required' },
    }),
    outputDescription: 'Write the JSON result to this path or directory',
    paths,
    runnerKind: 'watchable',
  }
}

function resolveTemplateIntentSpec(
  definition: IntentDefinition & { kind: 'template' },
): ResolvedIntentCommandSpec {
  const outputMode = definition.outputMode ?? 'file'
  const paths = getIntentPaths(definition)

  return {
    className: `${toPascalCase(paths)}Command`,
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
    input: inferInputSpecFromAnalysis({
      inputMode: 'local-files',
      inputPolicy: { kind: 'required' },
    }),
    outputDescription:
      outputMode === 'directory'
        ? 'Write the results to this directory'
        : 'Write the result to this path or directory',
    outputMode,
    paths,
    runnerKind: 'standard',
  }
}

export function resolveIntentCommandSpec(definition: IntentDefinition): ResolvedIntentCommandSpec {
  if (definition.kind === 'robot') {
    return resolveRobotIntentSpec(definition)
  }

  if (definition.kind === 'semantic') {
    return resolveImageDescribeIntentSpec(definition)
  }

  return resolveTemplateIntentSpec(definition)
}

export function resolveIntentCommandSpecs(): ResolvedIntentCommandSpec[] {
  return intentCatalog.map(resolveIntentCommandSpec)
}
