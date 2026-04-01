import { basename } from 'node:path'
import { Option } from 'clipanion'
import * as t from 'typanion'
import type { z } from 'zod'

import { prepareInputFiles } from '../inputFiles.ts'
import type { AssembliesCreateOptions } from './commands/assemblies.ts'
import * as assembliesCommands from './commands/assemblies.ts'
import { AuthenticatedCommand } from './commands/BaseCommand.ts'
import type { IntentFieldSpec } from './intentFields.ts'
import { coerceIntentFieldValue } from './intentFields.ts'

export interface PreparedIntentInputs {
  cleanup: Array<() => Promise<void>>
  hasTransientInputs: boolean
  inputs: string[]
}

export interface IntentSingleStepExecutionDefinition {
  attachUseWhenInputsProvided?: boolean
  fieldSpecs: readonly IntentFieldSpec[]
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
  outputMode?: 'directory' | 'file'
  requiredFieldForInputless?: string
}

export interface IntentNoInputCommandDefinition {
  execution: IntentSingleStepExecutionDefinition
  outputMode?: 'directory' | 'file'
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
  fieldSpecs,
  fixedValues,
  rawValues,
  schema,
}: {
  fieldSpecs: readonly IntentFieldSpec[]
  fixedValues: Record<string, unknown>
  rawValues: Record<string, string | undefined>
  schema: TSchema
}): z.input<TSchema> {
  const input: Record<string, unknown> = { ...fixedValues }

  for (const fieldSpec of fieldSpecs) {
    const rawValue = rawValues[fieldSpec.name]
    if (rawValue == null) continue
    const fieldSchema = schema.shape[fieldSpec.name]
    input[fieldSpec.name] = coerceIntentFieldValue(fieldSpec.kind, rawValue, fieldSchema)
  }

  const parsed = schema.parse(input) as Record<string, unknown>
  const normalizedInput: Record<string, unknown> = { ...fixedValues }

  for (const fieldSpec of fieldSpecs) {
    const rawValue = rawValues[fieldSpec.name]
    if (rawValue == null) continue
    normalizedInput[fieldSpec.name] = parsed[fieldSpec.name]
  }

  return normalizedInput as z.input<TSchema>
}

function resolveSingleStepFixedValues(
  execution: IntentSingleStepExecutionDefinition,
  hasInputs: boolean,
): Record<string, unknown> {
  if (!hasInputs || execution.attachUseWhenInputsProvided !== true) {
    return execution.fixedValues
  }

  return {
    ...execution.fixedValues,
    use: ':original',
  }
}

function createSingleStep(
  execution: IntentSingleStepExecutionDefinition,
  rawValues: Record<string, string | undefined>,
  hasInputs: boolean,
): z.input<typeof execution.schema> {
  return parseIntentStep({
    schema: execution.schema,
    fixedValues: resolveSingleStepFixedValues(execution, hasInputs),
    fieldSpecs: execution.fieldSpecs,
    rawValues,
  })
}

function requiresLocalInput(
  requiredFieldForInputless: string | undefined,
  rawValues: Record<string, string | undefined>,
): boolean {
  if (requiredFieldForInputless == null) {
    return true
  }

  return rawValues[requiredFieldForInputless] == null
}

async function executeFileIntentCommand({
  client,
  definition,
  output,
  outputPath,
  rawValues,
  createOptions,
}: {
  client: AuthenticatedCommand['client']
  createOptions: Omit<AssembliesCreateOptions, 'output' | 'steps' | 'stepsData' | 'template'>
  definition: IntentFileCommandDefinition
  output: AuthenticatedCommand['output']
  outputPath: string
  rawValues: Record<string, string | undefined>
}): Promise<number | undefined> {
  if (definition.execution.kind === 'template') {
    const { hasFailures } = await assembliesCommands.create(output, client, {
      ...createOptions,
      template: definition.execution.templateId,
      output: outputPath,
      outputMode: definition.outputMode,
    })
    return hasFailures ? 1 : undefined
  }

  const step = createSingleStep(definition.execution, rawValues, createOptions.inputs.length > 0)
  const { hasFailures } = await assembliesCommands.create(output, client, {
    ...createOptions,
    output: outputPath,
    outputMode: definition.outputMode,
    stepsData: {
      [definition.execution.resultStepName]: step,
    } as AssembliesCreateOptions['stepsData'],
  })
  return hasFailures ? 1 : undefined
}

abstract class GeneratedIntentCommandBase extends AuthenticatedCommand {
  outputPath = Option.String('--out,-o', {
    description: 'Write the result to this path',
    required: true,
  })

