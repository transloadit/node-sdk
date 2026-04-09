import { Option } from 'clipanion'
import * as t from 'typanion'

export interface SharedCliOptionDocumentation {
  description: string
  example: string
  flags: string
  required: string
  type: string
}

export interface SharedFileProcessingValidationInput {
  explicitInputCount: number
  singleAssembly: boolean
  watch: boolean
  watchRequiresInputsMessage: string
}

export function getInputPathsOptionDocumentation(
  description = 'Provide an input path, directory, URL, or - for stdin',
): SharedCliOptionDocumentation {
  return {
    flags: '--input, -i',
    type: 'path | dir | url | -',
    required: 'varies',
    example: 'input.file',
    description,
  }
}

export function inputPathsOption(description = 'Provide an input file or a directory'): string[] {
  return Option.Array('--input,-i', {
    description,
  }) as unknown as string[]
}

export function getRecursiveOptionDocumentation(
  description = 'Enumerate input directories recursively',
): SharedCliOptionDocumentation {
  return {
    flags: '--recursive, -r',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description,
  }
}

export function recursiveOption(description = 'Enumerate input directories recursively'): boolean {
  return Option.Boolean('--recursive,-r', false, {
    description,
  }) as unknown as boolean
}

export function getDeleteAfterProcessingOptionDocumentation(
  description = 'Delete input files after they are processed',
): SharedCliOptionDocumentation {
  return {
    flags: '--delete-after-processing, -d',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description,
  }
}

export function deleteAfterProcessingOption(
  description = 'Delete input files after they are processed',
): boolean {
  return Option.Boolean('--delete-after-processing,-d', false, {
    description,
  }) as unknown as boolean
}

export function getReprocessStaleOptionDocumentation(
  description = 'Process inputs even if output is newer',
): SharedCliOptionDocumentation {
  return {
    flags: '--reprocess-stale',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description,
  }
}

export function reprocessStaleOption(
  description = 'Process inputs even if output is newer',
): boolean {
  return Option.Boolean('--reprocess-stale', false, {
    description,
  }) as unknown as boolean
}

export function getWatchOptionDocumentation(
  description = 'Watch inputs for changes',
): SharedCliOptionDocumentation {
  return {
    flags: '--watch, -w',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description,
  }
}

export function watchOption(description = 'Watch inputs for changes'): boolean {
  return Option.Boolean('--watch,-w', false, {
    description,
  }) as unknown as boolean
}

export function getSingleAssemblyOptionDocumentation(
  description = 'Pass all input files to a single assembly instead of one assembly per file',
): SharedCliOptionDocumentation {
  return {
    flags: '--single-assembly',
    type: 'boolean',
    required: 'no',
    example: 'false',
    description,
  }
}

export function singleAssemblyOption(
  description = 'Pass all input files to a single assembly instead of one assembly per file',
): boolean {
  return Option.Boolean('--single-assembly', false, {
    description,
  }) as unknown as boolean
}

export function getConcurrencyOptionDocumentation(
  description = 'Maximum number of concurrent assemblies (default: 5)',
): SharedCliOptionDocumentation {
  return {
    flags: '--concurrency, -c',
    type: 'number',
    required: 'no',
    example: '5',
    description,
  }
}

export function concurrencyOption(
  description = 'Maximum number of concurrent assemblies (default: 5)',
): number | undefined {
  return Option.String('--concurrency,-c', {
    description,
    validator: t.applyCascade(t.isNumber(), [t.isAtLeast(1)]),
  }) as unknown as number | undefined
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
