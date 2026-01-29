import type { HydratedLintIssue } from './alphalib/assembly-linter.lang.en.ts'
import { hydrateLintIssues } from './alphalib/assembly-linter.lang.en.ts'
import { applyFix, parseAndLint } from './alphalib/assembly-linter.ts'
import type { AssemblyInstructionsInput, StepsInput } from './alphalib/types/template.ts'
import type { ResponseTemplateContent, TemplateContent } from './apiTypes.ts'
import { buildLintInput, unwrapStepsOnly } from './lintAssemblyInput.ts'

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
  issues: HydratedLintIssue[]
  fixedInstructions?: string
}

export async function lintAssemblyInstructions(
  options: LintAssemblyInstructionsInput,
): Promise<LintAssemblyInstructionsResult> {
  const { assemblyInstructions, template, fix = false, fatal = 'error' } = options

  if (assemblyInstructions == null && template == null) {
    throw new Error('Provide assemblyInstructions or template content to lint.')
  }

  const { lintContent, wasStepsOnly, indent } = buildLintInput(assemblyInstructions, template)

  let issues = await parseAndLint(lintContent)
  let fixedContent = lintContent

  if (fix) {
    for (const issue of issues) {
      if (!issue.fixId) continue
      // applyFix validates fixData against the fix schema for the fixId.
      fixedContent = applyFix(fixedContent, issue.fixId, issue.fixData as never)
    }
    issues = await parseAndLint(fixedContent)
  }

  const describedIssues = hydrateLintIssues(issues)
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
