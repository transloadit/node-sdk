import merge from 'lodash.merge'
import { linterMessages } from './alphalib/assembly-linter.lang.en.ts'
import type { AssemblyLinterResult } from './alphalib/assembly-linter.ts'
import { applyFix, parseAndLint } from './alphalib/assembly-linter.ts'
import { getIndentation } from './alphalib/stepParsing.ts'
import type { AssemblyInstructionsInput, StepsInput } from './alphalib/types/template.ts'
import type { ResponseTemplateContent, TemplateContent } from './apiTypes.ts'

export type LintFatalLevel = 'error' | 'warning'

export interface LintAssemblyInstructionsInput {
  /**
   * Assembly Instructions as a JSON string, a full instructions object, or a steps-only object.
   */
  assemblyInstructions?: AssemblyInstructionsInput | StepsInput | string
  /**
   * Optional template content to merge with the provided instructions.
   */
  template?: TemplateContent | ResponseTemplateContent
  /**
   * Treat issues at this level or above as fatal. Defaults to "error".
   */
  fatal?: LintFatalLevel
  /**
   * Apply auto-fixes where possible and return the fixed JSON.
   */
  fix?: boolean
}

export interface LintAssemblyInstructionsResult {
  success: boolean
  issues: AssemblyLinterResult[]
  fixedInstructions?: string
}

const DEFAULT_INDENT = '  '

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const getIssueDescription = (issue: AssemblyLinterResult): string => {
  const message = linterMessages[issue.code](issue)
  return message.desc.trim()
}

const addDescriptions = (issues: AssemblyLinterResult[]): AssemblyLinterResult[] =>
  issues.map((issue) => ({ ...issue, desc: getIssueDescription(issue) }))

const unwrapStepsOnly = (content: string, indent: string): string => {
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

export async function lintAssemblyInstructions(
  options: LintAssemblyInstructionsInput,
): Promise<LintAssemblyInstructionsResult> {
  const { assemblyInstructions, template, fix = false, fatal = 'error' } = options

  if (assemblyInstructions == null && template == null) {
    throw new Error('Provide assemblyInstructions or template content to lint.')
  }

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

  const templateContent = template ? structuredClone(template) : undefined
  if (templateContent && !parseFailed) {
    const templateRecord = templateContent as Record<string, unknown>
    if (templateContent.allow_steps_override == null) {
      templateContent.allow_steps_override = true
    }

    if (instructions?.steps != null && templateContent.allow_steps_override === false) {
      throw new Error('TEMPLATE_DENIES_STEPS_OVERRIDE')
    }

    if (instructions == null) {
      instructions = templateContent as AssemblyInstructionsInput
    } else {
      const params = { ...instructions } as Record<string, unknown>
      for (const key of Object.keys(templateRecord)) {
        if (params[key] === null && templateRecord[key] !== null) {
          params[key] = templateRecord[key]
        }
      }
      instructions = merge({}, templateRecord, params) as AssemblyInstructionsInput
    }
  }

  let lintContent = ''
  if (instructions != null) {
    if (
      typeof assemblyInstructions === 'string' &&
      !wasStepsOnly &&
      !parseFailed &&
      templateContent == null
    ) {
      lintContent = assemblyInstructions
    } else {
      lintContent = JSON.stringify(instructions, null, indent)
    }
  } else if (inputString != null) {
    lintContent = inputString
  }

  let issues = await parseAndLint(lintContent)
  let fixedContent = lintContent

  if (fix) {
    for (const issue of issues) {
      if (!issue.fixId) continue
      fixedContent = applyFix(fixedContent, issue.fixId, issue.fixData as never)
    }
    issues = await parseAndLint(fixedContent)
  }

  const describedIssues = addDescriptions(issues)
  const fatalTypes = fatal === 'warning' ? new Set(['warning', 'error']) : new Set(['error'])
  const success = !describedIssues.some((issue) => fatalTypes.has(issue.type))

  const result: LintAssemblyInstructionsResult = {
    success,
    issues: describedIssues,
  }

  if (fix) {
    result.fixedInstructions = wasStepsOnly ? unwrapStepsOnly(fixedContent, indent) : fixedContent
  }

  return result
}
