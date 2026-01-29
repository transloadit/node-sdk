import { getIndentation } from './alphalib/stepParsing.ts'
import { mergeTemplateContent } from './alphalib/templateMerge.ts'
import type { AssemblyInstructionsInput, StepsInput } from './alphalib/types/template.ts'
import type { ResponseTemplateContent, TemplateContent } from './apiTypes.ts'

const DEFAULT_INDENT = '  '

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export interface BuildLintInputResult {
  lintContent: string
  wasStepsOnly: boolean
  indent: string
}

export const unwrapStepsOnly = (content: string, indent: string): string => {
  try {
    const parsed = JSON.parse(content)
    if (isRecord(parsed) && 'steps' in parsed) {
      return JSON.stringify((parsed as { steps?: unknown }).steps ?? {}, null, indent)
    }
  } catch (_err) {
    return content
  }
  return content
}

export const buildLintInput = (
  assemblyInstructions?: AssemblyInstructionsInput | StepsInput | string,
  template?: TemplateContent | ResponseTemplateContent,
): BuildLintInputResult => {
  let inputString: string | undefined
  let parsedInput: unknown | undefined
  let parseFailed = false
  let indent = DEFAULT_INDENT

  if (typeof assemblyInstructions === 'string') {
    inputString = assemblyInstructions
    indent = getIndentation(assemblyInstructions)
    try {
      parsedInput = JSON.parse(assemblyInstructions)
    } catch (_err) {
      parseFailed = true
    }
  } else if (assemblyInstructions != null) {
    parsedInput = assemblyInstructions
  }

  let wasStepsOnly = false
  let instructions: AssemblyInstructionsInput | undefined

  if (parsedInput !== undefined) {
    if (isRecord(parsedInput)) {
      if ('steps' in parsedInput) {
        instructions = parsedInput as AssemblyInstructionsInput
      } else {
        instructions = { steps: parsedInput as StepsInput }
        wasStepsOnly = true
      }
    } else {
      instructions = { steps: parsedInput as StepsInput }
      wasStepsOnly = true
    }
  }

  const shouldMergeTemplate = template != null && !parseFailed
  if (shouldMergeTemplate) {
    instructions = mergeTemplateContent(template, instructions)
  }

  let lintContent = ''
  if (instructions != null) {
    if (
      typeof assemblyInstructions === 'string' &&
      !wasStepsOnly &&
      !parseFailed &&
      !shouldMergeTemplate
    ) {
      lintContent = assemblyInstructions
    } else {
      lintContent = JSON.stringify(instructions, null, indent)
    }
  } else if (inputString != null) {
    lintContent = inputString
  }

  return { lintContent, wasStepsOnly, indent }
}
