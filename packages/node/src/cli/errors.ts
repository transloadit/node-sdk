import type { ZodIssue } from 'zod'

/** An input error the CLI can explain without an internal-error stack trace. */
export class CliInputError extends Error {
  override name = 'CliInputError'
}

function describeIssues(issues: ZodIssue[]): string[] {
  return issues.flatMap((issue) => {
    if (issue.code === 'invalid_union') {
      const descriptions = issue.unionErrors.flatMap((error) => describeIssues(error.issues))
      // Interpolation is an alternative to literal Robot parameters, not a required input format.
      const literals = descriptions.filter(
        (description) => !description.endsWith(': Must be a full interpolation string'),
      )
      return literals.length > 0 ? literals : descriptions
    }
    const message =
      issue.code === 'invalid_enum_value'
        ? `Expected one of: ${issue.options.join(', ')}`
        : issue.message
    return [`${issue.path.join('.') || '(root)'}: ${message}`]
  })
}

/** Summarize validation paths and remedies without duplicating Zod's union diagnostics. */
export function formatSchemaIssues(issues: ZodIssue[]): string {
  const descriptions = [...new Set(describeIssues(issues))]
  const remaining = descriptions.length - 10
  return [
    ...descriptions.slice(0, 10),
    ...(remaining > 0 ? [`${remaining} more validation error${remaining === 1 ? '' : 's'}`] : []),
  ].join('; ')
}
