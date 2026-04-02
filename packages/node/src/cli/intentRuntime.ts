import { statSync } from 'node:fs'
import { basename } from 'node:path'
import { Option } from 'clipanion'
import * as t from 'typanion'
import type { z } from 'zod'

import { prepareInputFiles } from '../inputFiles.ts'
import type { AssembliesCreateOptions } from './commands/assemblies.ts'
import * as assembliesCommands from './commands/assemblies.ts'
import { AuthenticatedCommand } from './commands/BaseCommand.ts'
import {
  concurrencyOption,
  countProvidedInputs,
  deleteAfterProcessingOption,
  inputPathsOption,
  recursiveOption,
  reprocessStaleOption,
  singleAssemblyOption,
  validateSharedFileProcessingOptions,
  watchOption,
} from './fileProcessingOptions.ts'
import type { IntentFieldSpec } from './intentFields.ts'
import { coerceIntentFieldValue } from './intentFields.ts'
import type { IntentInputPolicy } from './intentInputPolicy.ts'

export interface PreparedIntentInputs {
  cleanup: Array<() => Promise<void>>
  hasTransientInputs: boolean
  inputs: string[]
}

export interface IntentSingleStepExecutionDefinition {
  fields: readonly IntentOptionDefinition[]
  fixedValues: Record<string, unknown>
  kind: 'single-step'
  resultStepName: string
  schema: z.AnyZodObject
}

export interface IntentTemplateExecutionDefinition {
  kind: 'template'
  templateId: string
}

export type IntentFileExecutionDefinition =
  | IntentSingleStepExecutionDefinition
  | IntentTemplateExecutionDefinition

export interface IntentFileCommandDefinition {
  commandLabel: string
  execution: IntentFileExecutionDefinition
  inputPolicy: IntentInputPolicy
  outputDescription: string
  outputMode?: 'directory' | 'file'
}

export interface IntentNoInputCommandDefinition {
  execution: IntentSingleStepExecutionDefinition
  outputDescription: string
  outputMode?: 'directory' | 'file'
}

