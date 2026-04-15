import { statSync } from 'node:fs'
import { basename, dirname, join, parse, resolve } from 'node:path'
import { Option } from 'clipanion'
import type { z } from 'zod'

import { prepareInputFiles } from '../inputFiles.ts'
import type { AssembliesCreateOptions } from './commands/assemblies.ts'
import * as assembliesCommands from './commands/assemblies.ts'
import { AuthenticatedCommand } from './commands/BaseCommand.ts'
import type { SharedCliOptionDocumentation } from './fileProcessingOptions.ts'
import {
  concurrencyOption,
  countProvidedInputs,
  deleteAfterProcessingOption,
  inputPathsOption,
  printUrlsOption,
  recursiveOption,
  reprocessStaleOption,
  singleAssemblyOption,
  validateSharedFileProcessingOptions,
  watchOption,
} from './fileProcessingOptions.ts'
import type { IntentFieldSpec } from './intentFields.ts'
import { coerceIntentFieldValue } from './intentFields.ts'
import type { IntentInputPolicy } from './intentInputPolicy.ts'
import { printResultUrls } from './resultUrls.ts'
import { getSemanticIntentDescriptor } from './semanticIntents/index.ts'

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

export interface IntentDynamicStepExecutionDefinition {
  fields: readonly IntentOptionDefinition[]
  handler: string
  kind: 'dynamic-step'
  resultStepName: string
}

export interface IntentTemplateExecutionDefinition {
  kind: 'template'
  templateId: string
}

export type IntentFileExecutionDefinition =
  | IntentDynamicStepExecutionDefinition
  | IntentSingleStepExecutionDefinition
  | IntentTemplateExecutionDefinition

export interface IntentFileCommandDefinition {
  commandLabel: string
  defaultOutputPath: string
  execution: IntentFileExecutionDefinition
  inputPolicy: IntentInputPolicy
  outputDescription: string
  outputMode?: 'directory' | 'file'
}

export interface IntentNoInputCommandDefinition {
  defaultOutputPath: string
  execution: IntentSingleStepExecutionDefinition
  outputDescription: string
  outputMode?: 'directory' | 'file'
}

export type IntentRunnerKind = 'bundled' | 'no-input' | 'standard' | 'watchable'

export interface IntentCommandDefinition {
  className: string
  description: string
  details: string
  examples: Array<[string, string]>
  intentDefinition: IntentFileCommandDefinition | IntentNoInputCommandDefinition
  paths: string[]
  runnerKind: IntentRunnerKind
}

export interface IntentOptionDefinition extends IntentFieldSpec {
  description?: string
  exampleValue?: unknown
  optionFlags: string
  propertyName: string
  required?: boolean
}

const inputBase64OptionDocumentation = {
  flags: '--input-base64',
  type: 'base64 | data URL',
  required: 'no',
  example: 'data:text/plain;base64,SGVsbG8=',
  description: 'Provide base64-encoded input content directly',
} as const satisfies SharedCliOptionDocumentation

export function getInputBase64OptionDocumentation(): SharedCliOptionDocumentation {
  return inputBase64OptionDocumentation
}

