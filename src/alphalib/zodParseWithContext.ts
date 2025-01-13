import type { z } from 'zod'

export type ZodIssueWithContext = z.ZodIssue & { parentObj: unknown }

function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

interface ZodParseWithContextResult<T extends z.ZodType> {
  success: boolean
  safe?: z.infer<T>
  errors: ZodIssueWithContext[]
  humanReadable: string
}

export function zodParseWithContext<T extends z.ZodType>(
  schema: T,
  obj: unknown,
): ZodParseWithContextResult<T> {
  const zodRes = schema.safeParse(obj)
  if (!zodRes.success) {
    const zodIssuesWithContext: ZodIssueWithContext[] = []
    for (const zodIssue of zodRes.error.errors) {
      const lastPath = zodIssue.path
      let parentObj: unknown = {}
      if (lastPath) {
        const strPath = lastPath.slice(0, -1).join('.')
        parentObj = getByPath(obj, strPath) ?? {}
      }

      zodIssuesWithContext.push({
        ...zodIssue,
        parentObj,
      })
    }

    const badPaths = new Map<string, string[]>()
    for (const issue of zodIssuesWithContext) {
      const path = issue.path
        .map((p) => (typeof p === 'string' ? p.replaceAll('.', '\\.') : p))
        .join('.')
      if (!badPaths.has(path)) {
        badPaths.set(path, [])
      }

      // Handle union type validation errors (e.g., when a value must be one of several allowed values)
      // For example: z.union([z.literal(0), z.literal(90), z.literal(180)]) for rotation values
      // This extracts all the valid values from the union type to show in the error message
      if ('unionErrors' in issue && issue.unionErrors) {
        const validValues: (string | number | boolean)[] = []
        for (const unionError of issue.unionErrors) {
          if (
            Array.isArray(unionError.errors) &&
            unionError.errors[0]?.code === 'invalid_literal'
          ) {
            const { expected } = unionError.errors[0]
            if (
              expected !== undefined &&
              expected !== null &&
              (typeof expected === 'string' ||
                typeof expected === 'number' ||
                typeof expected === 'boolean')
            ) {
              validValues.push(expected)
            }
          }
        }
        if (validValues.length > 0) {
          badPaths.get(path)?.push(`should be one of: \`${validValues.join('`, `')}\``)
        } else {
          for (const unionError of issue.unionErrors) {
            if ('expected' in unionError && typeof unionError.expected === 'string') {
              badPaths.get(path)?.push(`should be ${unionError.expected}`)
            } else {
              badPaths.get(path)?.push(unionError.message)
            }
          }
        }
      } else if ('expected' in issue && typeof issue.expected === 'string') {
        badPaths.get(path)?.push(`should be ${issue.expected}`)
      } else {
        // Handle specific error codes for better messages
        let received: string
        let type: string
        let bigType: string

        // Handle different validation error types with specific human-readable messages
        // Each case formats the error message based on the type of validation that failed:
        // - invalid_type: Wrong data type (e.g., string instead of number)
        // - invalid_string: String format validation (email, url)
        // - too_small/too_big: Length/size validations for strings and arrays
        switch (issue.code) {
          case 'invalid_type':
            received = issue.received === 'undefined' ? 'missing' : issue.received
            badPaths.get(path)?.push(`should be ${issue.expected} but got ${received}`)
            break
          case 'invalid_string':
            if (issue.validation === 'email') {
              badPaths.get(path)?.push('should be a valid email address')
            } else if (issue.validation === 'url') {
              badPaths.get(path)?.push('should be a valid URL')
            } else {
              badPaths.get(path)?.push(issue.message)
            }
            break
          case 'too_small':
            type = issue.type === 'string' ? 'characters' : 'items'
            badPaths.get(path)?.push(`should have at least ${issue.minimum} ${type}`)
            break
          case 'too_big':
            bigType = issue.type === 'string' ? 'characters' : 'items'
            badPaths.get(path)?.push(`should have at most ${issue.maximum} ${bigType}`)
            break
          case 'custom':
            badPaths.get(path)?.push(issue.message)
            break
          default:
            badPaths.get(path)?.push(issue.message)
        }
      }
    }

    const humanReadable = Array.from(badPaths.entries())
      .map(([path, messages]) => {
        const field = path || 'Input'
        return `Path \`${field}\` ${messages.join(', ')}`
      })
      .join('\n')

    return { success: false, errors: zodIssuesWithContext, humanReadable }
  }

  return { success: true, safe: zodRes.data, errors: [], humanReadable: '' }
}