export interface IntentOptionDefinition extends IntentFieldSpec {
  description?: string
  optionFlags: string
  propertyName: string
  required?: boolean
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeBase64Value(value: string): string {
  const trimmed = value.trim()
  const marker = ';base64,'
  const markerIndex = trimmed.indexOf(marker)
  if (!trimmed.startsWith('data:') || markerIndex === -1) {
    return trimmed
  }

  return trimmed.slice(markerIndex + marker.length)
}

export async function prepareIntentInputs({
  inputBase64Values,
  inputValues,
}: {
  inputBase64Values: string[]
  inputValues: string[]
}): Promise<PreparedIntentInputs> {
  const preparedOrder: string[] = []
  const syntheticInputs: Array<
    | {
        base64: string
        field: string
        filename: string
        kind: 'base64'
      }
    | {
        field: string
        kind: 'url'
        url: string
      }
  > = []

  for (const value of inputValues) {
    if (!isHttpUrl(value)) {
      preparedOrder.push(value)
      continue
    }

    const field = `input_url_${syntheticInputs.length + 1}`
    syntheticInputs.push({
      kind: 'url',
      field,
      url: value,
    })
    preparedOrder.push(field)
  }

  for (const [index, value] of inputBase64Values.entries()) {
    const field = `input_base64_${index + 1}`
    const filename = `input-base64-${index + 1}.bin`
    syntheticInputs.push({
      kind: 'base64',
      field,
      filename,
      base64: normalizeBase64Value(value),
    })
    preparedOrder.push(field)
  }

  if (syntheticInputs.length === 0) {
    return {
      cleanup: [],
      hasTransientInputs: false,
      inputs: preparedOrder,
    }
  }

  const prepared = await prepareInputFiles({
    inputFiles: syntheticInputs.map((input) => {
      if (input.kind === 'url') {
        return {
          kind: 'url' as const,
          field: input.field,
          url: input.url,
          filename: basename(new URL(input.url).pathname) || undefined,
        }
      }

      return {
        kind: 'base64' as const,
        field: input.field,
        base64: input.base64,
        filename: input.filename,
      }
    }),
    base64Strategy: 'tempfile',
    allowPrivateUrls: false,
    urlStrategy: 'download',
  })

  const inputs = preparedOrder.map((value) => prepared.files[value] ?? value)

  return {
    cleanup: prepared.cleanup,
    hasTransientInputs: true,
    inputs,
  }
}

export function parseIntentStep<TSchema extends z.AnyZodObject>({
  fields,
  fixedValues,
  rawValues,
  schema,
}: {
  fields: readonly IntentFieldSpec[]
  fixedValues: Record<string, unknown>
  rawValues: Record<string, unknown>
  schema: TSchema
}): z.input<TSchema> {
  const input: Record<string, unknown> = { ...fixedValues }

  for (const fieldSpec of fields) {
    const rawValue = rawValues[fieldSpec.name]
    if (rawValue == null) continue
    const fieldSchema = schema.shape[fieldSpec.name]
    input[fieldSpec.name] = coerceIntentFieldValue(fieldSpec.kind, rawValue, fieldSchema)
  }

  const parsed = schema.parse(input) as Record<string, unknown>
  const normalizedInput: Record<string, unknown> = { ...fixedValues }

  for (const fieldSpec of fields) {
    const rawValue = rawValues[fieldSpec.name]
    if (rawValue == null) continue
    normalizedInput[fieldSpec.name] = parsed[fieldSpec.name]
  }

  return normalizedInput as z.input<TSchema>
}

function resolveSingleStepFixedValues(
  execution: IntentSingleStepExecutionDefinition,
  inputPolicy: IntentInputPolicy,
  hasInputs: boolean,
): Record<string, unknown> {
  if (!hasInputs) {
    return execution.fixedValues
  }

  if (inputPolicy.kind !== 'optional' || inputPolicy.attachUseWhenInputsProvided !== true) {
    return execution.fixedValues
  }

  return {
    ...execution.fixedValues,
    use: ':original',
  }
}

function createSingleStep(
  execution: IntentSingleStepExecutionDefinition,
  inputPolicy: IntentInputPolicy,
  rawValues: Record<string, unknown>,
  hasInputs: boolean,
): z.input<typeof execution.schema> {
  return parseIntentStep({
    schema: execution.schema,
    fixedValues: resolveSingleStepFixedValues(execution, inputPolicy, hasInputs),
    fields: execution.fields,
    rawValues,
  })
}

function requiresLocalInput(
  inputPolicy: IntentInputPolicy,
  rawValues: Record<string, unknown>,
): boolean {
  if (inputPolicy.kind === 'required') {
    return true
  }

  return rawValues[inputPolicy.field] == null
}

async function executeIntentCommand({
  client,
  definition,
  output,
  outputPath,
  rawValues,
  createOptions,
}: {
  client: AuthenticatedCommand['client']
  createOptions: Omit<AssembliesCreateOptions, 'output' | 'steps' | 'stepsData' | 'template'>
  definition: IntentFileCommandDefinition | IntentNoInputCommandDefinition
  output: AuthenticatedCommand['output']
  outputPath: string
  rawValues: Record<string, unknown>
}): Promise<number | undefined> {
  const inputPolicy: IntentInputPolicy =
    'inputPolicy' in definition ? definition.inputPolicy : { kind: 'required' }
  const executionOptions =
    definition.execution.kind === 'template'
      ? {
          template: definition.execution.templateId,
        }
      : {
          stepsData: {
            [definition.execution.resultStepName]: createSingleStep(
              definition.execution,
              inputPolicy,
              rawValues,
              createOptions.inputs.length > 0,
            ),
          } as AssembliesCreateOptions['stepsData'],
        }

  const { hasFailures } = await assembliesCommands.create(output, client, {
    ...createOptions,
    output: outputPath,
    outputMode: definition.outputMode,
    ...executionOptions,
  })
  return hasFailures ? 1 : undefined
}

abstract class GeneratedIntentCommandBase extends AuthenticatedCommand {
  declare static intentDefinition: IntentFileCommandDefinition | IntentNoInputCommandDefinition

  outputPath = Option.String('--out,-o', {
    description: this.getOutputDescription(),
    required: true,
  })

  protected getIntentDefinition(): IntentFileCommandDefinition | IntentNoInputCommandDefinition {
    const commandClass = this.constructor as unknown as typeof GeneratedIntentCommandBase
    return commandClass.intentDefinition
  }

