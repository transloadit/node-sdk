import { Option } from 'clipanion'
import * as t from 'typanion'

export interface SharedCliOptionDocumentation {
  description: string
  example: string
  flags: string
  required: string
  type: string
}

interface SharedCliBooleanOptionDefinition {
  docs: SharedCliOptionDocumentation
  optionFlags: string
}

interface SharedCliStringOptionDefinition {
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
} as const satisfies SharedCliStringOptionDefinition

const recursiveOptionDefinition = {
  docs: {
    flags: '--recursive, -r',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Enumerate input directories recursively',
  },
  optionFlags: '--recursive,-r',
} as const satisfies SharedCliBooleanOptionDefinition

const deleteAfterProcessingOptionDefinition = {
  docs: {
    flags: '--delete-after-processing, -d',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Delete input files after they are processed',
  },
  optionFlags: '--delete-after-processing,-d',
} as const satisfies SharedCliBooleanOptionDefinition

const reprocessStaleOptionDefinition = {
  docs: {
    flags: '--reprocess-stale',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Process inputs even if output is newer',
  },
  optionFlags: '--reprocess-stale',
} as const satisfies SharedCliBooleanOptionDefinition

const watchOptionDefinition = {
  docs: {
    flags: '--watch, -w',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Watch inputs for changes',
  },
  optionFlags: '--watch,-w',
} as const satisfies SharedCliBooleanOptionDefinition

const singleAssemblyOptionDefinition = {
  docs: {
    flags: '--single-assembly',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Pass all input files to a single assembly instead of one assembly per file',
  },
  optionFlags: '--single-assembly',
} as const satisfies SharedCliBooleanOptionDefinition

const concurrencyOptionDefinition = {
  docs: {
    flags: '--concurrency, -c',
    type: 'number',
    required: 'no',
    example: '5',
    description: 'Maximum number of concurrent assemblies (default: 5)',
  },
  optionFlags: '--concurrency,-c',
} as const satisfies SharedCliStringOptionDefinition

const printUrlsOptionDefinition = {
  docs: {
    flags: '--print-urls',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description: 'Print temporary result URLs after completion',
  },
  optionFlags: '--print-urls',
} as const satisfies SharedCliBooleanOptionDefinition

export function getInputPathsOptionDocumentation(
  description = inputPathsOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return {
    ...inputPathsOptionDefinition.docs,
    description,
  }
}

export function inputPathsOption(
  description = inputPathsOptionDefinition.docs.description,
): string[] {
  return Option.Array(inputPathsOptionDefinition.optionFlags, {
    description,
  }) as unknown as string[]
}

export function getRecursiveOptionDocumentation(
  description = recursiveOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return {
    ...recursiveOptionDefinition.docs,
    description,
  }
}

export function recursiveOption(description = recursiveOptionDefinition.docs.description): boolean {
  return Option.Boolean(recursiveOptionDefinition.optionFlags, false, {
    description,
  }) as unknown as boolean
}

export function getDeleteAfterProcessingOptionDocumentation(
  description = deleteAfterProcessingOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return {
    ...deleteAfterProcessingOptionDefinition.docs,
    description,
  }
}

export function deleteAfterProcessingOption(
  description = deleteAfterProcessingOptionDefinition.docs.description,
): boolean {
  return Option.Boolean(deleteAfterProcessingOptionDefinition.optionFlags, false, {
    description,
  }) as unknown as boolean
}

export function getReprocessStaleOptionDocumentation(
  description = reprocessStaleOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return {
    ...reprocessStaleOptionDefinition.docs,
    description,
  }
}

export function reprocessStaleOption(
  description = reprocessStaleOptionDefinition.docs.description,
): boolean {
  return Option.Boolean(reprocessStaleOptionDefinition.optionFlags, false, {
    description,
  }) as unknown as boolean
}

export function getWatchOptionDocumentation(
  description = watchOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return {
    ...watchOptionDefinition.docs,
    description,
  }
}

export function watchOption(description = watchOptionDefinition.docs.description): boolean {
  return Option.Boolean(watchOptionDefinition.optionFlags, false, {
    description,
  }) as unknown as boolean
}

export function getSingleAssemblyOptionDocumentation(
  description = singleAssemblyOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return {
    ...singleAssemblyOptionDefinition.docs,
    description,
  }
}

export function singleAssemblyOption(
  description = singleAssemblyOptionDefinition.docs.description,
): boolean {
  return Option.Boolean(singleAssemblyOptionDefinition.optionFlags, false, {
    description,
  }) as unknown as boolean
}

export function getConcurrencyOptionDocumentation(
  description = concurrencyOptionDefinition.docs.description,
): SharedCliOptionDocumentation {
  return {
    ...concurrencyOptionDefinition.docs,
    description,
  }
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
  return {
    ...printUrlsOptionDefinition.docs,
    description,
  }
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
