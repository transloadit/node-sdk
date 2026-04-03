import type { CommandClass } from 'clipanion'
import { Command } from 'clipanion'
import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod'

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
import {
  createIntentOption,
  inferIntentExampleValue,
  inferIntentFieldKind,
  unwrapIntentSchema,
} from './intentFields.ts'
import type { IntentInputPolicy } from './intentInputPolicy.ts'
import type {
  IntentCommandDefinition,
  IntentFileCommandDefinition,
  IntentNoInputCommandDefinition,
  IntentSingleStepExecutionDefinition,
} from './intentRuntime.ts'
import {
  GeneratedBundledFileIntentCommand,
  GeneratedNoInputIntentCommand,
  GeneratedStandardFileIntentCommand,
  GeneratedWatchableFileIntentCommand,
  getIntentOptionDefinitions,
} from './intentRuntime.ts'
import { getSemanticIntentDescriptor } from './semanticIntents/index.ts'

interface GeneratedSchemaField extends IntentFieldSpec {
  description?: string
  exampleValue: string
  optionFlags: string
  propertyName: string
  required: boolean
}

interface ResolvedIntentLocalFilesInput {
  defaultSingleAssembly?: boolean
  inputPolicy: IntentInputPolicy
  kind: 'local-files'
}

interface ResolvedIntentNoneInput {
  kind: 'none'
}

type ResolvedIntentInput = ResolvedIntentLocalFilesInput | ResolvedIntentNoneInput

type IntentBaseClass =
  | typeof GeneratedBundledFileIntentCommand
  | typeof GeneratedNoInputIntentCommand
  | typeof GeneratedStandardFileIntentCommand
  | typeof GeneratedWatchableFileIntentCommand