  protected getIntentRawValues(): Record<string, unknown> {
    return readIntentRawValues(this, getIntentOptionDefinitions(this.getIntentDefinition()))
  }

  private getOutputDescription(): string {
    return this.getIntentDefinition().outputDescription
  }
}

export abstract class GeneratedNoInputIntentCommand extends GeneratedIntentCommandBase {
  protected override async run(): Promise<number | undefined> {
    return await executeIntentCommand({
      client: this.client,
      createOptions: {
        inputs: [],
      },
      definition: this.getIntentDefinition() as IntentNoInputCommandDefinition,
      output: this.output,
      outputPath: this.outputPath,
      rawValues: this.getIntentRawValues(),
    })
  }
}

export function createIntentOption(fieldDefinition: IntentOptionDefinition): unknown {
  const { description, kind, optionFlags, required } = fieldDefinition

  if (kind === 'boolean') {
    return Option.Boolean(optionFlags, {
      description,
      required,
    })
  }

  if (kind === 'number') {
    return Option.String(optionFlags, {
      description,
      required,
      validator: t.isNumber(),
    })
  }

  return Option.String(optionFlags, {
    description,
    required,
  })
}

export function getIntentOptionDefinitions(
  definition: IntentFileCommandDefinition | IntentNoInputCommandDefinition,
): readonly IntentOptionDefinition[] {
  if (definition.execution.kind !== 'single-step') {
    return []
  }

  return definition.execution.fields
}

export function readIntentRawValues(
  command: object,
  fieldDefinitions: readonly IntentOptionDefinition[],
): Record<string, unknown> {
  const rawValues: Record<string, unknown> = {}

  for (const fieldDefinition of fieldDefinitions) {
    rawValues[fieldDefinition.name] = (command as Record<string, unknown>)[
      fieldDefinition.propertyName
    ]
  }

  return rawValues
}

export abstract class GeneratedFileIntentCommandBase extends GeneratedIntentCommandBase {
  inputs = inputPathsOption('Provide an input path, directory, URL, or - for stdin')

  inputBase64 = Option.Array('--input-base64', {
    description: 'Provide base64-encoded input content directly',
  })

  recursive = recursiveOption()

  deleteAfterProcessing = deleteAfterProcessingOption()

  reprocessStale = reprocessStaleOption()

  protected override getIntentDefinition(): IntentFileCommandDefinition {
    return super.getIntentDefinition() as IntentFileCommandDefinition
  }

  protected async prepareInputs(): Promise<PreparedIntentInputs> {
    return await prepareIntentInputs({
      inputValues: this.inputs ?? [],
      inputBase64Values: this.inputBase64 ?? [],
    })
  }

  protected getCreateOptions(
    inputs: string[],
  ): Omit<AssembliesCreateOptions, 'output' | 'steps' | 'stepsData' | 'template'> {
    return {
      del: this.deleteAfterProcessing,
      inputs,
      reprocessStale: this.reprocessStale,
      recursive: this.recursive,
    }
  }

  protected getProvidedInputCount(): number {
    return countProvidedInputs({
      inputs: this.inputs,
      inputBase64: this.inputBase64,
    })
  }

  protected hasTransientInputSources(): boolean {
    return (
      (this.inputs?.some((input) => isHttpUrl(input)) ?? false) ||
      (this.inputBase64?.length ?? 0) > 0
    )
  }

  protected resolveOutputMode(): 'directory' | 'file' | undefined {
    if (this.getIntentDefinition().outputMode != null) {
      return this.getIntentDefinition().outputMode
    }

    try {
      return statSync(this.outputPath).isDirectory() ? 'directory' : 'file'
    } catch {
      return 'file'
    }
  }

  protected isDirectoryOutputTarget(): boolean {
    return this.resolveOutputMode() === 'directory'
  }

  protected validateInputPresence(rawValues: Record<string, unknown>): number | undefined {
    const intentDefinition = this.getIntentDefinition()
    const inputCount = this.getProvidedInputCount()
    if (inputCount !== 0) {
      return undefined
    }

    if (!requiresLocalInput(intentDefinition.inputPolicy, rawValues)) {
      return undefined
    }

    if (intentDefinition.inputPolicy.kind === 'required') {
      this.output.error(`${intentDefinition.commandLabel} requires --input or --input-base64`)
      return 1
    }

    this.output.error(
      `${intentDefinition.commandLabel} requires --input or --${intentDefinition.inputPolicy.field.replaceAll('_', '-')}`,
    )
    return 1
  }