function inputBase64Option(): string[] {
  return Option.Array(inputBase64OptionDocumentation.flags, {
    description: inputBase64OptionDocumentation.description,
  }) as unknown as string[]
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function parseBase64DataUrl(
  value: string,
): { mediaType: string | null; payload: string; trimmed: string } | null {
  const trimmed = value.trim()
  const marker = ';base64,'
  const markerIndex = trimmed.indexOf(marker)
  if (!trimmed.startsWith('data:') || markerIndex === -1) {
    return null
  }

  return {
    trimmed,
    mediaType: trimmed.slice('data:'.length, markerIndex).split(';')[0]?.toLowerCase() ?? null,
    payload: trimmed.slice(markerIndex + marker.length),
  }
}

function normalizeBase64Value(value: string): string {
  const parsed = parseBase64DataUrl(value)
  return parsed?.payload ?? value.trim()
}

function inferFilenameFromBase64Value(value: string, index: number): string {
  const parsed = parseBase64DataUrl(value)
  if (parsed == null) {
    return `input-base64-${index}.bin`
  }

  const extensionByMediaType = {
    'text/plain': 'txt',
    'text/markdown': 'md',
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'application/json': 'json',
  } as const satisfies Record<string, string>
  const extension =
    (extensionByMediaType as Record<string, string>)[parsed.mediaType ?? ''] ?? 'bin'

  return `input-base64-${index}.${extension}`
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
    const filename = inferFilenameFromBase64Value(value, index + 1)
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

function parseIntentStep<TSchema extends z.AnyZodObject>({
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

function createDynamicIntentStep(
  execution: IntentDynamicStepExecutionDefinition,
  rawValues: Record<string, unknown>,
  hasInputs: boolean,
): Record<string, unknown> {
  return getSemanticIntentDescriptor(execution.handler).createStep(rawValues, { hasInputs })
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
  outputMode,
  outputPath,
  printUrls,
  rawValues,
  createOptions,
}: {
  client: AuthenticatedCommand['client']
  createOptions: Omit<AssembliesCreateOptions, 'output' | 'steps' | 'stepsData' | 'template'>
  definition: IntentFileCommandDefinition | IntentNoInputCommandDefinition
  output: AuthenticatedCommand['output']
  outputMode?: 'directory' | 'file'
  outputPath?: string
  printUrls: boolean
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
            [definition.execution.resultStepName]:
              definition.execution.kind === 'single-step'
                ? createSingleStep(
                    definition.execution,
                    inputPolicy,
                    rawValues,
                    createOptions.inputs.length > 0,
                  )
                : createDynamicIntentStep(
                    definition.execution,
                    rawValues,
                    createOptions.inputs.length > 0,
                  ),
          } as AssembliesCreateOptions['stepsData'],
        }

  const { hasFailures, resultUrls } = await assembliesCommands.create(output, client, {
    ...createOptions,
    output: outputPath ?? null,
    outputMode,
    ...executionOptions,
  })
  if (printUrls) {
    printResultUrls(output, resultUrls)
  }
  return hasFailures ? 1 : undefined
}

abstract class GeneratedIntentCommandBase extends AuthenticatedCommand {
  declare static intentDefinition: IntentFileCommandDefinition | IntentNoInputCommandDefinition

  // Intents standardize on --output while the surface is still young enough to change cleanly.
  outputPath = Option.String('--output,-o', {
    description: this.getOutputDescription(),
  })

  printUrls = printUrlsOption()

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

  protected resolveDefaultOutputPath(rawValues: Record<string, unknown>): string | undefined {
    const defaultOutputPath = this.getIntentDefinition().defaultOutputPath
    if (this.getIntentDefinition().outputMode === 'directory') {
      return defaultOutputPath
    }

    const format = rawValues.format
    if (typeof format !== 'string') {
      return defaultOutputPath
    }

    const trimmedFormat = format.trim().toLowerCase()
    if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(trimmedFormat)) {
      return defaultOutputPath
    }

    const parsedDefaultOutputPath = parse(defaultOutputPath)
    const outputBasename =
      parsedDefaultOutputPath.name === ''
        ? basename(defaultOutputPath, parsedDefaultOutputPath.ext)
        : parsedDefaultOutputPath.name

    return join(parsedDefaultOutputPath.dir, `${outputBasename}.${trimmedFormat}`)
  }

  protected getDefaultOutputPath(rawValues: Record<string, unknown>): string | undefined {
    return this.resolveDefaultOutputPath(rawValues)
  }

  protected getEffectiveOutputPath(rawValues: Record<string, unknown>): string | undefined {
    if (this.outputPath != null) {
      return this.outputPath
    }

    if (this.printUrls) {
      return undefined
    }

    return this.getDefaultOutputPath(rawValues)
  }

  protected getEffectiveOutputMode(
    _rawValues: Record<string, unknown>,
    _outputPath: string | undefined,
  ): 'directory' | 'file' | undefined {
    return this.getIntentDefinition().outputMode
  }
}

export abstract class GeneratedNoInputIntentCommand extends GeneratedIntentCommandBase {
  protected override async run(): Promise<number | undefined> {
    const rawValues = this.getIntentRawValues()
    return await executeIntentCommand({
      client: this.client,
      createOptions: {
        inputs: [],
      },
      definition: this.getIntentDefinition() as IntentNoInputCommandDefinition,
      output: this.output,
      outputMode: this.getEffectiveOutputMode(rawValues, this.getEffectiveOutputPath(rawValues)),
      outputPath: this.getEffectiveOutputPath(rawValues),
      printUrls: this.printUrls ?? false,
      rawValues,
    })
  }
}

export function getIntentOptionDefinitions(
  definition: IntentFileCommandDefinition | IntentNoInputCommandDefinition,
): readonly IntentOptionDefinition[] {
  if (definition.execution.kind !== 'single-step' && definition.execution.kind !== 'dynamic-step') {
    return []
  }

  return definition.execution.fields
}

function readIntentRawValues(
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

abstract class GeneratedFileIntentCommandBase extends GeneratedIntentCommandBase {
  inputs = inputPathsOption('Provide an input path, directory, URL, or - for stdin')

  inputBase64 = inputBase64Option()

  recursive = recursiveOption()

  deleteAfterProcessing = deleteAfterProcessingOption()

  reprocessStale = reprocessStaleOption()

  protected override getIntentDefinition(): IntentFileCommandDefinition {
    return super.getIntentDefinition() as IntentFileCommandDefinition
  }

  protected getSingleFilesystemFileInput(): string | null {
    if ((this.inputBase64?.length ?? 0) > 0) {
      return null
    }

    const localInputs = (this.inputs ?? []).filter((input) => input !== '-' && !isHttpUrl(input))
    if (localInputs.length !== 1) {
      return null
    }

    const candidate = localInputs[0]
    if (candidate == null) {
      return null
    }

    try {
      return statSync(candidate).isFile() ? candidate : null
    } catch {
      return null
    }
  }

  protected hasDirectoryInput(): boolean {
    return (this.inputs ?? []).some((input) => {
      if (input === '-' || isHttpUrl(input)) {
        return false
      }

      try {
        return statSync(input).isDirectory()
      } catch {
        return false
      }
    })
  }

  protected prefersDirectoryDefaultOutput(): boolean {
    return this.getIntentDefinition().outputMode === 'directory'
  }

  protected getSuggestedDirectoryOutputPath(): string {
    if (this.getIntentDefinition().outputMode === 'directory') {
      return this.resolveDefaultOutputPath({}) ?? 'output/'
    }

    return 'output/'
  }

  protected getSiblingOutputPath(inputPath: string, rawValues: Record<string, unknown>): string {
    if (this.getIntentDefinition().outputMode === 'directory') {
      return join(dirname(inputPath), parse(inputPath).name)
    }

    const resolvedDefaultOutputPath = this.resolveDefaultOutputPath(rawValues)
    const extension = parse(
      resolvedDefaultOutputPath ?? this.getIntentDefinition().defaultOutputPath,
    ).ext
    const parsedInputPath = parse(inputPath)
    const candidateOutputPath = join(dirname(inputPath), `${parsedInputPath.name}${extension}`)
    if (resolve(candidateOutputPath) !== resolve(inputPath)) {
      return candidateOutputPath
    }

    return join(dirname(inputPath), `${parsedInputPath.name}-output${extension}`)
  }

  protected override getDefaultOutputPath(rawValues: Record<string, unknown>): string | undefined {
    if (this.prefersDirectoryDefaultOutput()) {
      const singleFilesystemFileInput = this.getSingleFilesystemFileInput()
      if (
        this.getIntentDefinition().outputMode === 'directory' &&
        singleFilesystemFileInput != null
      ) {
        return this.getSiblingOutputPath(singleFilesystemFileInput, rawValues)
      }

      return this.getSuggestedDirectoryOutputPath()
    }

    const singleFilesystemFileInput = this.getSingleFilesystemFileInput()
    if (singleFilesystemFileInput != null) {
      return this.getSiblingOutputPath(singleFilesystemFileInput, rawValues)
    }

    return this.resolveDefaultOutputPath(rawValues)
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

  protected resolveOutputMode(outputPath: string | undefined): 'directory' | 'file' | undefined {
    if (this.getIntentDefinition().outputMode != null) {
      return this.getIntentDefinition().outputMode
    }

    if (outputPath == null) {
      return undefined
    }

    if (this.outputPath == null && this.prefersDirectoryDefaultOutput()) {
      return 'directory'
    }

    if (/[\\/]$/.test(outputPath)) {
      return 'directory'
    }

    try {
      return statSync(outputPath).isDirectory() ? 'directory' : 'file'
    } catch {
      return 'file'
    }
  }

  protected isDirectoryOutputTarget(): boolean {
    return this.resolveOutputMode(this.outputPath) === 'directory'
  }

  protected override getEffectiveOutputMode(
    rawValues: Record<string, unknown>,
    outputPath: string | undefined,
  ): 'directory' | 'file' | undefined {
    return this.resolveOutputMode(outputPath ?? this.getDefaultOutputPath(rawValues))
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
    const validationError = this.validateInputPresence(rawValues)
    if (validationError != null) {
      return validationError
    }

    const execution = this.getIntentDefinition().execution
    if (execution.kind === 'dynamic-step') {
      createDynamicIntentStep(execution, rawValues, this.getProvidedInputCount() > 0)
    }

    return undefined
  }

  protected validatePreparedInputs(_preparedInputs: PreparedIntentInputs): number | undefined {
    return undefined
  }

  protected async executePreparedInputs(
    rawValues: Record<string, unknown>,
    preparedInputs: PreparedIntentInputs,
  ): Promise<number | undefined> {
    let effectivePreparedInputs = preparedInputs
    const execution = this.getIntentDefinition().execution
    if (execution.kind === 'dynamic-step') {
      const descriptor = getSemanticIntentDescriptor(execution.handler)
      if (descriptor.prepareInputs != null) {
        effectivePreparedInputs = await descriptor.prepareInputs(preparedInputs, rawValues)
      }
    }

    const effectiveOutputPath = this.getEffectiveOutputPath(rawValues)
    return await executeIntentCommand({
      client: this.client,
      createOptions: this.getCreateOptions(effectivePreparedInputs.inputs),
      definition: this.getIntentDefinition(),
      output: this.output,
      outputMode: this.getEffectiveOutputMode(rawValues, effectiveOutputPath),
      outputPath: effectiveOutputPath,
      printUrls: this.printUrls ?? false,
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
    const validationError = super.validateBeforePreparingInputs(rawValues)
    if (validationError != null) {
      return validationError
    }

    const sharedValidationError = validateSharedFileProcessingOptions({
      explicitInputCount: this.getProvidedInputCount(),
      singleAssembly: this.getSingleAssemblyEnabled(),
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

  protected getSingleAssemblyEnabled(): boolean {
    return false
  }

  protected override prefersDirectoryDefaultOutput(): boolean {
    return (
      super.prefersDirectoryDefaultOutput() ||
      this.getProvidedInputCount() > 1 ||
      this.hasDirectoryInput()
    )
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

  protected override getSingleAssemblyEnabled(): boolean {
    return this.singleAssembly
  }

  protected override prefersDirectoryDefaultOutput(): boolean {
    return (
      super.prefersDirectoryDefaultOutput() ||
      (this.singleAssembly && (this.getProvidedInputCount() > 1 || this.hasDirectoryInput()))
    )
  }

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
      (this.getProvidedInputCount() > 1 || this.hasDirectoryInput()) &&
      this.outputPath != null &&
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