type BuiltIntentCommandDefinition = IntentCommandDefinition & {
  intentDefinition: IntentFileCommandDefinition | IntentNoInputCommandDefinition
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

function inferOutputPath(
  paths: string[],
  outputMode: IntentOutputMode,
  fieldSpecs: readonly GeneratedSchemaField[],
): string {
  if (outputMode === 'directory') {
    return 'output/'
  }

  const formatExample = fieldSpecs
    .map((fieldSpec) =>
      fieldSpec.required && fieldSpec.name === 'format' ? fieldSpec.exampleValue : null,
    )
    .find((value) => value != null)

  if (fieldSpecs.some((fieldSpec) => fieldSpec.name === 'format') && formatExample != null) {
    if (fieldSpecs.some((fieldSpec) => fieldSpec.name === 'relative_pathname')) {
      return `archive.${formatExample}`
    }
  }

  if (formatExample != null && /^[-\w]+$/.test(formatExample)) {
    return `output.${formatExample}`
  }

  return getDefaultOutputPath(paths, outputMode)
}

function inferInputModeFromShape(shape: Record<string, ZodTypeAny>): IntentInputMode {
  if ('prompt' in shape) {
    return unwrapIntentSchema(shape.prompt).required ? 'none' : 'local-files'
  }

  return 'local-files'
}

function inferIntentInput(
  definition: RobotIntentDefinition,
  shape: Record<string, ZodTypeAny>,
): ResolvedIntentInput {
  const inputMode = definition.inputMode ?? inferInputModeFromShape(shape)
  if (inputMode === 'none') {
    return { kind: 'none' }
  }

  const promptIsOptional = 'prompt' in shape && !unwrapIntentSchema(shape.prompt).required
  const inputPolicy = promptIsOptional
    ? ({
        kind: 'optional',
        field: 'prompt',
        attachUseWhenInputsProvided: true,
      } satisfies IntentInputPolicy)
    : ({ kind: 'required' } satisfies IntentInputPolicy)

  if (definition.defaultSingleAssembly) {
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

function inferFixedValues(
  definition: RobotIntentDefinition,
  input: ResolvedIntentInput,
  inputMode: IntentInputMode,
): Record<string, unknown> {
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

  if (inputMode === 'none') {
    return {
      robot: definition.robot,
      result: true,
    }
  }

  if (input.kind === 'local-files' && input.inputPolicy.kind === 'required') {
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

function collectSchemaFields(
  schemaShape: Record<string, ZodTypeAny>,
  fixedValues: Record<string, unknown>,
  input: ResolvedIntentInput,
): GeneratedSchemaField[] {
  return Object.entries(schemaShape)
    .filter(([key]) => !hiddenFieldNames.has(key) && !Object.hasOwn(fixedValues, key))
    .flatMap(([key, fieldSchema]) => {
      const { required: schemaRequired, schema: unwrappedSchema } = unwrapIntentSchema(fieldSchema)

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
          exampleValue: inferIntentExampleValue({
            kind,
            name: key,
            schema: unwrappedSchema as ZodTypeAny,
          }),
          kind,
        },
      ]
    })
}

function inferExamples(
  spec: BuiltIntentCommandDefinition,
  definition?: RobotIntentDefinition,
): Array<[string, string]> {
  if (definition == null) {
    if (spec.intentDefinition.execution.kind === 'dynamic-step') {
      return spec.examples
    }

    return [
      ['Run the command', `transloadit ${spec.paths.join(' ')} --input input.mp4 --out output/`],
    ]
  }

  const parts = ['transloadit', ...spec.paths]
  const schemaShape = (definition.schema as ZodObject<ZodRawShape>).shape as Record<
    string,
    ZodTypeAny
  >
  const inputMode = definition.inputMode ?? inferInputModeFromShape(schemaShape)
  const fieldSpecs =
    spec.intentDefinition.execution.kind === 'single-step'
      ? (spec.intentDefinition.execution.fields as readonly GeneratedSchemaField[])
      : []

  if (inputMode === 'local-files') {
    parts.push('--input', getTypicalInputFile(definition.meta))
  }

  if (inputMode === 'none') {
    const promptField = fieldSpecs.find((fieldSpec) => fieldSpec.name === 'prompt')
    parts.push('--prompt', promptField?.exampleValue ?? JSON.stringify('A red bicycle in a studio'))
  }

  for (const fieldSpec of fieldSpecs) {
    if (!fieldSpec.required) continue
    if (fieldSpec.name === 'prompt' && inputMode === 'none') continue

    parts.push(fieldSpec.optionFlags, fieldSpec.exampleValue)
  }

  const outputMode = spec.intentDefinition.outputMode ?? 'file'
  parts.push('--out', inferOutputPath(spec.paths, outputMode, fieldSpecs))

  return [['Run the command', parts.join(' ')]]
}

function resolveRobotIntent(definition: RobotIntentDefinition): BuiltIntentCommandDefinition {
  const paths = getIntentPaths(definition)
  const className = `${toPascalCase(paths)}Command`
  const commandLabel = paths.join(' ')
  const schema = definition.schema as ZodObject<ZodRawShape>
  const schemaShape = schema.shape as Record<string, ZodTypeAny>
  const inputMode = definition.inputMode ?? inferInputModeFromShape(schemaShape)
  const input = inferIntentInput(definition, schemaShape)
  const fixedValues = inferFixedValues(definition, input, inputMode)
  const fieldSpecs = collectSchemaFields(schemaShape, fixedValues, input)
  const outputMode = definition.outputMode ?? 'file'
  const execution: IntentSingleStepExecutionDefinition = {
    kind: 'single-step',
    schema,
    fields: fieldSpecs,
    fixedValues,
    resultStepName:
      getIntentResultStepName(definition) ??
      (() => {
        throw new Error(`Could not infer result step name for "${definition.robot}"`)
      })(),
  }

  const spec: BuiltIntentCommandDefinition = {
    className,
    description: stripTrailingPunctuation(definition.meta.title),
    details:
      inputMode === 'none'
        ? `Runs \`${definition.robot}\` and writes the result to \`--out\`.`
        : definition.defaultSingleAssembly === true
          ? `Runs \`${definition.robot}\` for the provided inputs and writes the result to \`--out\`.`
          : outputMode === 'directory'
            ? `Runs \`${definition.robot}\` on each input file and writes the results to \`--out\`.`
            : `Runs \`${definition.robot}\` on each input file and writes the result to \`--out\`.`,
    examples: [],
    paths,
    runnerKind:
      input.kind === 'none' ? 'no-input' : input.defaultSingleAssembly ? 'bundled' : 'standard',
    intentDefinition:
      input.kind === 'none'
        ? {
            execution,
            outputDescription: 'Write the result to this path',
            outputMode,
          }
        : {
            commandLabel,
            execution,
            inputPolicy: input.inputPolicy,
            outputDescription:
              outputMode === 'directory'
                ? 'Write the results to this directory'
                : 'Write the result to this path or directory',
            outputMode,
          },
  }

  return {
    ...spec,
    examples: inferExamples(spec, definition),
  }
}

function resolveSemanticIntent(definition: SemanticIntentDefinition): BuiltIntentCommandDefinition {
  const paths = getIntentPaths(definition)
  const descriptor = getSemanticIntentDescriptor(definition.semantic)

  return {
    className: `${toPascalCase(paths)}Command`,
    description: descriptor.presentation.description,
    details: descriptor.presentation.details,
    examples: [...descriptor.presentation.examples],
    paths,
    runnerKind: descriptor.runnerKind,
    intentDefinition: {
      commandLabel: paths.join(' '),
      execution: descriptor.execution,
      inputPolicy: descriptor.inputPolicy,
      outputDescription: descriptor.outputDescription,
    },
  }
}

function resolveTemplateIntent(
  definition: IntentDefinition & { kind: 'template' },
): BuiltIntentCommandDefinition {
  const outputMode = definition.outputMode ?? 'file'
  const paths = getIntentPaths(definition)
  const spec: BuiltIntentCommandDefinition = {
    className: `${toPascalCase(paths)}Command`,
    description: `Run ${stripTrailingPunctuation(definition.templateId)}`,
    details: `Runs the \`${definition.templateId}\` template and writes the outputs to \`--out\`.`,
    examples: [],
    paths,
    runnerKind: 'standard',
    intentDefinition: {
      commandLabel: paths.join(' '),
      execution: {
        kind: 'template',
        templateId: definition.templateId,
      },
      inputPolicy: { kind: 'required' },
      outputDescription:
        outputMode === 'directory'
          ? 'Write the results to this directory'
          : 'Write the result to this path or directory',
      outputMode,
    },
  }

  return {
    ...spec,
    examples: inferExamples(spec),
  }
}

function resolveIntent(definition: IntentDefinition): BuiltIntentCommandDefinition {
  if (definition.kind === 'robot') {
    return resolveRobotIntent(definition)
  }

  if (definition.kind === 'semantic') {
    return resolveSemanticIntent(definition)
  }

  return resolveTemplateIntent(definition)
}

function getBaseClass(spec: BuiltIntentCommandDefinition): IntentBaseClass {
  if (spec.runnerKind === 'no-input') {
    return GeneratedNoInputIntentCommand
  }

  if (spec.runnerKind === 'bundled') {
    return GeneratedBundledFileIntentCommand
  }

  if (spec.runnerKind === 'watchable') {
    return GeneratedWatchableFileIntentCommand
  }

  return GeneratedStandardFileIntentCommand
}

function createIntentCommandClass(spec: BuiltIntentCommandDefinition): CommandClass {
  const BaseClass = getBaseClass(spec)

  class RuntimeIntentCommand extends BaseClass {}

  Object.defineProperty(RuntimeIntentCommand, 'name', {
    value: spec.className,
  })

  Object.assign(RuntimeIntentCommand, {
    paths: [spec.paths],
    intentDefinition: spec.intentDefinition,
    usage: Command.Usage({
      category: 'Intent Commands',
      description: spec.description,
      details: spec.details,
      examples: spec.examples,
    }),
  })

  for (const field of getIntentOptionDefinitions(spec.intentDefinition)) {
    Object.defineProperty(RuntimeIntentCommand.prototype, field.propertyName, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: createIntentOption(field),
    })
  }

  return RuntimeIntentCommand as unknown as CommandClass
}

export const intentCommands = intentCatalog.map(resolveIntent).map(createIntentCommandClass)
