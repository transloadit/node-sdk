import { Option } from 'clipanion'
import * as t from 'typanion'

export interface SharedCliOptionDocumentation {
  description: string
  example: string
  flags: string
  required: string
  type: string
}

interface SharedCliOptionDefinition {
  docs: SharedCliOptionDocumentation
  optionFlags: string
}

export interface SharedFileProcessingValidationInput {
  explicitInputCount: number
  singleAssembly: boolean
  watch: boolean
  watchRequiresInputsMessage: string
}

const inputPathsOptionDefinition = {
  docs: {
    flags: '--input, -i',
    type: 'path | dir | url | -',
    required: 'varies',
    example: 'input.file',
    description: 'Provide an input path, directory, URL, or - for stdin',
  },
  optionFlags: '--input,-i',
} as const satisfies SharedCliOptionDefinition

const recursiveOptionDefinition = {
  docs: {
    flags: '--recursive, -r',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Enumerate input directories recursively',
  },
  optionFlags: '--recursive,-r',
} as const satisfies SharedCliOptionDefinition

const deleteAfterProcessingOptionDefinition = {
  docs: {
    flags: '--delete-after-processing, -d',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Delete input files after they are processed',
  },
  optionFlags: '--delete-after-processing,-d',
} as const satisfies SharedCliOptionDefinition

const reprocessStaleOptionDefinition = {
  docs: {
    flags: '--reprocess-stale',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Process inputs even if output is newer',
  },
  optionFlags: '--reprocess-stale',
} as const satisfies SharedCliOptionDefinition

const watchOptionDefinition = {
  docs: {
    flags: '--watch, -w',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Watch inputs for changes',
  },
  optionFlags: '--watch,-w',
} as const satisfies SharedCliOptionDefinition

const singleAssemblyOptionDefinition = {
  docs: {
    flags: '--single-assembly',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Pass all input files to a single assembly instead of one assembly per file',
  },
  optionFlags: '--single-assembly',
} as const satisfies SharedCliOptionDefinition

const concurrencyOptionDefinition = {
  docs: {
    flags: '--concurrency, -c',
    type: 'number',
    required: 'no',
    example: '5',
    description: 'Maximum number of concurrent assemblies (default: 5)',
  },
  optionFlags: '--concurrency,-c',
} as const satisfies SharedCliOptionDefinition

const printUrlsOptionDefinition = {
  docs: {
    flags: '--print-urls',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Print temporary result URLs after completion',
  },
  optionFlags: '--print-urls',
} as const satisfies SharedCliOptionDefinition

function getSharedCliOptionDocumentation(
  definition: SharedCliOptionDefinition,
  description = definition.docs.description,
): SharedCliOptionDocumentation {
  return {
    ...definition.docs,
    description,
  }
}

function arrayOption(
  definition: SharedCliOptionDefinition,
  description = definition.docs.description,
): string[] {
  return Option.Array(definition.optionFlags, {
    description,
  }) as unknown as string[]
}

function booleanOption(
  definition: SharedCliOptionDefinition,
  description = definition.docs.description,
): boolean {
  return Option.Boolean(definition.optionFlags, false, {
    description,
  }) as unknown as boolean
}

export function getInputPathsOptionDocumentation(
  description = inputPathsOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return getSharedCliOptionDocumentation(inputPathsOptionDefinition, description)
}

export function inputPathsOption(
  description = inputPathsOptionDefinition.docs.description,
): string[] {
  return arrayOption(inputPathsOptionDefinition, description)
}

export function getRecursiveOptionDocumentation(
  description = recursiveOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return getSharedCliOptionDocumentation(recursiveOptionDefinition, description)
}

export function recursiveOption(description = recursiveOptionDefinition.docs.description): boolean {
  return booleanOption(recursiveOptionDefinition, description)
}

export function getDeleteAfterProcessingOptionDocumentation(
  description = deleteAfterProcessingOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return getSharedCliOptionDocumentation(deleteAfterProcessingOptionDefinition, description)
}

export function deleteAfterProcessingOption(
  description = deleteAfterProcessingOptionDefinition.docs.description,
): boolean {
  return booleanOption(deleteAfterProcessingOptionDefinition, description)
}

export function getReprocessStaleOptionDocumentation(
  description = reprocessStaleOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return getSharedCliOptionDocumentation(reprocessStaleOptionDefinition, description)
}

export function reprocessStaleOption(
  description = reprocessStaleOptionDefinition.docs.description,
): boolean {
  return booleanOption(reprocessStaleOptionDefinition, description)
}

export function getWatchOptionDocumentation(
  description = watchOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return getSharedCliOptionDocumentation(watchOptionDefinition, description)
}

export function watchOption(description = watchOptionDefinition.docs.description): boolean {
  return booleanOption(watchOptionDefinition, description)
}

export function getSingleAssemblyOptionDocumentation(
  description = singleAssemblyOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return getSharedCliOptionDocumentation(singleAssemblyOptionDefinition, description)
}

export function singleAssemblyOption(
  description = singleAssemblyOptionDefinition.docs.description,
): boolean {
  return booleanOption(singleAssemblyOptionDefinition, description)
}

export function getConcurrencyOptionDocumentation(
  description = concurrencyOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return getSharedCliOptionDocumentation(concurrencyOptionDefinition, description)
}

export function concurrencyOption(
  description = concurrencyOptionDefinition.docs.description,
): number | undefined {
  return Option.String(concurrencyOptionDefinition.optionFlags, {
    description,
    validator: t.applyCascade(t.isNumber(), [t.isAtLeast(1)]),
  }) as unknown as number | undefined
}

export function getPrintUrlsOptionDocumentation(
  description = printUrlsOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return getSharedCliOptionDocumentation(printUrlsOptionDefinition, description)
}

export function printUrlsOption(description = printUrlsOptionDefinition.docs.description): boolean {
  return Option.Boolean(printUrlsOptionDefinition.optionFlags, {
    description,
  }) as unknown as boolean
}

export function countProvidedInputs({
  inputBase64,
  inputs,
}: {
  inputBase64?: string[]
  inputs?: string[]
}): number {
  return (inputs ?? []).length + (inputBase64 ?? []).length
}

export function validateSharedFileProcessingOptions({
  explicitInputCount,
  singleAssembly,
  watch,
  watchRequiresInputsMessage,
}: SharedFileProcessingValidationInput): string | undefined {
  if (watch && explicitInputCount === 0) {
    return watchRequiresInputsMessage
  }

  if (watch && singleAssembly) {
    return '--single-assembly cannot be used with --watch'
  }

  return undefined
}