  protected validateBeforePreparingInputs(rawValues: Record<string, unknown>): number | undefined {
    return this.validateInputPresence(rawValues)
  }

  protected validatePreparedInputs(_preparedInputs: PreparedIntentInputs): number | undefined {
    return undefined
  }

  protected async executePreparedInputs(
    rawValues: Record<string, unknown>,
    preparedInputs: PreparedIntentInputs,
  ): Promise<number | undefined> {
    return await executeIntentCommand({
      client: this.client,
      createOptions: this.getCreateOptions(preparedInputs.inputs),
      definition: this.getIntentDefinition(),
      output: this.output,
      outputPath: this.outputPath,
      rawValues,
    })
  }

  protected override async run(): Promise<number | undefined> {
    const rawValues = this.getIntentRawValues()
    const validationError = this.validateBeforePreparingInputs(rawValues)
    if (validationError != null) {
      return validationError
    }

    const preparedInputs = await this.prepareInputs()
    try {
      const preparedInputError = this.validatePreparedInputs(preparedInputs)
      if (preparedInputError != null) {
        return preparedInputError
      }

      return await this.executePreparedInputs(rawValues, preparedInputs)
    } finally {
      await Promise.all(preparedInputs.cleanup.map((cleanup) => cleanup()))
    }
  }
}

export abstract class GeneratedWatchableFileIntentCommand extends GeneratedFileIntentCommandBase {
  watch = watchOption()

  concurrency = concurrencyOption()

  protected override getCreateOptions(
    inputs: string[],
  ): Omit<AssembliesCreateOptions, 'output' | 'steps' | 'stepsData' | 'template'> {
    return {
      ...super.getCreateOptions(inputs),
      concurrency: this.concurrency,
      watch: this.watch,
    }
  }

  protected override validateBeforePreparingInputs(
    rawValues: Record<string, unknown>,
  ): number | undefined {
    const validationError = this.validateInputPresence(rawValues)
    if (validationError != null) {
      return validationError
    }

    const sharedValidationError = validateSharedFileProcessingOptions({
      explicitInputCount: this.getProvidedInputCount(),
      singleAssembly: false,
      watch: this.watch,
      watchRequiresInputsMessage: `${this.getIntentDefinition().commandLabel} --watch requires --input or --input-base64`,
    })
    if (sharedValidationError != null) {
      this.output.error(sharedValidationError)
      return 1
    }

    if (this.watch && this.hasTransientInputSources()) {
      this.output.error('--watch is only supported for filesystem inputs')
      return 1
    }

    return undefined
  }

  protected override validatePreparedInputs(
    preparedInputs: PreparedIntentInputs,
  ): number | undefined {
    if (this.watch && preparedInputs.hasTransientInputs) {
      this.output.error('--watch is only supported for filesystem inputs')
      return 1
    }
    return undefined
  }
}

export abstract class GeneratedStandardFileIntentCommand extends GeneratedWatchableFileIntentCommand {
  singleAssembly = singleAssemblyOption()

  protected override getCreateOptions(
    inputs: string[],
  ): Omit<AssembliesCreateOptions, 'output' | 'steps' | 'stepsData' | 'template'> {
    return {
      ...super.getCreateOptions(inputs),
      singleAssembly: this.singleAssembly,
    }
  }

  protected override validateBeforePreparingInputs(
    rawValues: Record<string, unknown>,
  ): number | undefined {
    const validationError = super.validateBeforePreparingInputs(rawValues)
    if (validationError != null) {
      return validationError
    }

    if (
      this.singleAssembly &&
      this.getProvidedInputCount() > 1 &&
      !this.isDirectoryOutputTarget()
    ) {
      this.output.error(
        'Output must be a directory when using --single-assembly with multiple inputs',
      )
      return 1
    }

    return undefined
  }
}

export abstract class GeneratedBundledFileIntentCommand extends GeneratedFileIntentCommandBase {
  protected override getCreateOptions(
    inputs: string[],
  ): Omit<AssembliesCreateOptions, 'output' | 'steps' | 'stepsData' | 'template'> {
    return {
      ...super.getCreateOptions(inputs),
      singleAssembly: true,
    }
  }
}