  protected abstract getIntentRawValues(): Record<string, string | undefined>
}

export abstract class GeneratedNoInputIntentCommand extends GeneratedIntentCommandBase {
  protected abstract readonly intentDefinition: IntentNoInputCommandDefinition

  protected override async run(): Promise<number | undefined> {
    const step = createSingleStep(this.intentDefinition.execution, this.getIntentRawValues(), false)
    const { hasFailures } = await assembliesCommands.create(this.output, this.client, {
      inputs: [],
      output: this.outputPath,
      outputMode: this.intentDefinition.outputMode,
      stepsData: {
        [this.intentDefinition.execution.resultStepName]: step,
      } as AssembliesCreateOptions['stepsData'],
    })

    return hasFailures ? 1 : undefined
  }
}

abstract class GeneratedFileIntentCommandBase extends GeneratedIntentCommandBase {
  inputs = Option.Array('--input,-i', {
    description: 'Provide an input path, directory, URL, or - for stdin',
  })

  inputBase64 = Option.Array('--input-base64', {
    description: 'Provide base64-encoded input content directly',
  })

  recursive = Option.Boolean('--recursive,-r', false, {
    description: 'Enumerate input directories recursively',
  })

  deleteAfterProcessing = Option.Boolean('--delete-after-processing,-d', false, {
    description: 'Delete input files after they are processed',
  })

  reprocessStale = Option.Boolean('--reprocess-stale', false, {
    description: 'Process inputs even if output is newer',
  })

  protected abstract readonly intentDefinition: IntentFileCommandDefinition

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
    return (this.inputs ?? []).length + (this.inputBase64 ?? []).length
  }

  protected validateInputPresence(
    rawValues: Record<string, string | undefined>,
  ): number | undefined {
    const inputCount = this.getProvidedInputCount()
    if (inputCount !== 0) {
      return undefined
    }

    if (!requiresLocalInput(this.intentDefinition.requiredFieldForInputless, rawValues)) {
      return undefined
    }

    if (this.intentDefinition.requiredFieldForInputless == null) {
      this.output.error(`${this.intentDefinition.commandLabel} requires --input or --input-base64`)
      return 1
    }

    this.output.error(
      `${this.intentDefinition.commandLabel} requires --input or --${this.intentDefinition.requiredFieldForInputless.replaceAll('_', '-')}`,
    )
    return 1
  }

  protected validateBeforePreparingInputs(
    rawValues: Record<string, string | undefined>,
  ): number | undefined {
    return this.validateInputPresence(rawValues)
  }

  protected validatePreparedInputs(_preparedInputs: PreparedIntentInputs): number | undefined {
    return undefined
  }

  protected async executePreparedInputs(
    rawValues: Record<string, string | undefined>,
    preparedInputs: PreparedIntentInputs,
  ): Promise<number | undefined> {
    return await executeFileIntentCommand({
      client: this.client,
      createOptions: this.getCreateOptions(preparedInputs.inputs),
      definition: this.intentDefinition,
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

export abstract class GeneratedStandardFileIntentCommand extends GeneratedFileIntentCommandBase {
  watch = Option.Boolean('--watch,-w', false, {
    description: 'Watch inputs for changes',
  })

  singleAssembly = Option.Boolean('--single-assembly', false, {
    description: 'Pass all input files to a single assembly instead of one assembly per file',
  })

  concurrency = Option.String('--concurrency,-c', {
    description: 'Maximum number of concurrent assemblies (default: 5)',
    validator: t.isNumber(),
  })

  protected override getCreateOptions(
    inputs: string[],
  ): Omit<AssembliesCreateOptions, 'output' | 'steps' | 'stepsData' | 'template'> {
    return {
      ...super.getCreateOptions(inputs),
      concurrency: this.concurrency == null ? undefined : Number(this.concurrency),
      singleAssembly: this.singleAssembly,
      watch: this.watch,
    }
  }

  protected override validateBeforePreparingInputs(
    rawValues: Record<string, string | undefined>,
  ): number | undefined {
    const validationError = this.validateInputPresence(rawValues)
    if (validationError != null) {
      return validationError
    }

    if (this.watch && this.getProvidedInputCount() === 0) {
      this.output.error(
        `${this.intentDefinition.commandLabel} --watch requires --input or --input-base64`,
      )
      return 1
    }

    if (this.singleAssembly && this.watch) {
      this.output.error('--single-assembly cannot be used with --watch')
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
